import { redirect } from "@/i18n/routing";
import { auth } from "@/auth";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { GlobalShortcuts } from "@/components/dashboard/global-shortcuts";

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
        <div className="flex min-h-screen flex-col md:flex-row">
            <div className="hidden border-r bg-gray-100/40 md:block md:w-64 lg:w-72 dark:bg-gray-800/40">
                <DashboardSidebar />
            </div>
            <GlobalShortcuts />
            <div className="flex-1 flex flex-col">
                <DashboardHeader user={session!.user} />
                <main className="flex-1 p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
