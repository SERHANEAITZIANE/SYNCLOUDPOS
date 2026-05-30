import { NextRequest, NextResponse } from "next/server";
import { getBusinessContext } from "@/actions/ai-context";
import { getActiveTenantId } from "@/actions/get-active-tenant";
import { db } from "@/lib/db";

type Provider = "gemini" | "openai" | "claude" | "kimi";

interface RequestBody {
    question: string;
    provider: Provider;
    apiKey: string;
    history: { role: "user" | "assistant"; content: string }[];
    dateRange?: { from?: string; to?: string };
}

export const maxDuration = 60; // Allow up to 60s execution

async function startStream(res: Response, parser: (line: string) => string): Promise<Response> {
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({ error: err?.error?.message || `API error ${res.status}` }, { status: res.status });
    }

    if (!res.body) throw new Error("No response body returned from API");

    const encoder = new TextEncoder();
    const decoder = new TextDecoder("utf-8");

    const stream = new ReadableStream({
        async start(controller) {
            const reader = res.body!.getReader();
            let buffer = "";
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || ""; // keep the last incomplete line

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) continue;

                        const parsed = parser(trimmedLine);
                        if (parsed) {
                            controller.enqueue(encoder.encode(parsed));
                        }
                    }
                }
                // Process any remaining buffer
                if (buffer.trim()) {
                    const parsed = parser(buffer.trim());
                    if (parsed) {
                        controller.enqueue(encoder.encode(parsed));
                    }
                }
            } catch (err) {
                console.error("Stream reading error:", err);
                controller.error(err);
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    });
}

function geminiParser(line: string) {
    if (line.startsWith("data: ")) {
        const dataStr = line.slice(6).trim();
        if (dataStr === "[DONE]") return "";
        try {
            const data = JSON.parse(dataStr);
            return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } catch { return ""; }
    }
    return "";
}

function openaiParser(line: string) {
    if (line.startsWith("data: ")) {
        const dataStr = line.slice(6).trim();
        if (dataStr === "[DONE]") return "";
        try {
            const data = JSON.parse(dataStr);
            return data.choices?.[0]?.delta?.content || "";
        } catch { return ""; }
    }
    return "";
}

function claudeParser(line: string) {
    if (line.startsWith("data: ")) {
        const dataStr = line.slice(6).trim();
        try {
            const data = JSON.parse(dataStr);
            if (data.type === "content_block_delta" && data.delta?.text) {
                return data.delta.text;
            }
        } catch { return ""; }
    }
    return "";
}

