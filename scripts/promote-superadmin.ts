import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
    console.log("--- SUPERADMIN CHECK ---");
    const superadmins = await db.user.findMany({
        where: { isSuperadmin: true },
        select: { email: true, name: true, isSuperadmin: true }
    });

    console.log("Current Superadmins:");
    console.table(superadmins);

    const userEmail = "xm@live.fr";
    const user = await db.user.findUnique({
        where: { email: userEmail }
    });

    if (!user) {
        console.log(`\nUser ${userEmail} does not exist in the database.`);
    } else {
        if (!user.isSuperadmin) {
            console.log(`\nPromoting ${userEmail} to Superadmin...`);
            await db.user.update({
                where: { email: userEmail },
                data: { isSuperadmin: true }
            });
            console.log("Done. User is now a Superadmin.");
        } else {
            console.log(`\nUser ${userEmail} is already a Superadmin.`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => db.$disconnect());
