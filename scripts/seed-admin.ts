import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
    console.log('Seeding default admin user...');

    // 1. Create or get default Tenant
    const tenantName = 'Default Tenant';
    const tenant = await db.tenant.upsert({
        where: { id: 'default-tenant-id' }, // Assuming we can force an ID or find by name. 
        // Since ID is UUID, we can't easily upsert by ID unless we know it. 
        // Let's try to find first or create.
        update: {},
        create: {
            name: tenantName,
            id: 'default-tenant-id' // Force a known ID for simplicity in seeding
        },
    });

    // Actually, upsert requires a unique constraint. ID is unique.

    console.log('Tenant ensured:', tenant.name);

    // 2. Create Admin User
    const email = 'admin'; // User requested "admin/admin"
    const password = 'admin';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            tenantId: tenant.id,
            role: 'ADMIN' // Assuming ADMIN role exists or using string
        },
        create: {
            email,
            password: hashedPassword,
            name: 'Admin User',
            role: 'ADMIN',
            tenantId: tenant.id
        },
    });

    console.log(`User created: ${user.email} with password: ${password}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
