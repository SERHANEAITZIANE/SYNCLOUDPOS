import { NextRequest, NextResponse } from "next/server";
import { getBusinessContext } from "@/actions/ai-context";

type Provider = "gemini" | "openai" | "claude" | "kimi";

interface RequestBody {
    question: string;
    provider: Provider;
    apiKey: string;
    history: { role: "user" | "assistant"; content: string }[];
}

async function callGemini(apiKey: string, systemContext: string, history: RequestBody["history"], question: string): Promise<string> {
    const contents = [
        ...history.map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
        })),
        { role: "user", parts: [{ text: question }] },
    ];

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemContext }] },
                contents,
                generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
            }),
        }
    );
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || `Gemini error ${res.status}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Aucune réponse.";
}

async function callOpenAI(apiKey: string, systemContext: string, history: RequestBody["history"], question: string): Promise<string> {
    const messages = [
        { role: "system", content: systemContext },
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: question },
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "gpt-4o", messages, max_tokens: 2048, temperature: 0.7 }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || `OpenAI error ${res.status}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "Aucune réponse.";
}

async function callClaude(apiKey: string, systemContext: string, history: RequestBody["history"], question: string): Promise<string> {
    const messages = [
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: question },
    ];

    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 2048,
            system: systemContext,
            messages,
        }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || `Claude error ${res.status}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text ?? "Aucune réponse.";
}

async function callKimi(apiKey: string, systemContext: string, history: RequestBody["history"], question: string): Promise<string> {
    const messages = [
        { role: "system", content: systemContext },
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: question },
    ];

    const res = await fetch("https://api.moonshot.cn/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "moonshot-v1-8k", messages, temperature: 0.7 }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || `Kimi error ${res.status}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "Aucune réponse.";
}

export async function POST(req: NextRequest) {
    try {
        const body: RequestBody = await req.json();
        const { question, provider, apiKey, history } = body;

        if (!question?.trim()) return NextResponse.json({ error: "Question vide." }, { status: 400 });
        if (!provider) return NextResponse.json({ error: "Fournisseur manquant." }, { status: 400 });
        if (!apiKey?.trim()) return NextResponse.json({ error: "Clé API manquante." }, { status: 400 });

        const businessContext = await getBusinessContext();

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

        let answer: string;
        switch (provider) {
            case "gemini":
                answer = await callGemini(apiKey, systemPrompt, history, question);
                break;
            case "openai":
                answer = await callOpenAI(apiKey, systemPrompt, history, question);
                break;
            case "claude":
                answer = await callClaude(apiKey, systemPrompt, history, question);
                break;
            case "kimi":
                answer = await callKimi(apiKey, systemPrompt, history, question);
                break;
            default:
                return NextResponse.json({ error: "Fournisseur non supporté." }, { status: 400 });
        }

        return NextResponse.json({ answer });
    } catch (err: any) {
        console.error("[AI Analysis Error]", err);
        return NextResponse.json({ error: err.message || "Erreur interne." }, { status: 500 });
    }
}
