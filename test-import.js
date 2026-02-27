const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
    console.log("Reading backup JSON...");
    const data = fs.readFileSync('c:\\Users\\tre\\Downloads\\backup_syncloudpos_2026-02-27.json', 'utf8');
    const body = JSON.parse(data);

    // We assume the first user is testing it
    const tenantId = body.id; // It's a Tenant object exported

    console.log("Starting import for tenant:", tenantId);

    try {
        await prisma.$transaction(async (tx) => {
            console.log("1. CLEARING CURRENT DATA");
            await tx.treasuryTransaction.deleteMany({ where: { tenantId } });
            await tx.salesOrderItem.deleteMany({ where: { salesOrder: { tenantId } } });
            await tx.salesOrder.deleteMany({ where: { tenantId } });
            await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { tenantId } } });
            await tx.purchaseOrder.deleteMany({ where: { tenantId } });
            await tx.orderItem.deleteMany({ where: { order: { tenantId } } });
            await tx.order.deleteMany({ where: { tenantId } });
            await tx.expense.deleteMany({ where: { tenantId } });
            await tx.expenseCategory.deleteMany({ where: { tenantId } });
            await tx.treasuryAccount.deleteMany({ where: { tenantId } });

            await tx.image.deleteMany({ where: { product: { tenantId } } });
            await tx.barcode.deleteMany({ where: { product: { tenantId } } });

            await tx.product.deleteMany({ where: { tenantId } });
            await tx.category.deleteMany({ where: { tenantId } });
            await tx.brand.deleteMany({ where: { tenantId } });
            await tx.customer.deleteMany({ where: { tenantId } });
            await tx.supplier.deleteMany({ where: { tenantId } });

            console.log("2. INSERTING NEW DATA");
            const safeArray = (arr) => Array.isArray(arr) ? arr : [];

            if (safeArray(body.categories).length > 0) await tx.category.createMany({ data: body.categories });
            if (safeArray(body.brands).length > 0) await tx.brand.createMany({ data: body.brands });
            if (safeArray(body.customers).length > 0) await tx.customer.createMany({ data: body.customers });
            if (safeArray(body.suppliers).length > 0) await tx.supplier.createMany({ data: body.suppliers });
            if (safeArray(body.treasuryAccounts).length > 0) await tx.treasuryAccount.createMany({ data: body.treasuryAccounts });
            if (safeArray(body.expenseCategories).length > 0) await tx.expenseCategory.createMany({ data: body.expenseCategories });

            const products = safeArray(body.products);
            const pureProducts = products.map((p) => {
                const { images, barcodes, ...rest } = p;
                return rest;
            });
            if (pureProducts.length > 0) await tx.product.createMany({ data: pureProducts });

            const allImages = products.flatMap((p) => safeArray(p.images));
            const allBarcodes = products.flatMap((p) => safeArray(p.barcodes));
            if (allImages.length > 0) await tx.image.createMany({ data: allImages });
            if (allBarcodes.length > 0) await tx.barcode.createMany({ data: allBarcodes });

            if (safeArray(body.expenses).length > 0) await tx.expense.createMany({ data: body.expenses });
            if (safeArray(body.treasuryTransactions).length > 0) await tx.treasuryTransaction.createMany({ data: body.treasuryTransactions });

            const salesOrders = safeArray(body.salesOrders);
            const pureSalesOrders = salesOrders.map((o) => { const { items, ...rest } = o; return rest; });
            const allSalesItems = salesOrders.flatMap((o) => safeArray(o.items));
            if (pureSalesOrders.length > 0) await tx.salesOrder.createMany({ data: pureSalesOrders });
            if (allSalesItems.length > 0) await tx.salesOrderItem.createMany({ data: allSalesItems });

            const purchaseOrders = safeArray(body.purchaseOrders);
            const purePO = purchaseOrders.map((o) => { const { items, ...rest } = o; return rest; });
            const allPOItems = purchaseOrders.flatMap((o) => safeArray(o.items));
            if (purePO.length > 0) await tx.purchaseOrder.createMany({ data: purePO });
            if (allPOItems.length > 0) await tx.purchaseOrderItem.createMany({ data: allPOItems });

            const orders = safeArray(body.orders);
            const pureOrders = orders.map((o) => { const { items, ...rest } = o; return rest; });
            const allOrderItems = orders.flatMap((o) => safeArray(o.items));
            if (pureOrders.length > 0) await tx.order.createMany({ data: pureOrders });
            if (allOrderItems.length > 0) await tx.orderItem.createMany({ data: allOrderItems });

            if (body.name || body.address) {
                const { users, tenantUsers, categories, brands, products, customers, suppliers, expenseCategories, expenses, treasuryAccounts, treasuryTransactions, salesOrders, purchaseOrders, orders, ...tenantMeta } = body;
                await tx.tenant.update({
                    where: { id: tenantId },
                    data: tenantMeta
                });
            }
            console.log("3. IMPORT SUCCESSFUL");
        }, {
            maxWait: 5000,
            timeout: 10000,
        });
    } catch (e) {
        console.error("PRISMA IMPORT ERROR:", e);
    }
}

main().finally(() => prisma.$disconnect());
