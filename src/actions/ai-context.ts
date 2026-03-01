"use server";

import { db } from "@/lib/db";
import { getActiveTenantId } from "@/actions/get-active-tenant";

export async function getBusinessContext(): Promise<string> {
  const tenantId = await getActiveTenantId();
  if (!tenantId) return "Aucune boutique active trouvée.";

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

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
    // POS Orders this month (model: Order)
    db.order.aggregate({
      where: { tenantId, createdAt: { gte: startOfMonth }, status: "COMPLETED" },
      _sum: { total: true },
      _count: { id: true },
    }),
    // Sales Orders (BL) this month
    db.salesOrder.aggregate({
      where: { tenantId, createdAt: { gte: startOfMonth } },
      _sum: { total: true },
      _count: { id: true },
    }),
    // Top products by revenue (via OrderItems)
    db.orderItem.groupBy({
      by: ["productId"],
      where: { order: { tenantId, createdAt: { gte: startOfMonth }, status: "COMPLETED" } },
      _sum: { total: true, quantity: true },
      orderBy: { _sum: { total: "desc" } },
      take: 10,
    }),
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
    db.product.count({ where: { tenantId, stock: { lte: 0 } } }),
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
    // Expenses this month
    db.expense.aggregate({
      where: { tenantId, date: { gte: startOfMonth } },
      _sum: { amount: true },
      _count: { id: true },
    }),
    // Purchase orders this month
    db.purchaseOrder.aggregate({
      where: { tenantId, createdAt: { gte: startOfMonth } },
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
    select: { id: true, name: true, stock: true },
  });
  const productMap = new Map(products.map(p => [p.id, p]));

  const topProductLines = topOrderItems.map(p => {
    const prod = productMap.get(p.productId!);
    return `  - ${prod?.name ?? "Inconnu"}: ${Number(p._sum.total ?? 0).toFixed(2)} DA (Qté: ${p._sum.quantity ?? 0}, Stock restant: ${prod?.stock ?? "?"})`;
  }).join("\n");

  const lowStockLines = lowStockProducts.map(p =>
    `  - ${p.name}: stock actuel=${p.stock}, seuil min=${p.minStock}`
  ).join("\n");

  const debtorLines = topDebtors.map(c =>
    `  - ${c.name}: ${Number(c.balance).toFixed(2)} DA`
  ).join("\n");

  const context = `
=== CONTEXTE BUSINESS — ${now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} ===

📊 VENTES POS DU MOIS:
  - Chiffre d'affaires: ${Number(posOrders._sum.total ?? 0).toFixed(2)} DA
  - Nombre de commandes: ${posOrders._count.id}

📋 BONS DE LIVRAISON (BL) DU MOIS:
  - Montant total: ${Number(salesOrders._sum.total ?? 0).toFixed(2)} DA
  - Nombre de BLs: ${salesOrders._count.id}

🏆 TOP 10 PRODUITS PAR CHIFFRE D'AFFAIRES (mois en cours):
${topProductLines || "  Aucune vente ce mois"}

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

💸 DÉPENSES DU MOIS:
  - Montant total: ${Number(expenses._sum.amount ?? 0).toFixed(2)} DA
  - Nombre de dépenses: ${expenses._count.id}

🛒 ACHATS DU MOIS:
  - Montant total: ${Number(purchases._sum.total ?? 0).toFixed(2)} DA
  - Nombre de bons d'achat: ${purchases._count.id}

🗂️ CATALOGUE:
  - Catégories de produits: ${categoryCount}

=== FIN DU CONTEXTE ===
`.trim();

  return context;
}
