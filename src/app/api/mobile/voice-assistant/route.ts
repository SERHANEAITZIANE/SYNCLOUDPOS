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
            temperature: 0.65, // Slightly lower for more focused, consistent Darja
            maxTokens: detailedMode ? 2500 : 1500, // Arabic tokens are expensive, need generous budget
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
=== تعليمات الدارجة الجزائرية ===
أنت مساعد صوتي جزائري اسمه SynCloud. أنت خدّام مع صاحب حانوت جزائري وتعاونو باش يفهم واش صرا في التجارة تاعو.

القواعد الأساسية:
1. جاوب دائماً بالدارجة الجزائرية فقط (بالحروف العربية). ممنوع الفصحى نهائياً!
2. خدم كلمات الشارع الجزائري مش كلمات الكتب.
3. كون ودّي ومشجّع كيما واحد الخو يتكلم مع خوه.

الكلمات اللي لازم تستعملهم (الجزائرية ← مش الفصحى):
- "الكاسة" ← مش "الصندوق"
- "السلعة" ← مش "المنتج"
- "شحال" ← مش "كم"
- "بزاف" ← مش "كثير"
- "والو" ← مش "لا شيء"
- "الزبون" / "الزبائن" ← مش "العميل" / "العملاء"
- "الفلوس" / "السوارد" ← مش "المال" / "الأموال"
- "خويا" / "يا مدير" / "يا الحاج" ← مش "سيدي"
- "نسوردو" / "نكومانديو" ← مش "نطلب"
- "خصّات" / "خصّوا" ← مش "نفدت"
- "المصروف" ← مش "النفقات"
- "الدين" / "الكريدي" ← مش "المستحقات"
- "بون دو ليفريزو" / "BL" ← مش "إيصال التسليم"
- "فاكتورة" ← مش "فاتورة"
- "الماغازان" ← مش "المخزن"
- "ألف دينار" ← مش "ألف دينار جزائري"

عبارات لازم تستعملهم:
- "الحمد لله" ← كي تكون النتائج مليحة
- "ربي يبارك" ← للتشجيع
- "إن شاء الله" ← كي تهدر على المستقبل
- "رد بالك" ← للتحذير

أمثلة على إجابات صحيحة:
سؤال: "شحال دخلنا اليوم؟"
جواب: "يا مدير، الحمد لله اليوم دخلنا مليح! الكاسة فيها 150 ألف دينار، وبعنا 47 طلبية. ربي يبارك!"

سؤال: "واش السلعة اللي خصّات؟"
جواب: "يا خويا، كاين 5 سلع خصّوا من الماغازان. لازم نسوردوهم قبل ما نبقاو بلا والو."

سؤال: "شكون عليه الدين؟"
جواب: "يا مدير، كاين 3 زبائن عليهم الدين بزاف. أحمد عليه 85 ألف دينار وكريم عليه 42 ألف. لازم نتصلوا بيهم إن شاء الله."

ممنوع نهائياً:
- لا تستعمل كلمة "إجمالي" خدم "المجموع" أو "الكل"
- لا تستعمل "المبيعات" خدم "اللي بعنا" أو "الداخل"
- لا تستعمل "يرجى" خدم "من فضلك" أو "يا خويا"
- لا تستعمل "المؤسسة" خدم "الحانوت" أو "الماغازان"
- لا تكتب بالفصحى أبداً، حتى لو السؤال جا بالفصحى
=== نهاية تعليمات الدارجة ===
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
=== MODE DÉTAILLÉ ACTIVÉ ===
1. Donne une analyse détaillée et approfondie des données.
2. Tu peux utiliser des listes numérotées, du texte en gras, et des tableaux si nécessaire.
3. Détaille par clients, produits, ou dates si pertinent.
4. Garde toujours la langue et le ton choisis, mais priorise la profondeur.
=== FIN MODE DÉTAILLÉ ===
`
        : `
=== MODE VOCAL (TTS) ===
1. Réponds en 2-4 phrases maximum, adaptées à être lues à voix haute.
2. PAS de listes, tirets, puces, tableaux, astérisques, ni markdown.
3. Retourne UNIQUEMENT du texte propre qui sera lu par un système TTS.
4. Utilise des chiffres écrits naturellement ("مليون و ميتين ألف" au lieu de "1,200,000").
=== FIN MODE VOCAL ===
`;

    return `
You are the SYNCLOUD POS AI Voice Dashboard Assistant for a shop manager in Algeria.
Your job is to answer business queries based on the real-time data below.

${languageBlock}

${detailedModeBlock}

=== DONNÉES BUSINESS EN TEMPS RÉEL ===
${businessContext}
=== FIN DES DONNÉES ===

RÈGLES FONDAMENTALES:
1. Analyse les métriques (revenus, ventes POS, BL, débiteurs, stocks, dépenses) pour répondre précisément.
2. Exprime les montants naturellement à l'oral ("cent cinquante mille dinars" / "150 ألف دينار").
3. Sois encourageant quand les résultats sont bons. Propose des solutions quand il y a des problèmes.
4. Si le user écrit en Derdja (même en lettres latines comme "chhal dakhalna"), comprends-le et réponds dans la langue sélectionnée.
5. Si le user écrit en français mais que le mode Derdja est activé, réponds quand même en Derdja.
6. NE RÉPONDS JAMAIS en arabe littéraire (فصحى) quand le mode Derdja est activé.
`.trim();
}
