import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import { getBusinessContextForTenant } from "@/actions/ai-context";
import { queryAI, resolveApiKey, DEFAULT_MODELS, type AIProvider } from "@/lib/ai-providers";

export async function POST(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);

        // Parse request body
        const { queryText, language = "french" } = await req.json().catch(() => ({}));

        if (!queryText || !queryText.trim()) {
            return NextResponse.json({ error: "Texte de requête manquant" }, { status: 400 });
        }

        // Fetch tenant settings including AI configuration
        const tenant = await db.tenant.findUnique({
            where: { id: user.tenantId },
            select: {
                geminiApiKey: true,
                openaiApiKey: true,
                anthropicApiKey: true,
                aiProvider: true,
                aiModel: true,
            }
        });

        // Resolve provider and model
        const provider = (tenant?.aiProvider as AIProvider) || "GEMINI";
        const model = tenant?.aiModel || DEFAULT_MODELS[provider] || DEFAULT_MODELS.GEMINI;

        // Resolve API key with fallback chain
        const apiKey = resolveApiKey(provider, tenant || {});

        if (!apiKey) {
            const noKeyMsg = language === "darija"
                ? "ما كاينش مفتاح API. روح للبوابة الإلكترونية وأضف المفتاح في إعدادات الذكاء الاصطناعي."
                : language === "arabic"
                ? "مفتاح API غير مكوّن. يرجى إضافته في إعدادات الذكاء الاصطناعي على البوابة."
                : "Clé API non configurée. Veuillez l'ajouter dans les paramètres AI de l'application.";

            return NextResponse.json({
                success: false,
                text: noKeyMsg,
                detectedLanguage: language
            });
        }

        // Get the tenant-scoped business context
        const businessContext = await getBusinessContextForTenant(user.tenantId);

        // Build the system prompt with enhanced Derdja support
        const systemPrompt = buildVoiceAssistantPrompt(businessContext, language);

        // Query the AI provider
        const result = await queryAI({
            provider,
            model,
            apiKey,
            systemPrompt,
            userMessage: queryText,
            temperature: 0.7,
            maxTokens: 400,
        });

        return NextResponse.json({
            success: true,
            text: result.text,
            detectedLanguage: language,
            provider: result.provider,
            model: result.model,
        });

    } catch (error) {
        return mobileErrorResponse(error);
    }
}


function buildVoiceAssistantPrompt(businessContext: string, language: string): string {
    const derdjaBlock = `
=== DERDJA ALGÉRIENNE — INSTRUCTIONS SPÉCIALES ===
Tu es un assistant vocal algérien. Tu DOIS répondre en DERDJA ALGÉRIENNE authentique, écrite en SCRIPT ARABE.
Tu es chaleureux, encourageant, et tu parles exactement comme un commerçant algérien.

VOCABULAIRE COMMERCIAL OBLIGATOIRE à utiliser :
- "الكاسة" (la caisse) au lieu de "الصندوق"
- "السلعة" (la marchandise/produit) au lieu de "المنتج"
- "السوارد" (les fournisseurs/approvisionnement) au lieu de "التوريدات"
- "شحال" (combien) au lieu de "كم"
- "خلاص" (paiement) au lieu de "الدفع"
- "الصولد" (le solde) au lieu de "الرصيد"
- "بزاف" (beaucoup) au lieu de "كثير"
- "والو" (rien) au lieu de "لا شيء"
- "بلاك" (peut-être) au lieu de "ربما"
- "ياك" (n'est-ce pas) au lieu de "أليس كذلك"
- "الطابلة" (le comptoir/la table) au lieu de "المنضدة"
- "الميزان" (la balance/le bilan) au lieu de "الميزانية"
- "الحاصيل" (le total/le résultat) au lieu de "المحصلة"
- "المصروف" (les dépenses) au lieu de "النفقات"
- "الزبون" (le client) au lieu de "العميل"
- "الدين" (la dette/créance) au lieu de "المستحقات"
- "الفلوس" (l'argent) au lieu de "المال"
- "خويا" (mon frère) au lieu de "أخي"
- "يا مدير" (chef/directeur) — forme d'adresse chaleureuse
- "إن شاء الله" — à utiliser pour parler du futur
- "الحمد لله" — à utiliser pour les résultats positifs
- "ربي يبارك" — pour féliciter

EXEMPLES DE RÉPONSES EN DERDJA :
- "يا مدير، الحمد لله اليوم دخلنا مليح! الكاسة فيها 150 ألف دينار، وبعنا 47 طلبية. ربي يبارك!"
- "يا مدير، عندنا 5 سلع خصّوا من الماغازان. لازم نسوردوهم قبل ما نروحوا بلا والو."
- "يا خويا، الزبائن عليهم الدين بزاف. كاين 8 زبائن عليهم أكثر من 50 ألف دينار. لازم نتصلوا بيهم."

IMPORTANT: NE JAMAIS répondre en arabe littéraire (فصحى) quand le mode Derdja est activé. Garde le ton naturel, chaleureux, et 100% dialecte algérien.
=== FIN INSTRUCTIONS DERDJA ===
`;

    const arabicBlock = `
=== ARABIC (FUSHA) INSTRUCTIONS ===
Respond in clear, professional Modern Standard Arabic (الفصحى). Use proper grammatical structures.
Keep a warm, professional tone suitable for a business manager. Use formal address "يا مدير" or "سيدي المدير".
=== END ARABIC INSTRUCTIONS ===
`;

    const frenchBlock = `
=== FRENCH INSTRUCTIONS ===
Répondez en français professionnel et chaleureux, adapté à un gérant de boutique en Algérie.
Utilisez les termes commerciaux algériens francisés quand c'est naturel (ex: "chiffre d'affaires", "bons de livraison").
=== END FRENCH INSTRUCTIONS ===
`;

    const languageBlock = language === "darija" ? derdjaBlock : language === "arabic" ? arabicBlock : frenchBlock;

    return `
You are the SYNCLOUD POS AI Voice Dashboard Assistant, designed specifically for the Gérant (Manager) inside their Mobile Application.
Your job is to answer vocal dashboard queries based on the real-time business context provided below.

${languageBlock}

=== REAL-TIME BUSINESS CONTEXT ===
${businessContext}
=== END CONTEXT ===

CORE INSTRUCTIONS:
1. Analyze the context metrics (revenue, POS sales, delivery notes/BL, debtors, suppliers, expenses, stocks) to answer the manager's query accurately.
2. Provide a highly concise, warm, and professional vocal response (2 to 4 sentences maximum) suitable for Text-to-Speech (TTS) vocalization. 
3. AVOID: lists, dashes, bullet points, tables, asterisks, markdown. Return ONLY clean spoken text.
4. Summarize numbers verbally and naturally (e.g. "cent cinquante mille dinars" / "150 ألف دينار").
5. ALWAYS be encouraging and positive when results are good. Be supportive and solutions-oriented when there are problems.
6. If the user writes in Derdja/dialecte (even in Latin characters like "chhal dakhalna lyoum"), understand it and respond in the selected language mode.
7. If the user writes in French but Derdja mode is active, still respond in Derdja.
8. Keep the output extremely clean — return ONLY the text that should be read out loud by TTS.
`.trim();
}
