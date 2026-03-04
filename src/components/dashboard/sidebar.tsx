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
    ShieldCheck,
    Landmark,
    CreditCard,
    Building2,
    Sparkles,
    BookOpen,
    Gift,
    LockKeyhole,
    RefreshCw,
    ClipboardList,
    Repeat,
    Receipt,
    Award,
    Package2,
    Moon,
    MapPin
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

    const isAdmin = role === "ADMIN" || isSuperadmin;
    const isCASHIER = role === "CASHIER" || role === "VENDEUR";
    const isACCOUNTANT = role === "ACCOUNTANT";
    const isSTOCK_MANAGER = role === "STOCK_MANAGER";

    type Route = { label: string; icon: any; href: string; color: string; visible: boolean };
    type Group = { label: string; routes: Route[] };

    const groups: Group[] = [
        {
            label: t("overview") || "Vue d'ensemble",
            routes: [
                { label: t("dashboard"), icon: LayoutDashboard, href: "/dashboard", color: "text-sky-400", visible: !isCASHIER },
                { label: t("pos"), icon: Store, href: "/pos", color: "text-emerald-400", visible: isAdmin || isCASHIER },
                { label: t("aiIntelligence") || "Intelligence IA", icon: Sparkles, href: "/ai", color: "text-violet-400", visible: isAdmin },
            ]
        },
        {
            label: t("transactionsGroup") || "Transactions",
            routes: [
                { label: t("sales"), icon: ShoppingCart, href: "/sales", color: "text-violet-400", visible: isAdmin || isCASHIER || isACCOUNTANT },
                { label: "Factures Récurrentes", icon: Repeat, href: "/recurring-invoices", color: "text-teal-400", visible: isAdmin || isACCOUNTANT },
                { label: t("purchases"), icon: ShoppingBag, href: "/purchases", color: "text-blue-400", visible: isAdmin || isACCOUNTANT || isSTOCK_MANAGER },
                { label: t("expenses"), icon: FileText, href: "/expenses", color: "text-rose-400", visible: isAdmin || isACCOUNTANT },
                { label: t("payments") || "Paiements", icon: CreditCard, href: "/payments", color: "text-green-400", visible: isAdmin || isCASHIER || isACCOUNTANT },
            ]
        },
        {
            label: t("catalogGroup") || "Catalogue",
            routes: [
                { label: t("products"), icon: Package, href: "/products", color: "text-pink-400", visible: isAdmin || isSTOCK_MANAGER || isCASHIER },
                { label: t("categories"), icon: List, href: "/categories", color: "text-blue-400", visible: isAdmin || isSTOCK_MANAGER },
                { label: t("brands"), icon: Tag, href: "/brands", color: "text-red-400", visible: isAdmin || isSTOCK_MANAGER },
                { label: t("promotions") || "Promotions", icon: Gift, href: "/promotions", color: "text-purple-400", visible: isAdmin || isSTOCK_MANAGER },
                { label: t("damages") || "Avaries", icon: Package, href: "/avaries", color: "text-orange-400", visible: isAdmin || isSTOCK_MANAGER },
            ]
        },
        {
            label: t("partnersGroup") || "Partenaires",
            routes: [
                { label: t("customers"), icon: Users, href: "/customers", color: "text-orange-400", visible: isAdmin || isCASHIER || isACCOUNTANT },
                { label: t("suppliers"), icon: Truck, href: "/suppliers", color: "text-amber-400", visible: isAdmin || isSTOCK_MANAGER || isACCOUNTANT },
                { label: t("customerLoan") || "Emprunt Client", icon: Landmark, href: "/emprunt", color: "text-red-400", visible: isAdmin || isCASHIER || isACCOUNTANT },
                { label: t("supplierLoan") || "Emprunt Fournisseur", icon: Building2, href: "/emprunt-fournisseur", color: "text-orange-400", visible: isAdmin || isACCOUNTANT || isSTOCK_MANAGER },
                { label: "Réservations", icon: Package2, href: "/reservations", color: "text-pink-400", visible: isAdmin || isCASHIER },
                { label: "Livraison", icon: MapPin, href: "/delivery", color: "text-sky-400", visible: isAdmin || isCASHIER || isSTOCK_MANAGER },
            ]
        },
        {
            label: t("analysisGroup") || "Analyses",
            routes: [
                { label: t("reports"), icon: BarChart3, href: "/reports", color: "text-indigo-400", visible: isAdmin || isACCOUNTANT },
                { label: t("analytics"), icon: LineChart, href: "/analytics", color: "text-blue-400", visible: isAdmin || isACCOUNTANT },
                { label: "Prévisions IA", icon: Sparkles, href: "/analytics/forecast", color: "text-fuchsia-400", visible: isAdmin || isACCOUNTANT },
                { label: t("treasury"), icon: BarChart3, href: "/treasury", color: "text-emerald-400", visible: isAdmin || isACCOUNTANT },
                { label: t("dailyClose") || "Clôture de Caisse", icon: LockKeyhole, href: "/cloture", color: "text-amber-400", visible: isAdmin || isCASHIER || isACCOUNTANT },
                { label: "Réapprovisionnement", icon: RefreshCw, href: "/reorder", color: "text-cyan-400", visible: isAdmin || isSTOCK_MANAGER },
                { label: "Audit d'Inventaire", icon: ClipboardList, href: "/inventory-audit", color: "text-violet-400", visible: isAdmin || isSTOCK_MANAGER },
                { label: "Inventaire Annuel", icon: Package, href: "/inventaire-annuel", color: "text-orange-400", visible: isAdmin || isSTOCK_MANAGER || isACCOUNTANT },
                { label: "Commissions Vendeurs", icon: Award, href: "/commissions", color: "text-yellow-400", visible: isAdmin || isACCOUNTANT },
                { label: "Déclarations Fiscales G50/G12", icon: Receipt, href: "/fiscal", color: "text-emerald-400", visible: isAdmin || isACCOUNTANT },
            ]
        },
        {
            label: t("systemGroup") || "Système",
            routes: [
                { label: t("company") || "Mon Entreprise", icon: Store, href: "/company", color: "text-orange-400", visible: isAdmin },
                { label: t("users") || "Utilisateurs", icon: Users, href: "/users", color: "text-gray-300", visible: isAdmin },
                { label: t("systemSettings") || t("settings") || "Paramètres", icon: Settings, href: "/settings", color: "text-gray-400", visible: isAdmin },
                { label: t("erpTraining") || "Formation ERP", icon: BookOpen, href: "/formation", color: "text-pink-400", visible: !isCASHIER },
                { label: t("superAdmin") || "Super Admin", icon: ShieldCheck, href: "/superadmin", color: "text-emerald-400", visible: !!isSuperadmin }
            ]
        }
    ];

    return (
        <div className="flex flex-col h-full bg-[#0a0a0f] text-white min-h-0 border-r border-white/5 shadow-xl">
            {/* Header / Logo Area */}
            <div className="px-5 py-6 shrink-0">
                <Link href="/dashboard" className="flex items-center group">
                    <div className="relative w-8 h-8 mr-3 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300">
                        <span className="text-white font-bold text-sm tracking-tighter">S</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">
                        SYNCLOUD<span className="text-blue-400 font-extrabold">POS</span>
                    </h1>
                </Link>
            </div>

            <div className="px-4 pb-4 shrink-0">
                <StoreSwitcher items={tenants} activeTenantId={activeTenantId} />
            </div>

            {/* Navigation Lists */}
            <div className="px-3 py-2 flex-1 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {groups.map((group, i) => {
                    const visibleRoutes = group.routes.filter(r => r.visible);
                    if (visibleRoutes.length === 0) return null;

                    return (
                        <div key={i} className="space-y-1">
                            <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">
                                {group.label}
                            </h4>
                            <div className="space-y-0.5">
                                {visibleRoutes.map((route) => {
                                    const isActive = pathname.includes(route.href);

                                    return (
                                        <Link
                                            key={route.href}
                                            href={route.href}
                                            className={cn(
                                                "group flex items-center p-2.5 w-full justify-start text-sm font-medium rounded-xl transition-all duration-200 ease-in-out relative",
                                                isActive
                                                    ? "text-white bg-white/10 shadow-sm"
                                                    : "text-white/50 hover:text-white hover:bg-white/5"
                                            )}
                                        >
                                            {isActive && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                            )}

                                            <div className={cn(
                                                "shrink-0 w-8 h-8 mr-3 rounded-lg flex items-center justify-center transition-all duration-200",
                                                isActive ? "bg-white/10" : "bg-transparent group-hover:bg-white/5"
                                            )}>
                                                <route.icon className={cn("h-4 w-4", route.color, isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100")} />
                                            </div>

                                            <span className="truncate">{route.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
