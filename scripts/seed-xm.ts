import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
    console.log('Upserting user xm@live.fr...');

    const email = 'xm@live.fr';
    const password = 'admin'; // Default password if created
    const hashedPassword = await bcrypt.hash(password, 10);
    const tenantId = 'default-tenant-id';

    const tenant = await db.tenant.upsert({
        where: { id: tenantId },
        update: {},
        create: { name: 'Default Tenant', id: tenantId },
    });

    const user = await db.user.upsert({
        where: { email },
        update: {
            role: 'SUPERADMIN',
            isSuperadmin: true
        },
        create: {
            email,
            password: hashedPassword,
            name: 'XM Superadmin',
            role: 'SUPERADMIN',
            isSuperadmin: true,
            tenantId: tenant.id
        }
    });

    await db.tenantUser.upsert({
        where: {
            userId_tenantId: {
                userId: user.id,
                tenantId: tenant.id
            }
        },
        update: {
            role: 'SUPERADMIN'
        },
        create: {
            userId: user.id,
            tenantId: tenant.id,
            role: 'SUPERADMIN'
        }
    });

    console.log(`Success! User ${user.email} is now a superadmin.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
