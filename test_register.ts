import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = `test_${Date.now()}@test.com`;
    const password = "password123";
    const name = "Test";
    const phone = "123456789";

    const hashedPassword = await bcrypt.hash(password, 10);

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    try {
        const tenant = await prisma.tenant.create({
            data: {
                name: `${name}'s Shop`,
                phone: phone,
                subscriptionEndsAt: trialEndDate,
            }
        });

        await prisma.user.create({
            data: {
                name,
                email,
                phone,
                password: hashedPassword,
                tenantId: tenant.id,
                role: "ADMIN"
            },
        });

        // Seed default accounts and customer
        await Promise.all([
            prisma.treasuryAccount.createMany({
                data: [
                    { name: "CAISSE PRINCIPALE", type: "CAISSE", tenantId: tenant.id },
                    { name: "CAISSE SECONDAIRE", type: "CAISSE", tenantId: tenant.id },
                    { name: "TPE", type: "BANK", tenantId: tenant.id }
                ]
            }),
            prisma.customer.create({
                data: {
                    name: "DIVERS",
                    clientType: "RETAIL",
                    tenantId: tenant.id
                }
            })
        ]);

        console.log("Success! Registration completed without errors.");
    } catch (e) {
        console.error("Registration test failed with error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
