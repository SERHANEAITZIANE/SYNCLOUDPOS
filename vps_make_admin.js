const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Updating user xm@live.fr...");

    // 1. D'abord, on vérifie si l'utilisateur existe
    const user = await prisma.user.findUnique({
        where: { email: 'xm@live.fr' }
    });

    if (!user) {
        console.log("Erreur : Utilisateur xm@live.fr introuvable !");
        return;
    }

    // 2. On le met à jour
    const updatedUser = await prisma.user.update({
        where: { email: 'xm@live.fr' },
        data: {
            role: 'ADMIN',
            isSuperadmin: true // On lui donne également les droits superadmin
        }
    });
    console.log("✅ User mis à jour :", updatedUser.email, " | Rôle:", updatedUser.role, " | Superadmin:", updatedUser.isSuperadmin);

    // 3. On met également à jour la table TenantUser (pour être sûr à 100% avec le support multi-boutique)
    const tenantUser = await prisma.tenantUser.upsert({
        where: {
            userId_tenantId: {
                userId: updatedUser.id,
                tenantId: updatedUser.tenantId
            }
        },
        update: {
            role: 'ADMIN' // Promotion en ADMIN sur la boutique
        },
        create: {
            userId: updatedUser.id,
            tenantId: updatedUser.tenantId,
            role: 'ADMIN'
        }
    });
    console.log("✅ Accès boutique configuré avec rôle :", tenantUser.role);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
