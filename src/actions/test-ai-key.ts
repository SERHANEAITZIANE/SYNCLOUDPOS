"use server"

import { auth } from "@/auth"

/**
 * Validates an AI provider API key by making a probe request.
 *
 * Server actions are reachable as POST endpoints without a session, so this
 * previously let anyone use the server as an oracle for checking stolen API
 * keys — and as an outbound request proxy (PROJECT_AUDIT.md, finding H-1).
 * Configuring AI keys is an administrative settings operation, so it is gated
 * accordingly.
 */
export async function testAiApiKey(provider: string, apiKey: string) {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId) {
        return { error: "Non autorisé" }
    }

    const { hasPermission } = await import("@/lib/rbac")
    if (!(await hasPermission("settings:update"))) return { error: "Accès refusé" }

    if (!apiKey) {
        return { error: "API Key is required" }
    }

    try {
        if (provider === "OPENAI") {
            const res = await fetch("https://api.openai.com/v1/models", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${apiKey}`
                }
            });
            if (!res.ok) {
                return { error: "Clé API ChatGPT invalide ou expirée." }
            }
            return { success: "Clé API ChatGPT valide !" }
        } else if (provider === "GEMINI") {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
                method: "GET"
            });
            if (!res.ok) {
                return { error: "Clé API Gemini invalide ou expirée." }
            }
            return { success: "Clé API Gemini valide !" }
        } else if (provider === "ANTHROPIC") {
            const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    model: "claude-3-haiku-20240307",
                    max_tokens: 1,
                    messages: [{ role: "user", content: "hi" }]
                })
            });
            if (!res.ok) {
                return { error: "Clé API Claude invalide ou expirée." }
            }
            return { success: "Clé API Claude valide !" }
        }

        return { error: "Provider non supporté." }
    } catch (error) {
        console.error("[TEST_AI_KEY_ERROR]", error);
        return { error: "Erreur lors du test de la clé API." }
    }
}
