"use server";

import { db } from "@/lib/db";
import { getActiveTenantId } from "@/actions/get-active-tenant";

export async function getBusinessContext(startDate?: Date, endDate?: Date): Promise<string> {
  const tenantId = await getActiveTenantId();
  if (!tenantId) return "Aucune boutique active trouvée.";

  const now = new Date();

  // Custom range or default to start of month
  const queryStartDate = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
  const queryEndDate = endDate || now;

  const [
    posOrders,
    salesOrders,
    topOrderItems,
    lowStockProducts,
    outOfStockCount,
    customers,
    topDebtors,
    suppliers,
    expenses,
    purchases,
    categoryCount,
  ] = await Promise.all([
    // POS Orders this period (model: Order)
    db.order.aggregate({
      where: {
        tenantId,
        createdAt: { gte: queryStartDate, lte: queryEndDate },
        status: "COMPLETED"
      },
      _sum: { total: true },
      _count: { id: true },
    }),
    // Sales Orders (BL) this period
    db.salesOrder.aggregate({
      where: {
        tenantId,
        createdAt: { gte: queryStartDate, lte: queryEndDate }
      },
      _sum: { total: true },
      _count: { id: true },
    }),
    // Top products by revenue (via OrderItems) — use raw SQL since total is not a stored field
    db.$queryRaw<{ productId: string; revenue: number; totalQty: number, cogs: number }[]>`
            SELECT oi."productId", SUM(oi.quantity * oi.price)::float AS revenue, SUM(oi.quantity)::int AS "totalQty", SUM(oi.quantity * oi."purchasePrice")::float AS cogs
            FROM "OrderItem" oi
            INNER JOIN "Order" o ON o.id = oi."orderId"
            WHERE o."tenantId" = ${tenantId}
              AND o."createdAt" >= ${queryStartDate}
              AND o."createdAt" <= ${queryEndDate}
              AND o.status = 'COMPLETED'
            GROUP BY oi."productId"
            ORDER BY revenue DESC
            LIMIT 10
        `,
    // Low stock products (below min stock)
    db.$queryRaw<{ name: string; stock: number; minStock: number }[]>`
            SELECT name, stock, "minStock"
            FROM "Product"
            WHERE "tenantId" = ${tenantId}
              AND stock > 0
              AND stock < "minStock"
            ORDER BY stock ASC
            LIMIT 10
        `,
    // Out of stock count
    db.product.count({ where: { tenantId, isArchived: false, storeProducts: { some: { stock: { lte: 0 } } } } }),
    // Customer summary
    db.customer.aggregate({
      where: { tenantId },
      _count: { id: true },
      _sum: { balance: true },
    }),
    // Top debtors
    db.customer.findMany({
      where: { tenantId, balance: { lt: 0 } },
      orderBy: { balance: "asc" },
      take: 5,
      select: { name: true, balance: true },
    }),
    // Supplier summary
    db.supplier.aggregate({
      where: { tenantId },
      _count: { id: true },
      _sum: { balance: true },
    }),
    // Expenses this period
    db.expense.aggregate({
      where: {
        tenantId,
        date: { gte: queryStartDate, lte: queryEndDate }
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    // Purchase orders this period
    db.purchaseOrder.aggregate({
      where: {
        tenantId,
        createdAt: { gte: queryStartDate, lte: queryEndDate }
      },
      _sum: { total: true },
      _count: { id: true },
    }),
    // Categories
    db.category.count({ where: { tenantId } }),
  ]);

  // Resolve top product names
  const productIds = topOrderItems.map(p => p.productId).filter(Boolean) as string[];
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, storeProducts: true },
  });
  const productMap = new Map(products.map(p => [p.id, p]));

  let totalRevenue = Number(posOrders._sum.total ?? 0) + Number(salesOrders._sum.total ?? 0);
  let totalCogsItems = 0;

  const topProductLines = topOrderItems.map(p => {
    const prod = productMap.get(p.productId);
    totalCogsItems += p.cogs || 0;
    const itemProfit = (p.revenue || 0) - (p.cogs || 0);
    const stock = prod?.storeProducts.reduce((sum, sp) => sum + sp.stock, 0) ?? "?";
    return `  - ${prod?.name ?? "Inconnu"}: ${Number(p.revenue ?? 0).toFixed(2)} DA (Bénéfice Brut: ${itemProfit.toFixed(2)} DA | Qté: ${p.totalQty ?? 0}, Stock restant: ${stock})`;
  }).join("\n");

  // Rough estimate of gross profit: revenue - cogs
  // Net profit: gross profit - expenses
  const totalExpenses = Number(expenses._sum.amount ?? 0);
  const grossProfitEst = totalRevenue - totalCogsItems;
  const netProfitEst = grossProfitEst - totalExpenses;

  const lowStockLines = lowStockProducts.map(p =>
    `  - ${p.name}: stock actuel = ${p.stock}, seuil min = ${p.minStock} `
  ).join("\n");

  const debtorLines = topDebtors.map(c =>
    `  - ${c.name}: ${Number(c.balance).toFixed(2)} DA`
  ).join("\n");

  const context = `
=== CONTEXTE BUSINESS — Période: ${queryStartDate.toLocaleDateString("fr-FR")} au ${queryEndDate.toLocaleDateString("fr-FR")} ===

📈 BÉNÉFICES ET RENTABILITÉ DE LA PÉRIODE:
  - Chiffre d'affaires total (POS + BL): ${totalRevenue.toFixed(2)} DA
  - Coût d'achat des marchandises vendues (COGS): ${totalCogsItems.toFixed(2)} DA
  - Bénéfice Brut estimé (Marge sur ventes): ${grossProfitEst.toFixed(2)} DA
  - Dépenses totales de la période: ${totalExpenses.toFixed(2)} DA
  - Bénéfice Net estimé (Brut - Dépenses): ${netProfitEst.toFixed(2)} DA

📊 VENTES POS:
  - Chiffre d'affaires: ${Number(posOrders._sum.total ?? 0).toFixed(2)} DA
  - Nombre de commandes: ${posOrders._count.id}

📋 BONS DE LIVRAISON (BL):
  - Montant total: ${Number(salesOrders._sum.total ?? 0).toFixed(2)} DA
  - Nombre de BLs: ${salesOrders._count.id}

🏆 TOP 10 PRODUITS PAR CHIFFRE D'AFFAIRES:
${topProductLines || "  Aucune vente sur cette période"}

📦 STOCKS:
  - Produits en rupture de stock: ${outOfStockCount}
  - Produits sous stock minimum:
${lowStockLines || "  Aucun produit sous le seuil"}

👥 CLIENTS:
  - Nombre total: ${customers._count.id}
  - Solde total dû par les clients: ${Number(customers._sum.balance ?? 0).toFixed(2)} DA
  - Top débiteurs (balance négative = client doit de l'argent):
${debtorLines || "  Aucun débiteur"}

🚚 FOURNISSEURS:
  - Nombre total: ${suppliers._count.id}
  - Montant total dû aux fournisseurs: ${Number(suppliers._sum.balance ?? 0).toFixed(2)} DA

💸 DÉPENSES:
  - Montant total: ${Number(expenses._sum.amount ?? 0).toFixed(2)} DA
  - Nombre de dépenses: ${expenses._count.id}

🛒 ACHATS:
  - Montant total: ${Number(purchases._sum.total ?? 0).toFixed(2)} DA
  - Nombre de bons d'achat: ${purchases._count.id}

🗂️ CATALOGUE:
  - Catégories de produits: ${categoryCount}

=== FIN DU CONTEXTE ===
`.trim();

  return context;
}
