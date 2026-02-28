import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const db = new PrismaClient();

async function main() {
    console.log('Starting seed for Eissam Store...');

    // 1. Get or create Tenant
    const tenantName = 'eissam store';
    let tenant = await db.tenant.findFirst({ where: { name: tenantName } });
    if (!tenant) {
        tenant = await db.tenant.create({ data: { name: tenantName, id: uuidv4() } });
    }

    // Get admin user just to link orders to a user
    let user = await db.user.findFirst({ where: { role: 'SUPERADMIN' } });
    if (!user) throw new Error("No superadmin found");

    const tenantId = tenant.id;
    const userId = user.id;

    // Link user to this tenant so they can view it in the UI
    await db.tenantUser.upsert({
        where: { userId_tenantId: { userId, tenantId } },
        update: {},
        create: { userId, tenantId, role: 'ADMIN' }
    });

    // 2. Generate 10,000 Products
    console.log('Generating 10,000 products...');
    const products: any[] = [];
    for (let i = 0; i < 10000; i++) {
        products.push({
            id: uuidv4(),
            name: `Product ${i} Eissam`,
            price: Math.floor(Math.random() * 100) + 10,
            cost: Math.floor(Math.random() * 50) + 5,
            stock: 1000000,
            tenantId
        });
    }

    // Insert products in chunks of 5000
    for (let i = 0; i < products.length; i += 5000) {
        await db.product.createMany({ data: products.slice(i, i + 5000) });
    }

    // 3. Generate 1,000 Customers
    console.log('Generating 1,000 customers...');
    const customers: any[] = [];
    for (let i = 0; i < 1000; i++) {
        customers.push({
            id: uuidv4(),
            name: `Customer ${i} Eissam`,
            phone: `05${Math.floor(Math.random() * 100000000)}`, // Algerian number format
            tenantId
        });
    }

    // Insert customers
    await db.customer.createMany({ data: customers });

    // 4. Generate 1,000,000 Orders
    console.log('Generating 1,000,000 orders...');

    const BATCH_SIZE = 50000;
    const TOTAL_ORDERS = 1000000;

    for (let b = 0; b < TOTAL_ORDERS / BATCH_SIZE; b++) {
        console.log(`Processing batch ${b + 1} / ${TOTAL_ORDERS / BATCH_SIZE}...`);
        const ordersToInsert: any[] = [];
        const orderItemsToInsert: any[] = [];

        // Spread orders over the last 365 days
        const baseTime = new Date().getTime() - (365 * 24 * 60 * 60 * 1000);
        const timeSpan = 365 * 24 * 60 * 60 * 1000;

        for (let i = 0; i < BATCH_SIZE; i++) {
            const orderId = uuidv4();
            const randomCustomer = customers[Math.floor(Math.random() * customers.length)];

            const numItems = Math.floor(Math.random() * 3) + 1; // 1 to 3 items per ticket
            let orderTotal = 0;

            for (let j = 0; j < numItems; j++) {
                const randomProduct = products[Math.floor(Math.random() * products.length)];
                const qty = Math.floor(Math.random() * 3) + 1;
                const linePrice = randomProduct.price * qty;
                orderTotal += linePrice;

                orderItemsToInsert.push({
                    id: uuidv4(),
                    orderId,
                    productId: randomProduct.id,
                    quantity: qty,
                    price: randomProduct.price
                });
            }

            const randomTime = baseTime + Math.random() * timeSpan;

            ordersToInsert.push({
                id: orderId,
                total: orderTotal,
                paidAmount: orderTotal,
                status: 'COMPLETED',
                userId,
                customerId: randomCustomer.id,
                tenantId,
                createdAt: new Date(randomTime),
                updatedAt: new Date(randomTime)
            });
        }

        // Insert to DB using Prisma
        // Orders first
        for (let i = 0; i < ordersToInsert.length; i += 10000) {
            await db.order.createMany({ data: ordersToInsert.slice(i, i + 10000) });
        }
        // Then their items
        for (let i = 0; i < orderItemsToInsert.length; i += 10000) {
            await db.orderItem.createMany({ data: orderItemsToInsert.slice(i, i + 10000) });
        }

        // Minimal explicit cleanup
        ordersToInsert.length = 0;
        orderItemsToInsert.length = 0;
    }

    console.log('Seeding complete! 1M orders added to Eissam store.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
