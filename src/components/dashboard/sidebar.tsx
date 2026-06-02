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
    History,
    RefreshCw,
    ClipboardList,
    Repeat,
    Receipt,
    Award,
    Package2,
    MapPin,
    ChevronLeft,
    ChevronRight,
    Home,
    ArrowRightLeft
} from "lucide-react";
import { useTranslations } from "next-intl";
import StoreSwitcher from "@/components/dashboard/store-switcher";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DashboardSidebarProps {
    isSuperadmin?: boolean;
    role?: string;
    tenants?: { label: string; value: string }[];
    activeTenantId?: string;
}

export function DashboardSidebar({ isSuperadmin, role, tenants = [], activeTenantId }: DashboardSidebarProps) {
    const pathname = usePathname();
    const t = useTranslations("Navigation");
    const [isCollapsed, setIsCollapsed] = useState(true);

    const isAdmin = role === "ADMIN" || isSuperadmin;
    const isCASHIER = role === "CASHIER" || role === "VENDEUR";
    const isACCOUNTANT = role === "ACCOUNTANT";
    const isSTOCK_MANAGER = role === "STOCK_MANAGER";

    type Route = { label: string; icon: any; href: string; color: string; visible: boolean };
    type Group = { label: string; routes: Route[] };

    const groups: Group[] = [
        {
            label: "Accueil",
            routes: [
                { label: t("hub"), icon: Home, href: "/hub", color: "text-blue-400", visible: !isCASHIER },
                { label: t("dashboard"), icon: LayoutDashboard, href: "/dashboard", color: "text-sky-400", visible: !isCASHIER },
                { label: t("pos"), icon: Store, href: "/pos", color: "text-emerald-400", visible: isAdmin || isCASHIER },
                { label: t("aiIntelligence") || "Intelligence IA", icon: Sparkles, href: "/ai", color: "text-violet-400", visible: isAdmin },
            ]
        },
        {
            label: t("transactionsGroup") || "Transactions",
            routes: [
                { label: t("sales"), icon: ShoppingCart, href: "/sales", color: "text-violet-400", visible: isAdmin || isCASHIER || isACCOUNTANT },
                { label: t("recurringInvoices"), icon: Repeat, href: "/recurring-invoices", color: "text-teal-400", visible: isAdmin || isACCOUNTANT },
                { label: t("purchases"), icon: ShoppingBag, href: "/purchases", color: "text-blue-400", visible: isAdmin || isACCOUNTANT || isSTOCK_MANAGER },
                { label: t("expenses"), icon: FileText, href: "/expenses", color: "text-rose-400", visible: isAdmin || isACCOUNTANT },
                { label: t("payments") || "Paiements", icon: CreditCard, href: "/payments", color: "text-green-400", visible: isAdmin || isCASHIER || isACCOUNTANT },
                { label: t("returns") || "Retours", icon: ArrowRightLeft, href: "/retours", color: "text-purple-400", visible: isAdmin || isCASHIER || isACCOUNTANT },
            ]
        },
        {
            label: t("catalogGroup") || "Catalogue",
            routes: [
                { label: t("salesCatalog") || "Catalogue de Vente", icon: BookOpen, href: "/catalog", color: "text-amber-300", visible: true },
                { label: t("products"), icon: Package, href: "/products", color: "text-pink-400", visible: isAdmin || isSTOCK_MANAGER || isCASHIER },
                { label: t("categories"), icon: List, href: "/categories", color: "text-blue-400", visible: isAdmin || isSTOCK_MANAGER },
                { label: t("brands"), icon: Tag, href: "/brands", color: "text-red-400", visible: isAdmin || isSTOCK_MANAGER },
                { label: t("promotions") || "Promotions", icon: Gift, href: "/promotions", color: "text-purple-400", visible: isAdmin || isSTOCK_MANAGER },
                { label: t("damages") || "Avaries", icon: Package, href: "/avaries", color: "text-orange-400", visible: isAdmin || isSTOCK_MANAGER },
                { label: t("transfers") || "Transferts Inter-Dépôts", icon: ArrowRightLeft, href: "/transfers", color: "text-teal-400", visible: isAdmin || isSTOCK_MANAGER },
                { label: t("barcodeLabels"), icon: Tag, href: "/barcode-labels", color: "text-rose-400", visible: isAdmin || isSTOCK_MANAGER },
            ]
        },
        {
            label: t("partnersGroup") || "Partenaires",
            routes: [
                { label: t("customers"), icon: Users, href: "/customers", color: "text-orange-400", visible: isAdmin || isCASHIER || isACCOUNTANT },
                { label: t("suppliers"), icon: Truck, href: "/suppliers", color: "text-amber-400", visible: isAdmin || isSTOCK_MANAGER || isACCOUNTANT },
                { label: t("customerLoan") || "Emprunt Client", icon: Landmark, href: "/emprunt", color: "text-red-400", visible: isAdmin || isCASHIER || isACCOUNTANT },
                { label: t("supplierLoan") || "Emprunt Fournisseur", icon: Building2, href: "/emprunt-fournisseur", color: "text-orange-400", visible: isAdmin || isACCOUNTANT || isSTOCK_MANAGER },
                { label: t("reservations"), icon: Package2, href: "/reservations", color: "text-pink-400", visible: isAdmin || isCASHIER },
                { label: t("delivery"), icon: MapPin, href: "/delivery", color: "text-sky-400", visible: isAdmin || isCASHIER || isSTOCK_MANAGER },
                { label: t("driverTracking"), icon: Truck, href: "/driver-tracking", color: "text-green-400", visible: isAdmin },
                { label: "Portail Livreur", icon: Truck, href: "/driver", color: "text-cyan-400", visible: isAdmin },
            ]
        },
        {
            label: t("analysisGroup") || "Analyses",
            routes: [
                { label: t("reports"), icon: BarChart3, href: "/reports", color: "text-indigo-400", visible: isAdmin || isACCOUNTANT },
                { label: t("analytics"), icon: LineChart, href: "/analytics", color: "text-blue-400", visible: isAdmin || isACCOUNTANT },
                { label: t("treasury"), icon: BarChart3, href: "/treasury", color: "text-emerald-400", visible: isAdmin || isACCOUNTANT },
                { label: t("cheques") || "Chèques", icon: Receipt, href: "/treasury/cheques", color: "text-emerald-300", visible: isAdmin || isACCOUNTANT },
                { label: t("reconciliation") || "Rapprochement", icon: RefreshCw, href: "/treasury/reconciliation", color: "text-emerald-200", visible: isAdmin || isACCOUNTANT },
                { label: t("dailyClose") || "Clôture de Caisse", icon: LockKeyhole, href: "/cloture", color: "text-amber-400", visible: isAdmin || isCASHIER || isACCOUNTANT },
                { label: t("reorder"), icon: RefreshCw, href: "/reorder", color: "text-cyan-400", visible: isAdmin || isSTOCK_MANAGER },
                { label: t("inventoryAudit"), icon: ClipboardList, href: "/inventory-audit", color: "text-violet-400", visible: isAdmin || isSTOCK_MANAGER },
                { label: t("annualInventory"), icon: Package, href: "/inventaire-annuel", color: "text-orange-400", visible: isAdmin || isSTOCK_MANAGER || isACCOUNTANT },
                { label: t("commissions"), icon: Award, href: "/commissions", color: "text-yellow-400", visible: isAdmin || isACCOUNTANT },
                { label: t("fiscalG50G12"), icon: Receipt, href: "/fiscal", color: "text-emerald-400", visible: isAdmin || isACCOUNTANT },
                { label: t("salesJournal") || "Journaux", icon: BookOpen, href: "/journals", color: "text-indigo-400", visible: isAdmin || isACCOUNTANT },
                { label: "Rentabilité", icon: LineChart, href: "/reports/profit", color: "text-cyan-400", visible: isAdmin || isACCOUNTANT },
            ]
        },
        {
            label: t("systemGroup") || "Système",
            routes: [
                { label: t("company") || "Mon Entreprise", icon: Store, href: "/company", color: "text-orange-400", visible: isAdmin },
                { label: t("users") || "Utilisateurs", icon: Users, href: "/users", color: "text-gray-300", visible: isAdmin },
                { label: t("systemSettings") || t("settings") || "Paramètres", icon: Settings, href: "/settings", color: "text-gray-400", visible: isAdmin },
                { label: t("auditLog"), icon: History, href: "/audit-log", color: "text-violet-400", visible: isAdmin },
                { label: t("erpTraining") || "Formation ERP", icon: BookOpen, href: "/formation", color: "text-pink-400", visible: !isCASHIER },
                { label: t("superAdmin") || "Super Admin", icon: ShieldCheck, href: "/superadmin", color: "text-emerald-400", visible: !!isSuperadmin }
            ]
        }
    ];

    return (
        <TooltipProvider delayDuration={0}>
            <div
                className={cn(
                    "flex flex-col h-full bg-[#0a0a0f] text-white min-h-0 border-r border-white/5 shadow-xl transition-all duration-300 ease-in-out relative",
                    isCollapsed ? "w-20" : "w-64"
                )}
            >
                {/* Collapse Toggle Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-4 top-6 z-50 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg w-8 h-8 flex items-center justify-center p-0"
                >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>

                {/* Header / Logo Area */}
                <div className="px-5 py-6 shrink-0 flex items-center">
                    <Link href="/hub" className="flex items-center group overflow-hidden h-8">
                        <div className="relative w-8 h-8 shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300">
                            <span className="text-white font-bold text-sm tracking-tighter">S</span>
                        </div>

                        {!isCollapsed && (
                            <h1 className="text-xl font-bold tracking-tight ml-3 whitespace-nowrap opacity-100 transition-opacity duration-300">
                                SYNCLOUD<span className="text-blue-400 font-extrabold">POS</span>
                            </h1>
                        )}
                    </Link>
                </div>

                <div className={cn("px-4 pb-4 shrink-0 transition-opacity", isCollapsed ? "hidden" : "block")}>
                    <StoreSwitcher items={tenants} activeTenantId={activeTenantId} />
                </div>

                {/* Navigation Lists */}
                <div className="px-3 py-2 flex-1 overflow-y-auto overflow-x-hidden space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {groups.map((group, i) => {
                        const visibleRoutes = group.routes.filter(r => r.visible);
                        if (visibleRoutes.length === 0) return null;

                        return (
                            <div key={i} className="space-y-1">
                                {!isCollapsed ? (
                                    <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2 truncate">
                                        {group.label}
                                    </h4>
                                ) : (
                                    <div className="h-px w-8 mx-auto bg-white/10 my-4" />
                                )}

                                <div className="space-y-1.5 flex flex-col items-center">
                                    {visibleRoutes.map((route) => {
                                        const isActive = pathname.includes(route.href);

                                        const linkContent = (
                                            <Link
                                                key={route.href}
                                                href={route.href}
                                                className={cn(
                                                    "group flex items-center p-2.5 justify-start text-sm font-medium rounded-xl transition-all duration-200 ease-in-out relative",
                                                    isCollapsed ? "w-12 h-12 justify-center" : "w-full",
                                                    isActive
                                                        ? "text-white bg-white/10 shadow-sm"
                                                        : "text-white/50 hover:text-white hover:bg-white/5"
                                                )}
                                            >
                                                {isActive && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                                )}

                                                <div className={cn(
                                                    "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                                                    !isCollapsed && "mr-3",
                                                    isActive ? "bg-white/10" : "bg-transparent group-hover:bg-white/5"
                                                )}>
                                                    <route.icon className={cn("h-4 w-4", route.color, isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100")} />
                                                </div>

                                                {!isCollapsed && (
                                                    <span className="truncate whitespace-nowrap">{route.label}</span>
                                                )}
                                            </Link>
                                        );

                                        if (isCollapsed) {
                                            return (
                                                <Tooltip key={route.href}>
                                                    <TooltipTrigger asChild>
                                                        {linkContent}
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right" className="flex items-center gap-2">
                                                        <span>{route.label}</span>
                                                    </TooltipContent>
                                                </Tooltip>
                                            );
                                        }

                                        return linkContent;
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </TooltipProvider>
    );
}