export async function POST(req: NextRequest) {
    try {
        const body: RequestBody = await req.json();
        const { question, provider, apiKey, history, dateRange } = body;

        if (!question?.trim()) return NextResponse.json({ error: "Question vide." }, { status: 400 });
        if (!provider) return NextResponse.json({ error: "Fournisseur manquant." }, { status: 400 });

        // Try getting tenantId to resolve custom keys from DB if frontend didn't supply them
        const tenantId = await getActiveTenantId().catch(() => null);
        let tenant = null;
        if (tenantId) {
            tenant = await db.tenant.findUnique({
                where: { id: tenantId },
                select: {
                    geminiApiKey: true,
                    openaiApiKey: true,
                    anthropicApiKey: true,
                }
            }).catch(() => null);
        }

        // Server-side fallback resolution for keys
        let resolvedApiKey = apiKey?.trim();
        if (!resolvedApiKey) {
            if (provider === "gemini") {
                resolvedApiKey = tenant?.geminiApiKey || process.env.GEMINI_API_KEY;
            } else if (provider === "openai") {
                resolvedApiKey = tenant?.openaiApiKey || process.env.OPENAI_API_KEY;
            } else if (provider === "claude") {
                resolvedApiKey = tenant?.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
            }
        }

        if (!resolvedApiKey?.trim()) {
            return NextResponse.json({ error: "Clé API manquante pour ce fournisseur." }, { status: 400 });
        }

        const startDate = dateRange?.from ? new Date(dateRange.from) : undefined;
        const endDate = dateRange?.to ? new Date(dateRange.to) : undefined;

        const businessContext = await getBusinessContext(startDate, endDate);

        const systemPrompt = `Tu es un assistant IA expert en gestion d'entreprise et en analyse de données commerciales. 
Tu parles en français et tu réponds de manière structurée, professionnelle et actionnable.
Tu as accès aux données en temps réel de l'entreprise de l'utilisateur.

${businessContext}

Lorsque tu analyses des données:
- Donne des insights précis basés sur les chiffres fournis
- Identifie les tendances, opportunités et risques
- Propose des actions concrètes et réalistes
- Structure tes réponses avec des titres clairs (utilise du markdown)
- Utilise des émojis pour rendre la lecture agréable`;

        if (provider === "gemini") {
            const contents = [
                ...history.map(m => ({
                    role: m.role === "assistant" ? "model" : "user",
                    parts: [{ text: m.content }],
                })),
                { role: "user", parts: [{ text: question }] },
            ];

            const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.5-flash"];
            let res: Response | null = null;
            let lastErrorMsg = "";

            for (const model of modelsToTry) {
                try {
                    console.log(`[AI Analysis] Trying Gemini model: ${model}`);
                    const response = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(resolvedApiKey.trim())}`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                system_instruction: { parts: [{ text: systemPrompt }] },
                                contents,
                                generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
                            }),
                        }
                    );
                    
                    if (response.ok) {
                        res = response;
                        break;
                    } else {
                        const err = await response.json().catch(() => ({}));
                        lastErrorMsg = err?.error?.message || `Status ${response.status}`;
                        console.warn(`[AI Analysis] Gemini model ${model} failed: ${lastErrorMsg}`);
                    }
                } catch (err: any) {
                    lastErrorMsg = err?.message || "Unknown error";
                    console.warn(`[AI Analysis] Gemini model ${model} error:`, err);
                }
            }

            if (!res) {
                // Dynamic self-healing route using OpenAI SK if Gemini fails
                const openAiKey = tenant?.openaiApiKey || process.env.OPENAI_API_KEY;
                if (openAiKey?.trim()) {
                    console.log("[AI Analysis] All Gemini models exhausted. Self-healing fallback to OpenAI GPT-4o...");
                    const messages = [
                        { role: "system", content: systemPrompt },
                        ...history.map(m => ({ role: m.role, content: m.content })),
                        { role: "user", content: question },
                    ];
                    const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAiKey.trim()}` },
                        body: JSON.stringify({ model: "gpt-4o", messages, max_tokens: 4096, temperature: 0.7, stream: true }),
                    });
                    if (openAiRes.ok) {
                        return startStream(openAiRes, openaiParser);
                    }
                }
                return NextResponse.json({ error: `Tous les modèles Gemini ont échoué. Détails: ${lastErrorMsg}` }, { status: 500 });
            }

            return startStream(res, geminiParser);
        }

        if (provider === "openai") {
            const messages = [
                { role: "system", content: systemPrompt },
                ...history.map(m => ({ role: m.role, content: m.content })),
                { role: "user", content: question },
            ];
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${resolvedApiKey.trim()}` },
                body: JSON.stringify({ model: "gpt-4o", messages, max_tokens: 4096, temperature: 0.7, stream: true }),
            });
            return startStream(res, openaiParser);
        }

        if (provider === "claude") {
            const messages = [
                ...history.map(m => ({ role: m.role, content: m.content })),
                { role: "user", content: question },
            ];
            const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": resolvedApiKey.trim(),
                    "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                    model: "claude-3-5-sonnet-20241022",
                    max_tokens: 4096,
                    system: systemPrompt,
                    messages,
                    stream: true
                }),
            });
            return startStream(res, claudeParser);
        }

        if (provider === "kimi") {
            const messages = [
                { role: "system", content: systemPrompt },
                ...history.map(m => ({ role: m.role, content: m.content })),
                { role: "user", content: question },
            ];
            const res = await fetch("https://api.moonshot.cn/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${resolvedApiKey.trim()}` },
                body: JSON.stringify({ model: "moonshot-v1-8k", messages, temperature: 0.7, stream: true }),
            });
            return startStream(res, openaiParser);
        }

        return NextResponse.json({ error: "Fournisseur non supporté." }, { status: 400 });

    } catch (err: any) {
        console.error("[AI Analysis Error Raw]", err);
        return NextResponse.json({ error: err.message || "Erreur interne." }, { status: 500 });
    }
}
