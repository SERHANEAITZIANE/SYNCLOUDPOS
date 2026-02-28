import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
    const email = 'xm@live.fr';
    console.log(`Bypass: Recherche de l'utilisateur ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: { tenant: true }
    });

    if (!user) {
        console.error(`Erreur: Utilisateur ${email} introuvable.`);
        process.exit(1);
    }

    const tenantId = user.tenantId;
    const userId = user.id;

    console.log(`✔ Utilisateur trouvé. Tenant ID: ${tenantId}`);

    // 1. Create 1,000 Suppliers
    console.log('Création de 1,000 fournisseurs...');
    const suppliersData = [];
    for (let i = 0; i < 1000; i++) {
        suppliersData.push({
            id: uuidv4(),
            name: `Fournisseur TEST ${i}`,
            tenantId,
            balance: 0,
            phone: `055500${String(i).padStart(4, '0')}`
        });
    }
    await prisma.supplier.createMany({ data: suppliersData });
    console.log('✔ 1,000 fournisseurs créés.');

    // 2. Create 2,000 Customers
    console.log('Création de 2,000 clients...');
    const customersData = [];
    for (let i = 0; i < 2000; i++) {
        customersData.push({
            id: uuidv4(),
            name: `Client TEST ${i}`,
            tenantId,
            balance: 0,
            phone: `066600${String(i).padStart(4, '0')}`
        });
    }
    await prisma.customer.createMany({ data: customersData });
    console.log('✔ 2,000 clients créés.');

    // 3. Create 10,000 Products
    console.log('Création de 10,000 produits (en lots de 2,000)...');
    const productIds: string[] = [];
    for (let batch = 0; batch < 5; batch++) {
        const productsData = [];
        for (let i = 0; i < 2000; i++) {
            const pid = uuidv4();
            productIds.push(pid);
            productsData.push({
                id: pid,
                name: `Produit TEST Volume ${batch * 2000 + i}`,
                price: 150 + (i % 100) * 10,
                cost: 100 + (i % 100) * 5,
                stock: 500,
                tenantId
            });
        }
        await prisma.product.createMany({ data: productsData });
        console.log(`   - Lot ${batch + 1}/5 inséré.`);
    }
    console.log('✔ 10,000 produits créés.');

    // 4. Create 1,000,000 Orders and OrderItems
    console.log('Création de 1,000,000 de ventes (en lots de 10,000)... cela va prendre quelques minutes.');
    const totalSales = 1000000;
    const batchSize = 10000;
    const loops = totalSales / batchSize;

    for (let batch = 0; batch < loops; batch++) {
        const ordersData = [];
        const orderItemsData = [];

        // randomly distribute dates over the last 365 days
        const now = new Date();

        for (let i = 0; i < batchSize; i++) {
            const orderId = uuidv4();
            const randomDaysAgo = Math.floor(Math.random() * 365);
            const createdAt = new Date(now.getTime() - randomDaysAgo * 24 * 60 * 60 * 1000);

            const randomProductIndex = Math.floor(Math.random() * productIds.length);
            const productId = productIds[randomProductIndex];
            const quantity = Math.floor(Math.random() * 5) + 1;
            const price = 150; // Approximated
            const total = quantity * price;

            ordersData.push({
                id: orderId,
                total,
                paidAmount: total,
                status: "COMPLETED",
                userId,
                tenantId,
                createdAt,
                updatedAt: createdAt
            });

            orderItemsData.push({
                id: uuidv4(),
                orderId,
                productId,
                quantity,
                price
            });
        }

        // Insert orders first, then items
        await prisma.order.createMany({ data: ordersData });
        await prisma.orderItem.createMany({ data: orderItemsData });

        if ((batch + 1) % 10 === 0) {
            console.log(`   - ${(batch + 1) * batchSize} ventes insérées (${Math.round(((batch + 1) / loops) * 100)}%)...`);
        }
    }

    console.log('✔ 1,000,000 de ventes créées avec succès !');
    console.log('Génération de volume terminée. Testez la plateforme maintenant.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
