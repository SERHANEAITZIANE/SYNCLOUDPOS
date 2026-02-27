"use client";

import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Users,
    Settings,
    Store,
    BarChart3,
    FileText,
    List,
    Tag,
    Truck,
    ShoppingBag,
    LineChart,
    ShieldCheck
} from "lucide-react";
import { useTranslations } from "next-intl";
import StoreSwitcher from "@/components/dashboard/store-switcher";
import { getUserTenants } from "@/actions/get-tenants";
import { getActiveTenantId } from "@/actions/get-active-tenant";
import { useEffect, useState } from "react";

export function DashboardSidebar({ isSuperadmin, role }: { isSuperadmin?: boolean, role?: string }) {
    const pathname = usePathname();
    const t = useTranslations("Navigation");
    const [tenants, setTenants] = useState<{ label: string; value: string }[]>([]);
    const [activeTenantId, setActiveTenantId] = useState<string | undefined>(undefined);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [tenantsData, activeId] = await Promise.all([
                    getUserTenants(),
                    getActiveTenantId()
                ]);
                const formatted = tenantsData.map((t: { name: string; id: string }) => ({ label: t.name, value: t.id }));
                setTenants(formatted);
                setActiveTenantId(activeId || undefined);
            } catch (error) {
                console.error("Failed to fetch tenants", error);
            }
        }
        fetchData();
    }, []);

    const routes = [
        {
            label: t("dashboard"),
            icon: LayoutDashboard,
            href: "/dashboard",
            color: "text-sky-500",
        },
        {
            label: t("pos"),
            icon: Store,
            href: "/pos",
            color: "text-emerald-500",
        },
        {
            label: t("sales"),
            icon: ShoppingCart,
            href: "/sales",
            color: "text-violet-500",
        },
        {
            label: t("products"),
            icon: Package,
            href: "/products",
            color: "text-pink-700",
        },
        {
            label: t("categories"),
            icon: List,
            href: "/categories",
            color: "text-blue-700",
        },
        {
            label: t("brands"),
            icon: Tag,
            href: "/brands",
            color: "text-red-700",
        },
        {
            label: t("customers"),
            icon: Users,
            href: "/customers",
            color: "text-orange-700",
        },
        {
            label: t("suppliers"),
            icon: Truck,
            href: "/suppliers",
            color: "text-amber-600",
        },
        {
            label: t("purchases"),
            icon: ShoppingBag,
            href: "/purchases",
            color: "text-blue-600",
        },
        {
            label: t("reports"),
            icon: BarChart3,
            href: "/reports",
            color: "text-indigo-700",
        },
        {
            label: t("expenses"),
            icon: FileText,
            href: "/expenses",
            color: "text-rose-600",
        },
        {
            label: t("treasury"),
            icon: BarChart3,
            href: "/treasury",
            color: "text-emerald-600",
        },
        {
            label: t("analytics"),
            icon: LineChart,
            href: "/analytics",
            color: "text-blue-600",
        },
    ];

    if (role === "ADMIN" || isSuperadmin) {
        routes.push(
            {
                label: t("company") || "Mon Entreprise",
                icon: Store,
                href: "/company",
                color: "text-orange-500",
            },
            {
                label: t("users") || "Utilisateurs",
                icon: Users,
                href: "/users",
                color: "text-gray-300"
            },
            {
                label: t("systemSettings") || t("settings") || "Paramètres Système",
                icon: Settings,
                href: "/settings",
                color: "text-gray-400"
            }
        );
    }

    if (isSuperadmin) {
        routes.push({
            label: "Super Admin",
            icon: ShieldCheck,
            href: "/superadmin",
            color: "text-emerald-400"
        })
    }

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-[#111827] text-white">
            <div className="px-3 py-2 flex-1">
                <Link href="/dashboard" className="flex items-center pl-3 mb-8">
                    <div className="relative w-8 h-8 mr-4">
                        {/* Logo placeholder */}
                        <div className="bg-white rounded-full w-full h-full flex items-center justify-center text-black font-bold">S</div>
                    </div>
                    <h1 className="text-2xl font-bold">
                        SYNCLOUD<span className="text-primary text-blue-400">POS</span>
                    </h1>
                </Link>

                <div className="mb-6 px-3">
                    <StoreSwitcher items={tenants} activeTenantId={activeTenantId} />
                </div>

                <div className="space-y-1">
                    {routes.map((route) => {
                        const isActive = pathname.includes(route.href);

                        return (
                            <Link
                                key={route.href}
                                href={route.href}
                                className={cn(
                                    "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                                    isActive ? "text-white bg-white/10" : "text-zinc-400"
                                )}
                            >
                                <div className="flex items-center flex-1">
                                    <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                    {route.label}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
