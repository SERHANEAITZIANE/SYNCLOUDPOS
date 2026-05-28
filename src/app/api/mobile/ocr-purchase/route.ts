import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import { resolveApiKey, type AIProvider } from "@/lib/ai-providers";

/**
 * POST /api/mobile/ocr-purchase
 * Accepts base64-encoded invoice image(s), sends to Gemini Vision for OCR extraction.
 * Returns structured purchase data: supplier, items, shipping fees, payment info.
 */
export async function POST(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);

        const { images, language = "french" } = await req.json().catch(() => ({}));

        if (!images || !Array.isArray(images) || images.length === 0) {
            return NextResponse.json(
                { error: "Au moins une image est requise" },
                { status: 400 }
            );
        }

        // Limit to 3 images
        const limitedImages = images.slice(0, 3);

        // Fetch tenant AI settings
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

        // For OCR, we prefer Gemini Vision (best at image understanding)
        // Fall back to OpenAI Vision if Gemini key not available
        let provider: AIProvider = "GEMINI";
        let apiKey = resolveApiKey("GEMINI", tenant || {});

        if (!apiKey) {
            // Try OpenAI as fallback for vision
            apiKey = resolveApiKey("OPENAI", tenant || {});
            if (apiKey) {
                provider = "OPENAI";
            }
        }

        if (!apiKey) {
            // Return mock data as fallback when no API key
            return NextResponse.json({
                success: true,
                mock: true,
                data: getMockOCRResult(),
                message: language === "french" 
                    ? "Mode démonstration — Configurez une clé API Gemini pour l'OCR réel"
                    : "وضع تجريبي — قم بإعداد مفتاح Gemini API للتعرف الحقيقي",
            });
        }

        // Call the appropriate Vision API
        let extractedData;
        if (provider === "GEMINI") {
            extractedData = await callGeminiVision(apiKey, limitedImages, language);
        } else {
            extractedData = await callOpenAIVision(apiKey, limitedImages, language);
        }

        return NextResponse.json({
            success: true,
            mock: false,
            data: extractedData,
            provider,
        });

    } catch (error) {
        return mobileErrorResponse(error);
    }
}

// ─── Gemini Vision API ──────────────────────────────────────────────────────
async function callGeminiVision(apiKey: string, images: string[], language: string) {
    const model = "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

    // Build parts: system instruction + images
    const imageParts = images.map((base64Img: string) => {
        // Strip data URI prefix if present
        const cleanBase64 = base64Img.replace(/^data:image\/\w+;base64,/, "");
        return {
            inlineData: {
                mimeType: "image/jpeg",
                data: cleanBase64,
            }
        };
    });

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{
                role: "user",
                parts: [
                    { text: buildOCRPrompt(language) },
                    ...imageParts,
                ]
            }],
            generationConfig: {
                temperature: 0.1, // Low temperature for accuracy
                maxOutputTokens: 2000,
                responseMimeType: "application/json",
            },
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Gemini Vision API error ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    try {
        return JSON.parse(rawText);
    } catch {
        // If JSON parsing fails, return the raw text with a fallback structure
        return {
            supplier: "Non détecté",
            items: [],
            shippingFees: 0,
            rawText: rawText,
            parseError: true,
        };
    }
}

// ─── OpenAI Vision API ──────────────────────────────────────────────────────
async function callOpenAIVision(apiKey: string, images: string[], language: string) {
    const imageContents = images.map((base64Img: string) => {
        const cleanBase64 = base64Img.startsWith("data:") ? base64Img : `data:image/jpeg;base64,${base64Img}`;
        return {
            type: "image_url" as const,
            image_url: { url: cleanBase64, detail: "high" as const },
        };
    });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: buildOCRPrompt(language) },
                        ...imageContents,
                    ],
                },
            ],
            temperature: 0.1,
            max_tokens: 2000,
            response_format: { type: "json_object" },
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `OpenAI Vision API error ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content?.trim() || "";

    try {
        return JSON.parse(rawText);
    } catch {
        return {
            supplier: "Non détecté",
            items: [],
            shippingFees: 0,
            rawText: rawText,
            parseError: true,
        };
    }
}

// ─── OCR Extraction Prompt ──────────────────────────────────────────────────
function buildOCRPrompt(language: string): string {
    return `You are an expert Algerian commercial invoice OCR system. Analyze this invoice/receipt image and extract ALL data with extreme precision.

CRITICAL: You MUST return a valid JSON object with this EXACT structure:
{
  "supplier": "Full supplier name as written on the invoice",
  "supplierAddress": "Address if visible",
  "supplierNIF": "NIF/NIS/RC number if visible",
  "invoiceNumber": "Invoice/facture number if visible",
  "invoiceDate": "Date as written on invoice",
  "items": [
    {
      "name": "Product name exactly as written",
      "code": "Product code/reference if visible",
      "quantity": 10,
      "priceHt": 150.00,
      "tvaRate": 19,
      "unit": "Pièce/Carton/Kg"
    }
  ],
  "shippingFees": 0,
  "subtotalHt": 0,
  "totalTva": 0,
  "totalTtc": 0,
  "paymentMethod": "CREDIT or CASH if detectable",
  "notes": "Any additional notes visible on the invoice"
}

RULES:
1. Extract EVERY line item visible on the invoice, do not skip any.
2. For Algerian invoices, TVA rates are typically 0%, 9%, or 19%.
3. Prices are in Algerian Dinars (DA/DZD).
4. If a value is not visible, use 0 for numbers and "" for strings.
5. For quantity, look for "Qté", "Qt", "Quantité" columns.
6. For unit price, look for "P.U", "Prix Unitaire", "P.U HT" columns.
7. Be precise with decimal values.
8. If the image is blurry or unreadable, still try to extract what you can.
9. Return ONLY the JSON object, nothing else.`;
}

// ─── Mock Data Fallback ─────────────────────────────────────────────────────
function getMockOCRResult() {
    return {
        supplier: "SARL El Mountazah (El Eulma)",
        supplierAddress: "Zone Industrielle El Eulma, Sétif",
        supplierNIF: "001916085476927",
        invoiceNumber: "FA-2026/05-1847",
        invoiceDate: "26/05/2026",
        items: [
            { name: "Canette Coca-Cola 33cl", code: "CC33", quantity: 120, priceHt: 50, tvaRate: 19, unit: "Pièce" },
            { name: "Eau Minérale Lalla Khedidja 1.5L", code: "LK15", quantity: 240, priceHt: 24, tvaRate: 9, unit: "Pièce" },
            { name: "Jus Ramy Orange 1L", code: "RO1L", quantity: 60, priceHt: 80, tvaRate: 19, unit: "Pièce" },
            { name: "Biscuit Bimo Choco 40g", code: "BC40", quantity: 96, priceHt: 15, tvaRate: 19, unit: "Pièce" },
            { name: "Lait Soummam Entier 1L", code: "SE1L", quantity: 48, priceHt: 35, tvaRate: 9, unit: "Pièce" },
        ],
        shippingFees: 1500,
        subtotalHt: 16380,
        totalTva: 2610,
        totalTtc: 20490,
        paymentMethod: "CREDIT",
        notes: "",
    };
}
