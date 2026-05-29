"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { getActiveTenantId } from "@/actions/get-active-tenant";
import { getBusinessContext } from "@/actions/ai-context";
import { queryAI, resolveApiKey, type AIProvider, DEFAULT_MODELS } from "@/lib/ai-providers";

interface VoiceResponse {
    success: boolean;
    text: string;
    detectedLanguage: "darija" | "arabic" | "french";
    error?: string;
}

export async function processVocalQuery(
    queryText: string,
    requestedLanguage: "darija" | "arabic" | "french" = "french",
    aiEngine: "gemini" | "gpt4" | "claude" = "gemini"
): Promise<VoiceResponse> {
    try {
        const session = await auth();
        const isLoggedIn = !!session?.user?.id;
        
        let systemPrompt = "";
        let provider: AIProvider = "GEMINI";
        let model = DEFAULT_MODELS.GEMINI;

        // Map ui selections to providers & models
        if (aiEngine === "gpt4") {
            provider = "OPENAI";
            model = DEFAULT_MODELS.OPENAI;
        } else if (aiEngine === "claude") {
            provider = "ANTHROPIC";
            model = DEFAULT_MODELS.ANTHROPIC;
        }

        let tenantSettings: any = {};

        if (isLoggedIn) {
            const tenantId = await getActiveTenantId();
            if (tenantId) {
                // Fetch tenant settings to get keys
                const tenant = await db.tenant.findUnique({
                    where: { id: tenantId },
                    select: {
                        geminiApiKey: true,
                        openaiApiKey: true,
                        anthropicApiKey: true,
                        aiProvider: true,
                        aiModel: true,
                    }
                });
                if (tenant) {
                    tenantSettings = tenant;
                }
            }

            // Get the real-time business context
            const businessContext = await getBusinessContext();

            systemPrompt = `
You are the SYNCLOUD POS AI Voice Dashboard Assistant, designed specifically for the Gérant (Manager).
Your job is to answer vocal dashboard queries based on the real-time business context provided below.

=== REAL-TIME BUSINESS CONTEXT ===
${businessContext}
=== END CONTEXT ===

Instructions:
1. Analyze the context metrics (revenue, POS sales, delivery notes/BL, debtors, suppliers, expenses, stocks) to answer the manager's query accurately.
2. Provide a comprehensive, complete, and highly detailed response listing all figures, details, and information to answer the query fully. Do not limit the response length.
3. Dialect/Language Formatting:
   - If the requested language is "darija", respond in phonetic Algerian Darija using the Arabic script. Use warm, regional phrases (e.g. say "يا مدير", "السلعة", "السوارد", "شحال", "خلاص", "الكاسة", "الصولد", "ياك", "إن شاء الله") so that a standard Arabic TTS engine can read it aloud with a natural Algerian rhythm and charm. Keep it encouraging and positive!
   - If "arabic", reply in clear, professional Modern Standard Arabic (Fusha).
   - If "french", reply in warm, elegant business French.
4. Keep the output clean, returning the complete detailed text that should be read out loud.
`.trim();
        } else {
            // Public sales and marketing assistant for SyncloudPOS landing page
            systemPrompt = `
You are the SYNCLOUD POS AI Public Assistant, greeting visitors on the landing page of chirpedbeo.online.
Your job is to answer questions about SyncloudPOS (features, pricing, mobile apps, support, target business types) in a warm, convincing, and highly professional manner.

=== SYNCLOUDPOS PRODUCT FACTS ===
- Core Product: All-in-one Smart POS and ERP software designed specifically for Algerian businesses. Combines cloud flexibility and offline local reliability.
- Key Sectors Covered: Hypermarchés & Alimentations, Grossistes (Wholesalers), Boutiques (shops), Ateliers (Workshops & Manufacturing), Pharmacies, Quincailleries (Hardware stores), Restaurants.
- Mobile Apps:
  1. SynCloud Gérant (Manager): Mobile app for owners to track real-time dashboard sales, margins, cash flow, client debts/credits, driver GPS tracking, and AI-powered purchase OCR (receipt scanning).
  2. SynCloud Tournée (Delivery): Mobile app for field delivery drivers to manage delivery plans, view client profiles, create Delivery Notes (BL) on site, collect payments, and manage returns — works perfectly offline!
- Voice Assistant: An intelligent voice assistant (the one they are talking to right now!) built right into the platform.
- Pricing & Plans: 
  - Free Trial: 7-day completely free trial with no commitment and no credit card required.
  - Plans (Starter & Pro) are custom-priced. Visitors can order or request a quote instantly via WhatsApp at +213 696 928 227 (or click the WhatsApp button).
- Support & Services: National support 7 days a week. We take care of installation, import of products from Excel, and complete staff training.
=== END PRODUCT FACTS ===

Instructions:
1. Answer the visitor's question accurately, concisely, and persuasively using the facts above.
2. Provide a complete, warm, and highly detailed response detailing all facts, listings, and descriptions to answer the query fully without length constraints.
3. Dialect/Language Formatting:
   - If the language is "darija", reply in phonetic Algerian Darija using the Arabic script. Use local Algerian greetings and phrases (e.g. say "مرحبا بيك", "اللوجيسيال", "الكاسة", "التليفون", "السوارد", "تواصل معانا", "إن شاء الله") to sound warm and close to Algerian merchants.
   - If "arabic", reply in clear, persuasive Modern Standard Arabic (Fusha).
   - If "french", reply in warm, elegant professional French.
4. Keep the output clean, returning the complete detailed text that should be read out loud.
`.trim();
        }

        // Resolve API key using centralized resolver
        let resolvedKey = resolveApiKey(provider, tenantSettings);

        if (!resolvedKey) {
            // Self-healing: if no custom or default key for chosen provider, fallback to GEMINI default key
            console.log(`[Vocal] No API key resolved for ${provider}. Falling back to GEMINI default.`);
            provider = "GEMINI";
            model = DEFAULT_MODELS.GEMINI;
            resolvedKey = resolveApiKey("GEMINI", tenantSettings);
        }

        if (!resolvedKey) {
            return {
                success: false,
                text: "Assistant vocal indisponible : Clé API non configurée.",
                detectedLanguage: requestedLanguage,
                error: "Missing API Key"
            };
        }

        // Run the query through our robust queryAI utility
        const result = await queryAI({
            provider,
            model,
            apiKey: resolvedKey,
            systemPrompt,
            userMessage: queryText,
            temperature: 0.6,
            maxTokens: 2048,
        });

        return {
            success: true,
            text: result.text,
            detectedLanguage: requestedLanguage,
        };

    } catch (err: any) {
        console.error("[VOCAL_QUERY_ERROR]", err);
        return {
            success: false,
            text: "Une erreur est survenue lors de l'analyse vocale.",
            detectedLanguage: requestedLanguage,
            error: err.message || "Internal error",
        };
    }
}
