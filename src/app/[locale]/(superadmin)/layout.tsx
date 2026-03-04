import { redirect } from "@/i18n/routing";
import { auth } from "@/auth";

export default async function SuperadminLayout({
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

    if (!session.user?.isSuperadmin) {
        redirect({ href: "/dashboard", locale });
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {children}
        </div>
    );
}
