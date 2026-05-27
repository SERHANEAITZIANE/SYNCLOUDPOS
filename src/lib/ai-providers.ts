/**
 * ai-providers.ts
 * Centralized multi-LLM utility for voice assistant and AI features.
 * Supports: Gemini (Google), OpenAI (GPT), Anthropic (Claude)
 */

export type AIProvider = "GEMINI" | "OPENAI" | "ANTHROPIC";

interface AIRequestParams {
    provider: AIProvider;
    model: string;
    apiKey: string;
    systemPrompt: string;
    userMessage: string;
    temperature?: number;
    maxTokens?: number;
}

interface AIResponse {
    text: string;
    provider: AIProvider;
    model: string;
}

// ─── Default models per provider ────────────────────────────────────────────
export const DEFAULT_MODELS: Record<AIProvider, string> = {
    GEMINI: "gemini-2.5-flash",
    OPENAI: "gpt-4o-mini",
    ANTHROPIC: "claude-sonnet-4-20250514",
};

export const AVAILABLE_MODELS: Record<AIProvider, { id: string; label: string }[]> = {
    GEMINI: [
        { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Rapide)" },
        { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
        { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Léger)" },
        { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Puissant)" },
    ],
    OPENAI: [
        { id: "gpt-4o-mini", label: "GPT-4o Mini (Rapide)" },
        { id: "gpt-4o", label: "GPT-4o (Puissant)" },
        { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
        { id: "gpt-4.1", label: "GPT-4.1 (Dernier)" },
    ],
    ANTHROPIC: [
        { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4 (Équilibré)" },
        { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (Rapide)" },
    ],
};

// ─── Gemini API ─────────────────────────────────────────────────────────────
async function callGemini(params: AIRequestParams): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${encodeURIComponent(params.apiKey.trim())}`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: params.userMessage }] }],
            systemInstruction: { parts: [{ text: params.systemPrompt }] },
            generationConfig: {
                temperature: params.temperature ?? 0.7,
                maxOutputTokens: params.maxTokens ?? 400,
            },
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Gemini API error ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

// ─── OpenAI API ─────────────────────────────────────────────────────────────
async function callOpenAI(params: AIRequestParams): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${params.apiKey.trim()}`,
        },
        body: JSON.stringify({
            model: params.model,
            messages: [
                { role: "system", content: params.systemPrompt },
                { role: "user", content: params.userMessage },
            ],
            temperature: params.temperature ?? 0.7,
            max_tokens: params.maxTokens ?? 400,
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `OpenAI API error ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
}

// ─── Anthropic API ──────────────────────────────────────────────────────────
async function callAnthropic(params: AIRequestParams): Promise<string> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": params.apiKey.trim(),
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model: params.model,
            system: params.systemPrompt,
            messages: [{ role: "user", content: params.userMessage }],
            temperature: params.temperature ?? 0.7,
            max_tokens: params.maxTokens ?? 400,
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Anthropic API error ${response.status}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text?.trim() || "";
}

// ─── Unified entry point ────────────────────────────────────────────────────
export async function queryAI(params: AIRequestParams): Promise<AIResponse> {
    let text: string;

    switch (params.provider) {
        case "OPENAI":
            text = await callOpenAI(params);
            break;
        case "ANTHROPIC":
            text = await callAnthropic(params);
            break;
        case "GEMINI":
        default:
            text = await callGemini(params);
            break;
    }

    return {
        text: text || "لم أتمكن من معالجة الطلب. حاول مرة أخرى.",
        provider: params.provider,
        model: params.model,
    };
}

/**
 * Resolve which API key to use based on provider.
 * Falls back to env vars if tenant key is missing.
 */
export function resolveApiKey(
    provider: AIProvider,
    tenant: { geminiApiKey?: string | null; openaiApiKey?: string | null; anthropicApiKey?: string | null }
): string | null {
    switch (provider) {
        case "OPENAI":
            return tenant.openaiApiKey || process.env.OPENAI_API_KEY || null;
        case "ANTHROPIC":
            return tenant.anthropicApiKey || process.env.ANTHROPIC_API_KEY || null;
        case "GEMINI":
        default:
            return tenant.geminiApiKey || process.env.GEMINI_API_KEY || null;
    }
}
