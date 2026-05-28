import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

/**
 * GET /api/mobile/settings/ai
 * Returns the current AI provider, model, and which keys are configured (not the actual keys)
 */
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);

        const tenant = await db.tenant.findUnique({
            where: { id: user.tenantId },
            select: {
                aiProvider: true,
                aiModel: true,
                geminiApiKey: true,
                openaiApiKey: true,
                anthropicApiKey: true,
            }
        });

        return NextResponse.json({
            success: true,
            aiProvider: tenant?.aiProvider || "GEMINI",
            aiModel: tenant?.aiModel || "gemini-2.0-flash",
            hasGeminiKey: !!tenant?.geminiApiKey || !!process.env.GEMINI_API_KEY,
            hasOpenaiKey: !!tenant?.openaiApiKey || !!process.env.OPENAI_API_KEY,
            hasAnthropicKey: !!tenant?.anthropicApiKey || !!process.env.ANTHROPIC_API_KEY,
        });

    } catch (error) {
        return mobileErrorResponse(error);
    }
}

/**
 * PUT /api/mobile/settings/ai
 * Updates the AI provider, model, and optionally the API key for that provider
 */
export async function PUT(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);

        const { aiProvider, aiModel, apiKey } = await req.json().catch(() => ({}));

        // Validate provider
        const validProviders = ["GEMINI", "OPENAI", "ANTHROPIC"];
        if (aiProvider && !validProviders.includes(aiProvider)) {
            return NextResponse.json({ error: "Provider invalide" }, { status: 400 });
        }

        // Build update data
        const updateData: Record<string, string> = {};

        if (aiProvider) updateData.aiProvider = aiProvider;
        if (aiModel) updateData.aiModel = aiModel;

        // Update the correct API key field based on provider
        if (apiKey && aiProvider) {
            switch (aiProvider) {
                case "GEMINI":
                    updateData.geminiApiKey = apiKey;
                    break;
                case "OPENAI":
                    updateData.openaiApiKey = apiKey;
                    break;
                case "ANTHROPIC":
                    updateData.anthropicApiKey = apiKey;
                    break;
            }
        }

        await db.tenant.update({
            where: { id: user.tenantId },
            data: updateData,
        });

        return NextResponse.json({
            success: true,
            message: "Configuration AI mise à jour",
            aiProvider: aiProvider || undefined,
            aiModel: aiModel || undefined,
        });

    } catch (error) {
        return mobileErrorResponse(error);
    }
}
