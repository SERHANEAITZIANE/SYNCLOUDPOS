"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { getActiveTenantId } from "./get-active-tenant"
import { subDays } from "date-fns"

export async function getAIDemandForecast() {
    const session = await auth()
    if (!session?.user) {
        return { error: "Non autorisé." }
    }

    const tenantId = await getActiveTenantId()
    if (!tenantId) {
        return { error: "Sélecteur d'entreprise requis." }
    }

    const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { aiProvider: true, geminiApiKey: true, openaiApiKey: true, anthropicApiKey: true }
    })

    if (!tenant) return { error: "Entreprise introuvable." }

    const provider = tenant.aiProvider || "GEMINI"
    let apiKey = ""
    if (provider === "GEMINI") apiKey = tenant.geminiApiKey || process.env.GEMINI_API_KEY || ""
    if (provider === "OPENAI") apiKey = tenant.openaiApiKey || process.env.OPENAI_API_KEY || ""
    if (provider === "ANTHROPIC") apiKey = tenant.anthropicApiKey || process.env.ANTHROPIC_API_KEY || ""

    if (!apiKey) {
        return { error: `Veuillez configurer votre clé API pour ${provider} dans les paramètres.` }
    }

    // Aggregate sales data from the last 90 days
    const ninetyDaysAgo = subDays(new Date(), 90)

    // POS Orders
    const posItems = await db.orderItem.findMany({
        where: {
            order: {
                tenantId: tenantId,
                status: "COMPLETED",
                createdAt: { gte: ninetyDaysAgo }
            }
        },
        select: { productId: true, quantity: true, product: { select: { name: true, stock: true } } }
    })

    // Sales Orders (BL/Factures)
    const salesItems = await db.salesOrderItem.findMany({
        where: {
            salesOrder: {
                tenantId: tenantId,
                status: { in: ["VALIDATED", "PAID"] },
                createdAt: { gte: ninetyDaysAgo }
            }
        },
        select: { productId: true, quantity: true, product: { select: { name: true, stock: true } } }
    })

    const productSales = new Map<string, { name: string, sold: number, stock: number }>()

    const addToMap = (productId: string, name: string, qty: number, stock: number) => {
        if (!productSales.has(productId)) {
            productSales.set(productId, { name, sold: 0, stock })
        }
        productSales.get(productId)!.sold += qty
    }

    posItems.forEach(item => addToMap(item.productId, item.product.name, item.quantity, item.product.stock))
    salesItems.forEach(item => addToMap(item.productId, item.product.name, item.quantity, item.product.stock))

    const dataReportData = Array.from(productSales.values())
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 100) // limit to top 100 selling items so we don't blow up context limit

    if (dataReportData.length === 0) {
        return { error: "Pas assez de données de ventes sur les 90 derniers jours pour analyser." }
    }

    const csvData = dataReportData.map(p => `${p.name}, Sold(90d): ${p.sold}, CurrentStock: ${p.stock}`).join("\n")

    const systemPrompt = `You are an expert supply chain and inventory analyst AI for a retail/wholesale ERP system called SynCloudPOS.
The user wants an AI Demand Forecast for the next 30 days based on the following product sales data from the last 90 days.
Calculate the average daily velocity, project it for the next 30 days, and compare it with the current stock.
Output your response in beautiful Markdown, written in French.
Highlight products that urgently need restocking (where projected 30-day demand > current stock).
Give strategic advice.`

    const userPrompt = `Data (Top 100 products from last 90 days):\n${csvData}\n\nPlease generate the forecast report.`

    try {
        let prediction = ""

        if (provider === "GEMINI") {
            const body = {
                contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
            }
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
                { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
            )
            if (!res.ok) throw new Error(`Gemini API error: ${res.statusText}`)
            const data = await res.json()
            prediction = data.candidates?.[0]?.content?.parts?.[0]?.text || "Erreur lors de la génération."
        } else if (provider === "OPENAI") {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey.trim()}` },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ]
                })
            })
            if (!res.ok) throw new Error(`OpenAI error: ${res.statusText}`)
            const data = await res.json()
            prediction = data.choices?.[0]?.message?.content || "Erreur de génération."
        } else if (provider === "ANTHROPIC") {
            const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey.trim(),
                    "anthropic-version": "2023-06-01"
                },
                body: JSON.stringify({
                    model: "claude-3-haiku-20240307",
                    max_tokens: 1500,
                    system: systemPrompt,
                    messages: [{ role: "user", content: userPrompt }]
                })
            })
            if (!res.ok) throw new Error(`Anthropic error: ${res.statusText}`)
            const data = await res.json()
            prediction = data.content?.[0]?.text || "Erreur de génération."
        }

        return { data: prediction }

    } catch (e: any) {
        console.error("AI Forecast Error:", e)
        return { error: `Une erreur est survenue avec le service d'IA : ${e.message}` }
    }
}
