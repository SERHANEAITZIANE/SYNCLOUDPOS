/**
 * ai-providers.ts
 * Centralized multi-LLM utility for voice assistant and AI features.
 * Supports: Gemini (Google), OpenAI (GPT), Anthropic (Claude)
 */

export type AIProvider = "GEMINI" | "OPENAI" | "ANTHROPIC";

interface Message {
    role: "user" | "assistant" | "model";
    content: string;
}

interface AIRequestParams {
    provider: AIProvider;
    model: string;
    apiKey: string;
    systemPrompt: string;
    userMessage: string;
    history?: Message[];
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
    OPENAI: "gpt-4o",
    ANTHROPIC: "claude-opus-4-7",
};

// Fallback models to try when primary model hits rate limits
export const FALLBACK_MODELS: Record<AIProvider, string[]> = {
    GEMINI: ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-2.0-flash"],
    OPENAI: ["gpt-4o", "gpt-4o-mini"],
    ANTHROPIC: ["claude-opus-4-7", "claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
};

export const AVAILABLE_MODELS: Record<AIProvider, { id: string; label: string }[]> = {
    GEMINI: [
        { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Recommandé — Excellent Darija & Rapide)" },
        { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash (Dernier 2026 — Ultra-Rapide)" },
        { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Stable)" },
        { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Raisonnement Profond)" },
    ],
    OPENAI: [
        { id: "gpt-4o", label: "GPT-4o (Dernier Flagship OpenAI — Excellent pour le Darija)" },
        { id: "gpt-4o-mini", label: "GPT-4o Mini (Ultra-Rapide & Économique)" },
    ],
    ANTHROPIC: [
        { id: "claude-opus-4-7", label: "Claude Opus 4.7 (Intelligence Suprême 2026 — Recommandé)" },
        { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet (Standard)" },
        { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku (Rapide)" },
    ],
};

// ─── Gemini API ─────────────────────────────────────────────────────────────
async function callGemini(params: AIRequestParams): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${encodeURIComponent(params.apiKey.trim())}`;

    const geminiHistory = (params.history || []).map(h => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }]
    }));

    const contents = [
        ...geminiHistory,
        { role: "user", parts: [{ text: params.userMessage }] }
    ];

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: params.systemPrompt }] },
            generationConfig: {
                temperature: params.temperature ?? 0.7,
                maxOutputTokens: params.maxTokens ?? 1500, // Arabic script needs higher token budget (3-5x vs Latin)
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
    const openAiHistory = (params.history || []).map(h => ({
        role: h.role === "model" ? "assistant" : h.role,
        content: h.content
    }));

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
                ...openAiHistory,
                { role: "user", content: params.userMessage },
            ],
            temperature: params.temperature ?? 0.7,
            max_tokens: params.maxTokens ?? 1500,
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
    const anthropicHistory = (params.history || []).map(h => ({
        role: h.role === "model" ? "assistant" : h.role,
        content: h.content
    }));

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
            messages: [
                ...anthropicHistory,
                { role: "user", content: params.userMessage }
            ],
            temperature: params.temperature ?? 0.7,
            max_tokens: params.maxTokens ?? 1500,
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Anthropic API error ${response.status}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text?.trim() || "";
}

// ─── Call a single provider ─────────────────────────────────────────────────
async function callProvider(params: AIRequestParams): Promise<string> {
    switch (params.provider) {
        case "OPENAI":
            return await callOpenAI(params);
        case "ANTHROPIC":
            return await callAnthropic(params);
        case "GEMINI":
        default:
            return await callGemini(params);
    }
}

// ─── Unified entry point with automatic fallback on rate limits ─────────────
export async function queryAI(params: AIRequestParams): Promise<AIResponse> {
    let text: string = "";
    let usedModel = params.model;
    let usedKey = params.apiKey;

    const defaultKey = resolveApiKey(params.provider, {});

    const makeCall = async (key: string, model: string) => {
        return await callProvider({ ...params, apiKey: key, model });
    };

    let currentKey = usedKey;

    try {
        text = await makeCall(currentKey, usedModel);
    } catch (primaryError: any) {
        console.warn(`[AI] Primary call failed with model ${usedModel}:`, primaryError?.message || primaryError);

        // If the key was a custom tenant key and it failed, retry using the platform's default API key
        if (currentKey !== defaultKey && defaultKey) {
            console.log(`[AI] Custom key failed. Retrying primary model ${usedModel} with platform default API key...`);
            currentKey = defaultKey;
            try {
                text = await makeCall(currentKey, usedModel);
                usedKey = defaultKey;
            } catch (defaultKeyError: any) {
                console.warn(`[AI] Retrying primary model with platform default key also failed:`, defaultKeyError?.message || defaultKeyError);
            }
        }

        // If we still don't have a successful response, try fallback models using the active key
        if (!text) {
            const fallbacks = FALLBACK_MODELS[params.provider] || [];
            let fallbackSuccess = false;

            for (const fallbackModel of fallbacks) {
                if (fallbackModel === params.model) continue;
                try {
                    console.log(`[AI] Trying fallback model: ${fallbackModel} with key...`);
                    text = await makeCall(currentKey, fallbackModel);
                    usedModel = fallbackModel;
                    usedKey = currentKey;
                    fallbackSuccess = true;
                    console.log(`[AI] Fallback model ${fallbackModel} succeeded!`);
                    break;
                } catch (fbErr: any) {
                    console.warn(`[AI] Fallback model ${fallbackModel} failed:`, fbErr?.message || fbErr);
                    
                    // If fallback failed and we haven't tried defaultKey yet for this model, try it
                    if (currentKey !== defaultKey && defaultKey) {
                        try {
                            console.log(`[AI] Retrying fallback ${fallbackModel} with platform default API key...`);
                            text = await makeCall(defaultKey, fallbackModel);
                            usedModel = fallbackModel;
                            usedKey = defaultKey;
                            currentKey = defaultKey;
                            fallbackSuccess = true;
                            console.log(`[AI] Fallback model ${fallbackModel} succeeded with default key!`);
                            break;
                        } catch (fbDefaultErr) {
                            // continue
                        }
                    }
                }
            }

            if (!fallbackSuccess) {
                throw primaryError; // All attempts failed
            }
        }
    }

    return {
        text: text || "لم أتمكن من معالجة الطلب. حاول مرة أخرى.",
        provider: params.provider,
        model: usedModel,
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
