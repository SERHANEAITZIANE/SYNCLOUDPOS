import { redirect } from "@/i18n/routing";
import { auth } from "@/auth";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { GlobalShortcuts } from "@/components/dashboard/global-shortcuts";
import { SubscriptionGuard } from "@/components/auth/subscription-guard";
import { ExpirationAlert } from "@/components/dashboard/expiration-alert";

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

    return (
        <SubscriptionGuard
            isSuperadmin={session.user?.isSuperadmin}
            subscriptionEndsAt={session.user?.subscriptionEndsAt}
            isBlocked={session.user?.isBlocked}
        >
            <div className="flex min-h-screen flex-col md:flex-row">
                <div className="hidden border-r bg-gray-100/40 md:block md:w-64 lg:w-72 dark:bg-gray-800/40">
                    <DashboardSidebar
                        isSuperadmin={session.user?.isSuperadmin}
                        role={session.user?.role}
                    />
                </div>
                <GlobalShortcuts />
                <div className="flex-1 flex flex-col">
                    <DashboardHeader user={session!.user} />
                    <main className="flex-1 p-4 md:p-6">
                        <ExpirationAlert subscriptionEndsAt={session.user?.subscriptionEndsAt} />
                        {children}
                    </main>
                </div>
            </div>
        </SubscriptionGuard>
    );
}
