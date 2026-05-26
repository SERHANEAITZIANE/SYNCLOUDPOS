import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import { getBusinessContextForTenant } from "@/actions/ai-context";

export async function POST(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);

        // Parse request body
        const { queryText, language = "french" } = await req.json().catch(() => ({}));

        if (!queryText || !queryText.trim()) {
            return NextResponse.json({ error: "Texte de requête manquant" }, { status: 400 });
        }

        // Fetch tenant settings to get Gemini API key
        const tenant = await db.tenant.findUnique({
            where: { id: user.tenantId },
            select: { geminiApiKey: true }
        });

        const apiKey = tenant?.geminiApiKey || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({
                success: false,
                text: "Clé API Gemini non configurée. Veuillez l'ajouter dans vos paramètres AI sur le portail web.",
                detectedLanguage: language
            });
        }

        // Get the tenant-scoped business context
        const businessContext = await getBusinessContextForTenant(user.tenantId);

        const systemPrompt = `
You are the SYNCLOUD POS AI Voice Dashboard Assistant, designed specifically for the Gérant (Manager) inside their Mobile Application.
Your job is to answer vocal dashboard queries based on the real-time business context provided below.

=== REAL-TIME BUSINESS CONTEXT ===
${businessContext}
=== END CONTEXT ===

Instructions:
1. Analyze the context metrics (revenue, POS sales, delivery notes/BL, debtors, suppliers, expenses, stocks) to answer the manager's query accurately.
2. Provide a highly concise, warm, and professional vocal response (2 to 3 sentences maximum) suitable for Text-to-Speech (TTS) vocalization. Avoid lists, dashes, tables, or complex markdown formatting. Summarize numbers verbally (e.g. say "cent cinquante mille dinars" or "150 000 DA" rather than write a list).
3. Dialect/Language Formatting:
   - If the requested language is "darija", respond in phonetic Algerian Darija using the Arabic script. Use warm, regional phrases (e.g. say "يا مدير", "السلعة", "السوارد", "شحال", "خلاص", "الكاسة", "الصولد", "ياك", "إن شاء الله") so that a standard Arabic TTS engine can read it aloud with a natural Algerian rhythm and charm. Keep it encouraging and positive!
   - If "arabic", reply in clear, professional Modern Standard Arabic (Fusha).
   - If "french", reply in warm, elegant business French.
4. Keep the output extremely clean, returning only the text that should be read out loud.
`.trim();

        // Query the Gemini API using generateContent
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: queryText }] }],
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    generationConfig: {
                        temperature: 0.6,
                        maxOutputTokens: 300,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            console.error("Gemini API Error:", errJson);
            throw new Error(errJson?.error?.message || `API error ${response.status}`);
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Je n'ai pas pu analyser la réponse.";

        return NextResponse.json({
            success: true,
            text: textResponse,
            detectedLanguage: language,
        });

    } catch (error) {
        return mobileErrorResponse(error);
    }
}
