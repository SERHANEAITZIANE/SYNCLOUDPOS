import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function test() {
    const tenantId = 'some-tenant-id'; // I need a real tenant ID
    const tenants = await db.tenant.findMany();
    if (tenants.length === 0) {
        console.log("No tenants");
        return;
    }
    const t = tenants[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    try {
        const topOrderItems = await db.$queryRaw`
            SELECT oi."productId", SUM(oi.quantity * oi.price)::float AS revenue, SUM(oi.quantity)::int AS "totalQty"
            FROM "OrderItem" oi
            INNER JOIN "Order" o ON o.id = oi."orderId"
            WHERE o."tenantId" = ${t.id}
              AND o."createdAt" >= ${startOfMonth}
              AND o.status = 'COMPLETED'
            GROUP BY oi."productId"
            ORDER BY revenue DESC
            LIMIT 10
        `;
        console.log("topOrderItems", topOrderItems);

        const lowStockProducts = await db.$queryRaw`
            SELECT name, stock, "minStock"
            FROM "Product"
            WHERE "tenantId" = ${t.id}
              AND stock > 0
              AND stock < "minStock"
            ORDER BY stock ASC
            LIMIT 10
        `;
        console.log("lowStockProducts", lowStockProducts);

    } catch (e) {
        console.error("Error", e);
    }
}

test().finally(() => db.$disconnect());
