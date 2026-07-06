import { redirect } from "@/i18n/routing";
import { auth } from "@/auth";
import Link from "next/link";

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
        <div className="min-h-dvh bg-slate-50 dark:bg-slate-900">
            {/* Superadmin Navigation Header */}
            <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <div className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-6">
                        <Link href={`/${locale}/superadmin`} className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                            🛡️ SyncCloud <span className="text-blue-600">Superadmin</span>
                        </Link>
                        <nav className="hidden sm:flex items-center gap-1">
                            <Link
                                href={`/${locale}/superadmin`}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Espaces
                            </Link>
                            <Link
                                href={`/${locale}/superadmin/licenses`}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Licences
                            </Link>
                        </nav>
                    </div>
                    <Link
                        href={`/${locale}/dashboard`}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        ← Dashboard
                    </Link>
                </div>
            </header>
            {children}
        </div>
    );
}
