import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import { getBusinessContextForTenant } from "@/actions/ai-context";
import { queryAI, resolveApiKey, DEFAULT_MODELS, AVAILABLE_MODELS, type AIProvider } from "@/lib/ai-providers";

export async function POST(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);

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

        const contentType = req.headers.get("content-type") || "";
        let queryText = "";
        let language = "french";
        let history = [];
        let detailedMode = false;
        let aiProviderOverride: string | null = null;
        let aiModelOverride: string | null = null;

        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            const audioFile = formData.get("audio") as Blob | null;
            language = (formData.get("language") as string) || "french";
            detailedMode = (formData.get("detailedMode") as string) === "true";
            const historyStr = formData.get("history") as string;
            history = historyStr ? JSON.parse(historyStr) : [];
            aiProviderOverride = formData.get("aiProvider") as string | null;
            aiModelOverride = formData.get("aiModel") as string | null;

            if (audioFile) {
                try {
                    queryText = await transcribeAudio(audioFile, language, tenant);
                } catch (transcribeErr: any) {
                    console.error("[Voice] Transcription error:", transcribeErr);
                    return NextResponse.json({
                        success: false,
                        text: language === "darija"
                            ? "خلل في تحويل الصوت إلى كتابة. عاود من فضلك."
                            : "Erreur de transcription audio. Veuillez réessayer."
                    });
                }
            }
        } else {
            const body = await req.json().catch(() => ({}));
            queryText = body.queryText;
            language = body.language || "french";
            history = body.history || [];
            detailedMode = body.detailedMode || false;
            aiProviderOverride = body.aiProvider;
            aiModelOverride = body.aiModel;
        }

        if (!queryText || !queryText.trim()) {
            return NextResponse.json({
                success: false,
                text: language === "darija"
                    ? "ما سمعتكش مليح، تقدر تعاود من فضلك؟"
                    : language === "arabic"
                    ? "لم أسمعك جيداً، هل يمكنك الإعادة من فضلك؟"
                    : "Je ne vous ai pas bien entendu, pouvez-vous répéter s'il vous plaît ?"
            });
        }

        // Resolve provider and model
        const provider = (aiProviderOverride as AIProvider) || (tenant?.aiProvider as AIProvider) || "GEMINI";
        let model = aiModelOverride || tenant?.aiModel || DEFAULT_MODELS[provider] || DEFAULT_MODELS.GEMINI;

        // Sanitize model to prevent non-existent model crashes (e.g. if gemini-3.1-flash is in database)
        const validModelIds = AVAILABLE_MODELS[provider]?.map(m => m.id) || [];
        if (!validModelIds.includes(model)) {
            model = DEFAULT_MODELS[provider];
        }

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
        const systemPrompt = buildVoiceAssistantPrompt(businessContext, language, detailedMode);

        // Query the AI provider
        const result = await queryAI({
            provider,
            model,
            apiKey,
            systemPrompt,
            userMessage: queryText,
            history,
            temperature: 0.7,
            maxTokens: 1500, // Increased to support detailed responses and avoid truncation
        });

        return NextResponse.json({
            success: true,
            text: result.text,
            queryText, // Return the transcribed text so mobile can display the user bubble correctly
            detectedLanguage: language,
            provider: result.provider,
            model: result.model,
        });

    } catch (error) {
        return mobileErrorResponse(error);
    }
}

async function transcribeAudio(audioFile: Blob, language: string, tenant: any): Promise<string> {
    const openaiApiKey = tenant?.openaiApiKey || process.env.OPENAI_API_KEY;
    const geminiApiKey = tenant?.geminiApiKey || process.env.GEMINI_API_KEY;

    if (openaiApiKey) {
        try {
            console.log("[Voice] Transcribing audio with OpenAI Whisper...");
            const formData = new FormData();
            formData.append("file", audioFile, "audio.m4a");
            formData.append("model", "whisper-1");
            if (language === "darija" || language === "arabic") {
                formData.append("language", "ar");
            } else {
                formData.append("language", "fr");
            }

            const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${openaiApiKey.trim()}`,
                },
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                console.log("[Voice] Whisper transcription success:", data.text);
                return data.text || "";
            } else {
                const err = await res.text();
                console.warn("[Voice] Whisper API error:", err);
            }
        } catch (whisperErr) {
            console.error("[Voice] Whisper failed:", whisperErr);
        }
    }

    if (geminiApiKey) {
        try {
            console.log("[Voice] Transcribing audio with Gemini...");
            const buffer = Buffer.from(await audioFile.arrayBuffer());
            const base64Audio = buffer.toString("base64");
            
            const mimeType = audioFile.type && audioFile.type !== "application/octet-stream"
                ? audioFile.type
                : "audio/m4a";

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiApiKey.trim())}`;

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inlineData: {
                                    mimeType,
                                    data: base64Audio
                                }
                            },
                            {
                                text: "Transcribe the spoken audio. If the speech is in Algerian Arabic (Darija), transcribe it exactly in Arabic script as spoken. Return ONLY the transcription text, nothing else. If you cannot hear anything or the audio is silent, reply with empty text."
                            }
                        ]
                    }]
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const transcription = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
                console.log("[Voice] Gemini transcription success:", transcription);
                return transcription;
            } else {
                const err = await response.text();
                console.warn("[Voice] Gemini Transcription API error:", err);
            }
        } catch (geminiErr) {
            console.error("[Voice] Gemini transcription failed:", geminiErr);
        }
    }

    throw new Error("No available API key or transcription service configured.");
}


