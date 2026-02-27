import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // @ts-expect-error custom property
        if (session.user.role !== "ADMIN" && !session.user.isSuperadmin) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const currentUser = await db.user.findUnique({
            where: { id: session.user.id },
            select: { tenantId: true }
        });

        if (!currentUser?.tenantId) {
            return new NextResponse("No tenant found", { status: 404 });
        }

        const tenantId = currentUser.tenantId;

        const body = await req.json();

        // Validate basic structure
        if (!body || typeof body !== 'object') {
            return new NextResponse("Invalid backup structure", { status: 400 });
        }

        // We run the restore in a transaction to prevent partial state
        await db.$transaction(async (tx) => {
            // --- 1. CLEAR CURRENT TENANT DATA ---
            // Order of deletion matters to respect foreign keys (even if somewhat cascade)
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

            // Delete product child entities
            await tx.image.deleteMany({ where: { product: { tenantId } } });
            await tx.barcode.deleteMany({ where: { product: { tenantId } } });

            await tx.product.deleteMany({ where: { tenantId } });
            await tx.category.deleteMany({ where: { tenantId } });
            await tx.brand.deleteMany({ where: { tenantId } });
            await tx.customer.deleteMany({ where: { tenantId } });
            await tx.supplier.deleteMany({ where: { tenantId } });

            // Note: We do NOT delete Tenant, User or TenantUser

            // --- 2. INSERT BACKUP DATA ---
            // Helper function to safely map and sanitize arrays from JSON
            const safeArray = (arr: any) => Array.isArray(arr) ? arr : [];

            // Insert Base Entities
            if (safeArray(body.categories).length > 0) await tx.category.createMany({ data: body.categories });
            if (safeArray(body.brands).length > 0) await tx.brand.createMany({ data: body.brands });
            if (safeArray(body.customers).length > 0) await tx.customer.createMany({ data: body.customers });
            if (safeArray(body.suppliers).length > 0) await tx.supplier.createMany({ data: body.suppliers });
            if (safeArray(body.treasuryAccounts).length > 0) await tx.treasuryAccount.createMany({ data: body.treasuryAccounts });
            if (safeArray(body.expenseCategories).length > 0) await tx.expenseCategory.createMany({ data: body.expenseCategories });

            // Insert Products (without relations in createMany)
            const products = safeArray(body.products);
            const pureProducts = products.map((p: any) => {
                const { images, barcodes, ...rest } = p;
                return rest;
            });
            if (pureProducts.length > 0) await tx.product.createMany({ data: pureProducts });

            // Re-attach product children
            const allImages = products.flatMap((p: any) => safeArray(p.images));
            const allBarcodes = products.flatMap((p: any) => safeArray(p.barcodes));
            if (allImages.length > 0) await tx.image.createMany({ data: allImages });
            if (allBarcodes.length > 0) await tx.barcode.createMany({ data: allBarcodes });

            // Insert Orders and complex tree items
            // Expenses
            if (safeArray(body.expenses).length > 0) await tx.expense.createMany({ data: body.expenses });

            // Treasury transactions
            if (safeArray(body.treasuryTransactions).length > 0) await tx.treasuryTransaction.createMany({ data: body.treasuryTransactions });

            // Sales Orders
            const salesOrders = safeArray(body.salesOrders);
            const pureSalesOrders = salesOrders.map((o: any) => { const { items, ...rest } = o; return rest; });
            const allSalesItems = salesOrders.flatMap((o: any) => safeArray(o.items));
            if (pureSalesOrders.length > 0) await tx.salesOrder.createMany({ data: pureSalesOrders });
            if (allSalesItems.length > 0) await tx.salesOrderItem.createMany({ data: allSalesItems });

            // Purchase Orders
            const purchaseOrders = safeArray(body.purchaseOrders);
            const purePO = purchaseOrders.map((o: any) => { const { items, ...rest } = o; return rest; });
            const allPOItems = purchaseOrders.flatMap((o: any) => safeArray(o.items));
            if (purePO.length > 0) await tx.purchaseOrder.createMany({ data: purePO });
            if (allPOItems.length > 0) await tx.purchaseOrderItem.createMany({ data: allPOItems });

            // Standard Orders (POS transactions)
            const orders = safeArray(body.orders);
            const pureOrders = orders.map((o: any) => { const { items, ...rest } = o; return rest; });
            const allOrderItems = orders.flatMap((o: any) => safeArray(o.items));
            if (pureOrders.length > 0) await tx.order.createMany({ data: pureOrders });
            if (allOrderItems.length > 0) await tx.orderItem.createMany({ data: allOrderItems });

            // Update original tenant info if present (optional)
            if (body.name || body.address) {
                const { users, tenantUsers, categories, brands, products, customers, suppliers, expenseCategories, expenses, treasuryAccounts, treasuryTransactions, salesOrders, purchaseOrders, orders, ...tenantMeta } = body;
                await tx.tenant.update({
                    where: { id: tenantId },
                    data: tenantMeta
                });
            }

        }, {
            maxWait: 5000,
            timeout: 10000,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[BACKUP_IMPORT_ERROR]", error);
        return new NextResponse("Internal server error or invalid data format", { status: 500 });
    }
}
