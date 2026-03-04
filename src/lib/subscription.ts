import { db } from "@/lib/db";
import { auth } from "@/auth";

export const getSubscriptionStatus = async () => {
    const session = await auth();
    if (!session?.user?.id) return null;

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { tenantId: true }
    });

    if (!user?.tenantId) return null;

    const tenant = await db.tenant.findUnique({
        where: { id: user.tenantId },
        select: {
            subscriptionEndsAt: true,
            isBlocked: true,
        }
    });

    if (!tenant) return null;

    const now = new Date();
    const isExpired = tenant.subscriptionEndsAt ? tenant.subscriptionEndsAt < now : true;

    // If it's a superadmin, they are never expired
    if (session.user.isSuperadmin) {
        return {
            isExpired: false,
            isBlocked: false,
            daysLeft: 999,
            endsAt: tenant.subscriptionEndsAt,
        };
    }

    const daysLeft = tenant.subscriptionEndsAt
        ? Math.ceil((tenant.subscriptionEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    return {
        isExpired: isExpired || tenant.isBlocked,
        isBlocked: tenant.isBlocked,
        daysLeft: Math.max(0, daysLeft),
        endsAt: tenant.subscriptionEndsAt,
    };
};

/**
 * Helper to check if the current operation should be blocked due to subscription.
 * Use this in server actions that modify data.
 */
export const checkSubscription = async () => {
    const status = await getSubscriptionStatus();
    if (status?.isExpired) {
        throw new Error("Votre abonnement a expiré ou votre compte est bloqué. Veuillez contacter l'administrateur.");
    }
};
