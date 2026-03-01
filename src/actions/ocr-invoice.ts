"use server"

export interface OcrInvoiceItem {
    name: string
    quantity: number
    unitPrice: number
    totalLine: number
}

export interface OcrInvoiceResult {
    supplier: string
    items: OcrInvoiceItem[]
    grandTotal: number
    calculatedTotal: number
    isValid: boolean
    rawText?: string
    error?: string
}

import { getActiveTenantId } from "./get-active-tenant";
import { db } from "@/lib/db";

export async function analyzeInvoiceWithGemini(base64Image: string, mimeType: string): Promise<OcrInvoiceResult> {
    const tenantId = await getActiveTenantId();

    if (!tenantId) {
        return {
            supplier: "", items: [], grandTotal: 0, calculatedTotal: 0, isValid: false,
            error: "No active tenant selected."
        }
    }

    const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { geminiApiKey: true }
    });

    const apiKey = tenant?.geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return {
            supplier: "",
            items: [],
            grandTotal: 0,
            calculatedTotal: 0,
            isValid: false,
            error: "Veuillez configurer votre clé API Gemini dans les paramètres de la boutique."
        }
    }

    const prompt = `You are an expert invoice/delivery note (bon de livraison) parser for Algerian businesses.

Analyze this invoice/delivery note image and extract structured data.

Return ONLY a valid JSON object with this exact structure (no markdown, no backticks, just raw JSON):
{
  "supplier": "name of the supplier/company from the header or stamp (empty string if not found)",
  "items": [
    {
      "name": "product name",
      "quantity": 1,
      "unitPrice": 0.0,
      "totalLine": 0.0
    }
  ],
  "grandTotal": 0.0
}

Rules:
- Extract product names as clearly as possible
- quantity should always be a positive integer
- unitPrice (PU) is the price per unit in DA (Algerian Dinar)
- totalLine = quantity × unitPrice
- grandTotal is the final TOTAL MONTANT or NET A PAYER from the document
- Ignore TVA, remise (discounts that are included in the prices), header/footer text, phone numbers, addresses
- Numbers with spaces like "12 500" mean 12500 DA
- Numbers with comma "12,500" or period "12.500" as thousands separator → treat as 12500
- A period or comma before exactly 2 digits is a decimal separator (e.g. "12.50" = twelve and a half)
- If you cannot find a field, use empty string or 0`

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: mimeType,
                                    data: base64Image
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 2048
                    }
                })
            }
        )

        if (!response.ok) {
            const errText = await response.text()
            return {
                supplier: "", items: [], grandTotal: 0, calculatedTotal: 0, isValid: false,
                error: `Gemini API error: ${response.status} – ${errText.slice(0, 200)}`
            }
        }

        const data = await response.json()
        const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || ""

        // Strip markdown fences if any
        const cleaned = rawText.replace(/```json\n?/gi, "").replace(/```\n?/gi, "").trim()

        let parsed: any
        try {
            parsed = JSON.parse(cleaned)
        } catch {
            return {
                supplier: "", items: [], grandTotal: 0, calculatedTotal: 0, isValid: false,
                rawText,
                error: "Could not parse Gemini response as JSON"
            }
        }

        const items: OcrInvoiceItem[] = (parsed.items || []).map((item: any) => ({
            name: String(item.name || ""),
            quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
            unitPrice: Number(item.unitPrice) || 0,
            totalLine: Number(item.totalLine) || 0,
        })).filter((i: OcrInvoiceItem) => i.name.length > 0)

        const grandTotal = Number(parsed.grandTotal) || 0
        const calculatedTotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
        const isValid = grandTotal > 0 && Math.abs(calculatedTotal - grandTotal) <= grandTotal * 0.02 // 2% tolerance

        return {
            supplier: String(parsed.supplier || ""),
            items,
            grandTotal,
            calculatedTotal,
            isValid
        }

    } catch (error: any) {
        return {
            supplier: "", items: [], grandTotal: 0, calculatedTotal: 0, isValid: false,
            error: String(error?.message || error)
        }
    }
}
