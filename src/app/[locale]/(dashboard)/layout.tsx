import { redirect } from "@/i18n/routing";
import { auth } from "@/auth";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { GlobalShortcuts } from "@/components/dashboard/global-shortcuts";
import { SubscriptionGuard } from "@/components/auth/subscription-guard";
import { ExpirationAlert } from "@/components/dashboard/expiration-alert";
import { getSubscriptionStatus } from "@/lib/subscription";
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner";
import { getUserTenants } from "@/actions/get-tenants";
import { getActiveTenantId } from "@/actions/get-active-tenant";

export default async function DashboardLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const session = await auth();
    const { locale } = await params;

    if (!session) {
        redirect({ href: "/login", locale });
    }

    // Fetch subscription + tenant data in parallel (server-side)
    const [subStatus, tenantsData, activeTenantId] = await Promise.all([
        getSubscriptionStatus(),
        getUserTenants(),
        getActiveTenantId()
    ]);

    const formattedTenants = tenantsData.map((t: { name: string; id: string }) => ({
        label: t.name,
        value: t.id
    }));

    return (
        <SubscriptionGuard
            isSuperadmin={session.user?.isSuperadmin}
            subscriptionEndsAt={session.user?.subscriptionEndsAt}
            isBlocked={session.user?.isBlocked}
        >
            <div className="flex min-h-screen flex-col md:flex-row">
                <div className="hidden border-r bg-gray-100/40 md:block dark:bg-gray-800/40">
                    <DashboardSidebar
                        isSuperadmin={session.user?.isSuperadmin}
                        role={session.user?.role}
                        tenants={formattedTenants}
                        activeTenantId={activeTenantId || undefined}
                    />
                </div>
                <GlobalShortcuts />
                <div className="flex-1 flex flex-col">
                    <DashboardHeader user={session!.user} />
                    {subStatus && (
                        <SubscriptionBanner
                            daysLeft={subStatus.daysLeft}
                            isExpired={subStatus.isExpired}
                            isBlocked={subStatus.isBlocked}
                        />
                    )}
                    <main className="flex-1 p-2 sm:p-4 md:p-6">
                        <ExpirationAlert subscriptionEndsAt={session.user?.subscriptionEndsAt} />
                        {children}
                    </main>
                </div>
            </div>
        </SubscriptionGuard>
    );
}
