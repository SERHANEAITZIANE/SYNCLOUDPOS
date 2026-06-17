const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    console.log("Starting stock recalculation for AIRPODS...");
    
    // 1. Get the product AIRPODS QUALEV NINE
    const product = await db.product.findFirst({
        where: { name: { contains: "AIRPODS QUALEV NINE", mode: "insensitive" } },
        include: { storeProducts: true }
    });

    if (!product) {
        console.log("Product not found");
        return;
    }

    console.log("Found product:", product.name);
    console.log("Current global stock:", product.stock);
    console.log("Current store stock:", product.storeProducts[0]?.stock);

    // Sum PO items
    const poItems = await db.purchaseOrderItem.findMany({
        where: { productId: product.id, purchaseOrder: { status: { in: ["BON_LIVRAISON", "FACTURE", "COMPLETED"] } } }
    });
    const poSum = poItems.reduce((acc, item) => acc + item.quantity, 0);

    // Sum SO items
    const soItems = await db.salesOrderItem.findMany({
        where: { productId: product.id, salesOrder: { status: { in: ["VALIDATED", "PAID"] } } }
    });
    const soSum = soItems.reduce((acc, item) => acc + item.quantity, 0);

    // Sum Client Returns
    const returns = await db.productReturn.findMany({
        where: { productId: product.id, status: "COMPLETED" }
    });
    const returnSum = returns.reduce((acc, item) => acc + item.quantity, 0);

    // Sum Supplier Returns
    const supReturns = await db.supplierReturn.findMany({
        where: { productId: product.id, status: "COMPLETED" }
    });
    const supReturnSum = supReturns.reduce((acc, item) => acc + item.quantity, 0);

    // Sum Manual Adjustments
    const manualAdjs = await db.stockMovement.findMany({
        where: { productId: product.id, type: "MANUAL_ADJUSTMENT" }
    });
    const manualSum = manualAdjs.reduce((acc, item) => acc + item.quantity, 0);

    // Fallback: if no manual sum, assume initial stock was from product.stock (before any orders)
    // Wait, if manualSum is 0 but there is initial stock, how do we know?
    // Let's just output the math first.
    const trueStock = manualSum + poSum - soSum + returnSum - supReturnSum;

    console.log("--- MATH ---");
    console.log(`PO: +${poSum}`);
    console.log(`SO: -${soSum}`);
    console.log(`Returns: +${returnSum}`);
    console.log(`Supplier Returns: -${supReturnSum}`);
    console.log(`Manual Adjustments (Initial): +${manualSum}`);
    console.log("Calculated Stock:", trueStock);

    // Update stock
    await db.product.update({
        where: { id: product.id },
        data: { stock: trueStock }
    });

    if (product.storeProducts[0]) {
        await db.storeProduct.update({
            where: { storeId_productId: { storeId: product.storeProducts[0].storeId, productId: product.id } },
            data: { stock: trueStock }
        });
    }

    console.log("Stock updated successfully to:", trueStock);
}

main().finally(() => db.$disconnect());
