import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

        // Gather business data in parallel
        const [
            todaySales, yesterdaySales, topDebtors,
            lowStockItems, pendingExpenses, topProducts
        ] = await Promise.all([
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
                where: { tenantId, stock: { lte: db.storeProduct.fields.minStock } },
                take: 5,
                include: { product: { select: { name: true } } },
            }),
            db.expense.findMany({
                where: { tenantId, createdAt: { gte: startOfToday } },
                select: { amount: true, category: true },
            }),
            db.salesOrderItem.groupBy({
                by: ["productId"],
                where: { salesOrder: { tenantId, createdAt: { gte: startOfYesterday }, status: { in: ["VALIDATED", "PAID"] } } },
                _sum: { total: true, quantity: true },
                orderBy: { _sum: { total: "desc" } },
                take: 3,
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

        // Build context for AI
        const businessContext = `
Tu es le conseiller d'affaires IA de SynCloudPOS pour un gérant en Algérie.
Il est ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} le ${now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}.

SITUATION ACTUELLE:
- CA d'aujourd'hui: ${todayRevenue.toLocaleString("fr-FR")} DA (${todayOrders} commandes)
- CA d'hier: ${yesterdayRevenue.toLocaleString("fr-FR")} DA
- Croissance: ${growthPct > 0 ? "+" : ""}${growthPct}%
- Dépenses d'aujourd'hui: ${totalExpenses.toLocaleString("fr-FR")} DA
- Créances clients: ${totalDebt.toLocaleString("fr-FR")} DA (top 3: ${topDebtors.map(d => `${d.name} ${Number(d.balance).toLocaleString("fr-FR")}DA`).join(", ") || "aucun"})
- Produits en rupture/stock bas: ${lowStockItems.length} références

Donne un briefing matinal court (4-5 lignes max) en MÉLANGE français/darija algérienne.
Commence par une salutation chaleureuse, résume la situation, donne 2-3 conseils pratiques.
Sois direct, concret, utilise des emojis. Parle comme un conseiller de confiance.
        `.trim();

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(businessContext);
        const aiText = result.response.text();

        return NextResponse.json({
            greeting: aiText,
            data: {
                todayRevenue,
                yesterdayRevenue,
                growthPct,
                todayOrders,
                totalDebt,
                debtorCount: topDebtors.length,
                topDebtors: topDebtors.map(d => ({ name: d.name, balance: Math.round(Number(d.balance)), phone: d.phone })),
                lowStockCount: lowStockItems.length,
                lowStockItems: lowStockItems.map(s => ({ name: s.product.name, stock: s.stock, minStock: s.minStock })),
                totalExpenses,
                generatedAt: now.toISOString(),
            },
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