function buildVoiceAssistantPrompt(businessContext: string, language: string, detailedMode: boolean): string {
    const derdjaBlock = `
=== DERDJA ALGÉRIENNE — INSTRUCTIONS SPÉCIALES ===
Tu es un assistant vocal algérien. Tu DOIS répondre en DERDJA ALGÉRIENNE authentique, écrite en SCRIPT ARABE.
Tu es chaleureux, encourageant, et tu parles exactement comme un commerçant algérien expérimenté.
NE glisse JAMAIS vers l'arabe littéraire (Fusha / الفصحى). Reste à 100% dans le dialecte algérien (Darija).

VOCABULAIRE COMMERCIAL OBLIGATOIRE à utiliser :
- "الكاسة" (la caisse) au lieu de "الصندوق"
- "السلعة" (la marchandise/produit) au lieu de "المنتج"
- "سوردو" / "نسوردو" (approvisionner / commander de la marchandise)
- "شحال" (combien) au lieu de "كم"
- "خلاص" (paiement) au lieu de "الدفع"
- "الصولد" / "كريدي" (le solde / crédit) au lieu de "الرصيد"
- "بزاف" (beaucoup) au lieu de "كثير"
- "والو" (rien) au lieu de "لا شيء"
- "بلاك" (peut-être) au lieu de "ربما"
- "ياك" (n'est-ce pas) au lieu de "أليس كذلك"
- "المصروف" (les dépenses) au lieu de "النفقات"
- "الزبون" (le client) au lieu de "العميل"
- "السالك" / "السلاك" (ceux qui ont payé / paiement)
- "الدين" (la dette/créance) au lieu de "المستحقات"
- "الفلوس" / "السوارد" (l'argent) au lieu de "المال"
- "خويا" / "خو" (mon frère)
- "يا مدير" / "يا الحاج" / "يا الشيخ" — formes d'adresse chaleureuses
- "إن شاء الله" — à utiliser pour parler du futur
- "الحمد لله" — à utiliser pour les résultats positifs
- "ربي يبارك" — pour féliciter
- "بون دو ليفريزو" / "بي ال" (Bon de livraison)
- "بون دو كوموند" (Bon de commande)
- "فاكتورة" (Facture)

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
Utilisez les termes commerciaux algériens francisés quand c'est naturel (ex: "chiffre d'affaires", "bons de livraison", "crédit", "caisse").
=== END FRENCH INSTRUCTIONS ===
`;

    const languageBlock = language === "darija" ? derdjaBlock : language === "arabic" ? arabicBlock : frenchBlock;

    const detailedModeBlock = detailedMode
        ? `
=== DETAILED MODE ACTIVATED ===
1. You should provide detailed and deep analysis of the business context.
2. You can use markdown formatting, including bullet points, numbered lists, bold text, and brief tables where appropriate to present data clearly.
3. Provide breakdown by clients, products, or dates if relevant.
4. Still maintain the chosen language and tone, but prioritize depth and completeness over extreme brevity.
=== END DETAILED MODE ===
`
        : `
=== SPOKEN VOICE MODE ===
1. Provide a highly concise, warm, and professional response (2 to 4 sentences maximum) suitable for Text-to-Speech (TTS) vocalization. 
2. AVOID: lists, dashes, bullet points, tables, asterisks, markdown. Return ONLY clean spoken text.
3. Keep it extremely clean — return ONLY the text that should be read out loud by TTS.
=== END SPOKEN VOICE MODE ===
`;

    return `
You are the SYNCLOUD POS AI Voice Dashboard Assistant, designed specifically for the Gérant (Manager) inside their Mobile Application.
Your job is to answer vocal dashboard queries based on the real-time business context provided below.

${languageBlock}

${detailedModeBlock}

=== REAL-TIME BUSINESS CONTEXT ===
${businessContext}
=== END CONTEXT ===

CORE INSTRUCTIONS:
1. Analyze the context metrics (revenue, POS sales, delivery notes/BL, debtors, suppliers, expenses, stocks) to answer the manager's query accurately.
2. Summarize numbers verbally and naturally (e.g. "cent cinquante mille dinars" / "150 ألف دينار").
3. ALWAYS be encouraging and positive when results are good. Be supportive and solutions-oriented when there are problems.
4. If the user writes in Derdja/dialecte (even in Latin characters like "chhal dakhalna lyoum"), understand it and respond in the selected language mode.
5. If the user writes in French but Derdja mode is active, still respond in Derdja.
`.trim();
}
