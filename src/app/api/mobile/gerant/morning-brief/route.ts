import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import { queryAI, resolveApiKey, DEFAULT_MODELS, type AIProvider } from "@/lib/ai-providers";

export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }
        const tenantId = user.tenantId;

        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);

        // Fetch tenant AI config + business data in parallel
        const [tenant, todaySales, yesterdaySales, topDebtors, lowStockItems, pendingExpenses] =
            await Promise.all([
                db.tenant.findUnique({
                    where: { id: tenantId },
                    select: { geminiApiKey: true, openaiApiKey: true, anthropicApiKey: true, aiProvider: true, aiModel: true },
                }),
                db.salesOrder.aggregate({
                    where: { tenantId, createdAt: { gte: startOfToday }, status: { in: ["VALIDATED", "PAID"] } },
                    _sum: { total: true }, _count: true,
                }),
                db.salesOrder.aggregate({
                    where: { tenantId, createdAt: { gte: startOfYesterday, lt: startOfToday }, status: { in: ["VALIDATED", "PAID"] } },
                    _sum: { total: true }, _count: true,
                }),
                db.customer.findMany({
                    where: { tenantId, balance: { gt: 0 } },
                    orderBy: { balance: "desc" },
                    take: 3,
                    select: { name: true, balance: true, phone: true },
                }),
                db.storeProduct.findMany({
                    where: { product: { tenantId }, stock: { lte: db.storeProduct.fields.minStock } },
                    take: 5,
                    include: { product: { select: { name: true } } },
                }),
                db.expense.findMany({
                    where: { tenantId, createdAt: { gte: startOfToday } },
                    select: { amount: true },
                }),
            ]);

        const todayRevenue = Number(todaySales._sum.total || 0);
        const yesterdayRevenue = Number(yesterdaySales._sum.total || 0);
        const todayOrders = todaySales._count;
        const totalDebt = topDebtors.reduce((s, d) => s + Number(d.balance), 0);
        const totalExpenses = pendingExpenses.reduce((s, e) => s + Number(e.amount), 0);
        const growthPct = yesterdayRevenue > 0
            ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
            : 0;

        // Resolve AI config
        const provider = (tenant?.aiProvider as AIProvider) || "GEMINI";
        const model = tenant?.aiModel || DEFAULT_MODELS[provider] || DEFAULT_MODELS.GEMINI;
        const apiKey = resolveApiKey(provider, tenant || {});

        let greeting = "Bonjour ! Voici un résumé de votre journée basé sur vos données en temps réel.";

        if (apiKey) {
            const systemPrompt = `Tu es le conseiller d'affaires IA de SynCloudPOS pour un gérant en Algérie.
Donne un briefing matinal court (4-5 lignes max) en mélange français/darija algérienne.
Commence par une salutation chaleureuse, résume la situation ci-dessous, donne 2-3 conseils pratiques.
Sois direct, concret, utilise des emojis. Parle comme un conseiller de confiance.`;

            const userMessage = `Il est ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} le ${now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}.

SITUATION ACTUELLE:
- CA d'aujourd'hui: ${todayRevenue.toLocaleString("fr-FR")} DA (${todayOrders} commandes)
- CA d'hier: ${yesterdayRevenue.toLocaleString("fr-FR")} DA
- Croissance: ${growthPct > 0 ? "+" : ""}${growthPct}%
- Dépenses d'aujourd'hui: ${totalExpenses.toLocaleString("fr-FR")} DA
- Créances clients: ${totalDebt.toLocaleString("fr-FR")} DA (top 3: ${topDebtors.map(d => `${d.name} ${Math.round(Number(d.balance)).toLocaleString("fr-FR")}DA`).join(", ") || "aucun"})
- Produits en rupture/stock bas: ${lowStockItems.length} références

Génère le briefing matinal maintenant.`;

            try {
                const result = await queryAI({
                    provider,
                    model,
                    apiKey,
                    systemPrompt,
                    userMessage,
                    temperature: 0.7,
                    maxTokens: 400,
                });
                greeting = result.text;
            } catch (aiErr) {
                console.error("[MorningBrief] AI error:", aiErr);
                // Fallback to template-based greeting
                greeting = buildFallbackGreeting(todayRevenue, yesterdayRevenue, growthPct, todayOrders, topDebtors.length, lowStockItems.length, now);
            }
        } else {
            greeting = buildFallbackGreeting(todayRevenue, yesterdayRevenue, growthPct, todayOrders, topDebtors.length, lowStockItems.length, now);
        }

        return NextResponse.json({
            greeting,
            data: {
                todayRevenue: Math.round(todayRevenue),
                yesterdayRevenue: Math.round(yesterdayRevenue),
                growthPct,
                todayOrders,
                totalDebt: Math.round(totalDebt),
                debtorCount: topDebtors.length,
                topDebtors: topDebtors.map(d => ({ name: d.name, balance: Math.round(Number(d.balance)), phone: d.phone })),
                lowStockCount: lowStockItems.length,
                lowStockItems: lowStockItems.map(s => ({ name: s.product.name, stock: s.stock, minStock: s.minStock })),
                totalExpenses: Math.round(totalExpenses),
                generatedAt: now.toISOString(),
            },
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}

function buildFallbackGreeting(
    todayRevenue: number, yesterdayRevenue: number, growthPct: number,
    todayOrders: number, debtorCount: number, lowStockCount: number, now: Date
): string {
    const hour = now.getHours();
    const salutation = hour < 12 ? "🌅 Bonjour !" : hour < 18 ? "☀️ Bon après-midi !" : "🌙 Bonsoir !";
    const growthText = growthPct > 0
        ? `📈 Le CA est en hausse de +${growthPct}% par rapport à hier.`
        : growthPct < 0
        ? `📉 Le CA est en baisse de ${Math.abs(growthPct)}% vs hier — زيد شوية.`
        : `📊 CA stable par rapport à hier.`;
    const lines = [
        `${salutation} ${todayRevenue.toLocaleString("fr-FR")} DA réalisés en ${todayOrders} commandes aujourd'hui.`,
        growthText,
    ];
    if (debtorCount > 0) lines.push(`⚠️ ${debtorCount} clients avec créances en attente — pensez à relancer.`);
    if (lowStockCount > 0) lines.push(`📦 ${lowStockCount} produits en stock critique — commander dès que possible.`);
    lines.push("Bonne journée et bon courage ! 💪 ربي يعاونك");
    return lines.join("\n");
}
