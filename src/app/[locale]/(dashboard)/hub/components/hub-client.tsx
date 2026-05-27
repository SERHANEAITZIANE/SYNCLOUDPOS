"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import {
    Package,
    ShoppingCart,
    Users,
    CreditCard,
    BarChart3,
    Settings,
    Truck,
    Wallet,
    Sparkles,
    Store,
    LayoutDashboard,
    FileText,
    List,
    Tag,
    ShoppingBag,
    LineChart,
    Landmark,
    Building2,
    BookOpen,
    Gift,
    LockKeyhole,
    RefreshCw,
    ClipboardList,
    Repeat,
    Receipt,
    Award,
    Package2,
    MapPin,
    Search,
    ArrowRight,
    ChevronRight,
    Zap,
    Globe,
    Smartphone,
    QrCode,
    X,
    Wifi,
    Laptop,
    Download,
    ExternalLink,
    type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";

interface HubClientProps {
    metrics: {
        productsCount: number;
        salesCount: number;
        customersCount: number;
        suppliersCount: number;
        purchasesCount: number;
        expensesCount: number;
        categoriesCount: number;
        brandsCount: number;
    };
}

interface QuickLink {
    label: string;
    href: string;
    icon: LucideIcon;
    description?: string;
    badge?: string;
    badgeColor?: string;
}

interface ModuleSection {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    accentFrom: string;
    accentTo: string;
    stat?: string;
    statLabel?: string;
    links: QuickLink[];
}

export const HubClient: React.FC<HubClientProps> = ({ metrics }) => {
    const t = useTranslations("Hub");
    const [searchQuery, setSearchQuery] = useState("");
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);
    const [showQrModal, setShowQrModal] = useState(false);
    const [activeTab, setActiveTab] = useState<"gerant" | "tournee">("gerant");

    const isLocal = typeof window !== "undefined" && (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.startsWith("192.168.")
    );

    const getAppDownloadUrl = (tab: "gerant" | "tournee") => {
        if (isLocal) {
            return "exp://192.168.0.132:8081";
        }
        const slug = tab === "gerant" ? "syncloud-gerant" : "syncloud-tournee";
        return `https://expo.dev/accounts/aitee/projects/${slug}/builds`;
    };

    // ═══════════════ Quick Actions ═══════════════
    const quickActions: { label: string; href: string; icon: LucideIcon; gradient: string }[] = [
        { label: "POS", href: "/pos", icon: Store, gradient: "linear-gradient(135deg, #3b82f6, #06b6d4)" },
        { label: t("links.dashboard"), href: "/dashboard", icon: LayoutDashboard, gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)" },
        { label: t("links.products"), href: "/products", icon: Package, gradient: "linear-gradient(135deg, #10b981, #14b8a6)" },
        { label: t("links.allSales"), href: "/sales", icon: ShoppingCart, gradient: "linear-gradient(135deg, #f59e0b, #f97316)" },
        { label: t("links.analytics"), href: "/analytics", icon: LineChart, gradient: "linear-gradient(135deg, #ef4444, #ec4899)" },
        { label: t("links.aiChat"), href: "/ai", icon: Sparkles, gradient: "linear-gradient(135deg, #8b5cf6, #d946ef)" },
    ];

    // ═══════════════ Module Sections ═══════════════
    const sections: ModuleSection[] = [
        {
            id: "pos-sales",
            title: t("sections.posSales.title"),
            description: t("sections.posSales.description"),
            icon: ShoppingCart,
            accentFrom: "#3b82f6",
            accentTo: "#06b6d4",
            stat: metrics.salesCount.toLocaleString(),
            statLabel: t("stats.sales"),
            links: [
                { label: t("links.pos"), href: "/pos", icon: Store },
                { label: t("links.allSales"), href: "/sales", icon: ShoppingCart },
                { label: t("links.recurringInvoices"), href: "/recurring-invoices", icon: Repeat },
                { label: t("links.reservations"), href: "/reservations", icon: Package2 },
                { label: t("links.delivery"), href: "/delivery", icon: MapPin },
                { label: t("links.payments"), href: "/payments", icon: CreditCard },
            ],
        },
        {
            id: "catalog",
            title: t("sections.catalog.title"),
            description: t("sections.catalog.description"),
            icon: Package,
            accentFrom: "#10b981",
            accentTo: "#34d399",
            stat: metrics.productsCount.toLocaleString(),
            statLabel: t("stats.products"),
            links: [
                { label: t("links.products"), href: "/products", icon: Package, description: `${metrics.productsCount}` },
                { label: t("links.stock"), href: "/products/inventory", icon: Package2 },
                { label: t("links.categories"), href: "/categories", icon: List, description: `${metrics.categoriesCount}` },
                { label: t("links.brands"), href: "/brands", icon: Tag, description: `${metrics.brandsCount}` },
                { label: t("links.promotions"), href: "/promotions", icon: Gift },
                { label: t("links.damages"), href: "/avaries", icon: Package },
                { label: t("links.reorder"), href: "/reorder", icon: RefreshCw },
                { label: t("links.inventoryAudit"), href: "/inventory-audit", icon: ClipboardList },
            ],
        },
        {
            id: "purchases",
            title: t("sections.purchases.title"),
            description: t("sections.purchases.description"),
            icon: Truck,
            accentFrom: "#f59e0b",
            accentTo: "#fbbf24",
            stat: metrics.purchasesCount.toLocaleString(),
            statLabel: t("links.purchases"),
            links: [
                { label: t("links.purchases"), href: "/purchases", icon: ShoppingBag, description: `${metrics.purchasesCount}` },
                { label: t("links.suppliers"), href: "/suppliers", icon: Truck, description: `${metrics.suppliersCount}` },
                { label: t("links.expenses"), href: "/expenses", icon: FileText, description: `${metrics.expensesCount}` },
                { label: t("links.supplierLoan"), href: "/emprunt-fournisseur", icon: Building2 },
            ],
        },
        {
            id: "customers",
            title: t("sections.customers.title"),
            description: t("sections.customers.description"),
            icon: Users,
            accentFrom: "#8b5cf6",
            accentTo: "#a78bfa",
            stat: metrics.customersCount.toLocaleString(),
            statLabel: t("stats.clients"),
            links: [
                { label: t("links.customers"), href: "/customers", icon: Users, description: `${metrics.customersCount}` },
                { label: t("links.customerLoan"), href: "/emprunt", icon: Landmark },
            ],
        },
        {
            id: "treasury",
            title: t("sections.treasury.title"),
            description: t("sections.treasury.description"),
            icon: Wallet,
            accentFrom: "#14b8a6",
            accentTo: "#2dd4bf",
            links: [
                { label: t("links.treasuryOverview"), href: "/treasury", icon: Wallet },
                { label: t("links.payments"), href: "/payments", icon: CreditCard },
                { label: t("links.dailyClose"), href: "/cloture", icon: LockKeyhole },
            ],
        },
        {
            id: "reports",
            title: t("sections.reports.title"),
            description: t("sections.reports.description"),
            icon: BarChart3,
            accentFrom: "#ef4444",
            accentTo: "#f87171",
            links: [
                { label: t("links.reports"), href: "/reports", icon: BarChart3 },
                { label: t("links.analytics"), href: "/analytics", icon: LineChart },
                { label: t("links.fiscal"), href: "/fiscal", icon: Receipt },
                { label: t("links.annualInventory"), href: "/inventaire-annuel", icon: Package },
                { label: t("links.commissions"), href: "/commissions", icon: Award },
            ],
        },
        {
            id: "ai",
            title: t("sections.ai.title"),
            description: t("sections.ai.description"),
            icon: Sparkles,
            accentFrom: "#a855f7",
            accentTo: "#d946ef",
            links: [
                { label: t("links.aiChat"), href: "/ai", icon: Sparkles },
            ],
        },
        {
            id: "system",
            title: t("sections.system.title"),
            description: t("sections.system.description"),
            icon: Settings,
            accentFrom: "#64748b",
            accentTo: "#94a3b8",
            links: [
                { label: t("links.settings"), href: "/settings", icon: Settings },
                { label: t("links.company"), href: "/company", icon: Store },
                { label: t("links.users"), href: "/users", icon: Users },
                { label: t("links.training"), href: "/formation", icon: BookOpen },
                { label: t("links.dashboard"), href: "/dashboard", icon: LayoutDashboard },
                { label: t("links.mobileConnect") || "App Mobile", href: "/mobile-connect", icon: Smartphone, badge: "Expo", badgeColor: "#10b981" },
            ],
        },
    ];

    // ═══════════════ Search Filter ═══════════════
    const filteredSections = useMemo(() => {
        if (!searchQuery.trim()) return sections;
        const q = searchQuery.toLowerCase();
        return sections
            .map((section) => ({
                ...section,
                links: section.links.filter(
                    (link) =>
                        link.label.toLowerCase().includes(q) ||
                        (link.description && link.description.toLowerCase().includes(q))
                ),
            }))
            .filter(
                (section) =>
                    section.links.length > 0 ||
                    section.title.toLowerCase().includes(q) ||
                    section.description.toLowerCase().includes(q)
            );
    }, [searchQuery, sections]);

    // ═══════════════ Stat Cards ═══════════════
    const statCards = [
        { label: t("stats.products"), value: metrics.productsCount, icon: Package, from: "#10b981", to: "#34d399" },
        { label: t("stats.sales"), value: metrics.salesCount, icon: ShoppingCart, from: "#3b82f6", to: "#60a5fa" },
        { label: t("stats.clients"), value: metrics.customersCount, icon: Users, from: "#8b5cf6", to: "#a78bfa" },
        { label: t("stats.suppliers"), value: metrics.suppliersCount, icon: Truck, from: "#f59e0b", to: "#fbbf24" },
    ];

    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* ═══════ Animated Background ═══════ */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <motion.div
                    animate={{
                        scale: [1, 1.15, 1],
                        opacity: [0.08, 0.12, 0.08],
                    }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-40 -left-20 w-[800px] h-[800px] rounded-full blur-[160px]"
                    style={{ background: "radial-gradient(circle, #3b82f6, transparent 70%)" }}
                />
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.06, 0.1, 0.06],
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 3 }}
                    className="absolute -bottom-40 -right-20 w-[700px] h-[700px] rounded-full blur-[160px]"
                    style={{ background: "radial-gradient(circle, #8b5cf6, transparent 70%)" }}
                />
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.04, 0.08, 0.04],
                    }}
                    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 6 }}
                    className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[140px]"
                    style={{ background: "radial-gradient(circle, #10b981, transparent 70%)" }}
                />
                {/* Subtle grid pattern */}
                <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(148,163,184,0.4) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(148,163,184,0.4) 1px, transparent 1px)
                        `,
                        backgroundSize: "60px 60px",
                    }}
                />
            </div>

            <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-8">
                {/* ═══════════ HERO HEADER ═══════════ */}
                <motion.div
                    initial={{ opacity: 0, y: -24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="relative overflow-hidden rounded-3xl"
                    style={{
                        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)",
                        border: "1px solid rgba(99, 102, 241, 0.2)",
                        boxShadow: "0 0 80px -20px rgba(99, 102, 241, 0.15), 0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                    }}
                >
                    {/* Animated decorative orbs inside header */}
                    <motion.div
                        animate={{ opacity: [0.2, 0.35, 0.2], scale: [1, 1.05, 1] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[100px]"
                        style={{ background: "radial-gradient(circle, #3b82f6, transparent 70%)" }}
                    />
                    <motion.div
                        animate={{ opacity: [0.15, 0.3, 0.15], scale: [1, 1.08, 1] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                        className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-[80px]"
                        style={{ background: "radial-gradient(circle, #8b5cf6, transparent 70%)" }}
                    />
                    <motion.div
                        animate={{ opacity: [0.1, 0.2, 0.1] }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 4 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px]"
                        style={{ background: "radial-gradient(circle, #06b6d4, transparent 70%)" }}
                    />

                    {/* Starfield dots */}
                    <div className="absolute inset-0 overflow-hidden">
                        {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-[2px] h-[2px] bg-white rounded-full"
                                style={{
                                    top: `${10 + (i * 37) % 80}%`,
                                    left: `${5 + (i * 53) % 90}%`,
                                }}
                                animate={{ opacity: [0.1, 0.5, 0.1] }}
                                transition={{
                                    duration: 2 + (i % 3),
                                    repeat: Infinity,
                                    delay: i * 0.3,
                                    ease: "easeInOut",
                                }}
                            />
                        ))}
                    </div>

                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 p-6 sm:p-8 lg:p-10">
                        <div className="flex items-center gap-5">
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                                className="relative group"
                            >
                                <motion.div
                                    animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.15, 1] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute -inset-1 rounded-2xl blur-xl"
                                    style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
                                />
                                <div className="relative w-16 h-16 sm:w-[72px] sm:h-[72px] flex items-center justify-center rounded-2xl shadow-2xl"
                                    style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}>
                                    <span className="text-white font-black text-3xl sm:text-4xl tracking-tighter select-none">S</span>
                                </div>
                            </motion.div>
                            <div>
                                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
                                    SYNCLOUD<span style={{ background: "linear-gradient(90deg, #60a5fa, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>POS</span>
                                </h1>
                                <p className="text-sm sm:text-base text-blue-200/60 font-medium mt-1">
                                    {t("commandCenter")} — {t("subtitle")}
                                </p>
                            </div>
                        </div>

                        {/* Search bar */}
                        <div className="relative w-full lg:w-96">
                            <div className="relative flex items-center">
                                <Search className="absolute left-4 w-4 h-4 text-blue-300/50" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t("searchPlaceholder")}
                                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm text-white placeholder:text-blue-300/40 focus:outline-none transition-all duration-300"
                                    style={{
                                        background: "rgba(255,255,255,0.08)",
                                        backdropFilter: "blur(12px)",
                                        border: "1px solid rgba(99, 102, 241, 0.2)",
                                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.border = "1px solid rgba(99, 102, 241, 0.5)";
                                        e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.05), 0 0 20px -5px rgba(99, 102, 241, 0.3)";
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.border = "1px solid rgba(99, 102, 241, 0.2)";
                                        e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.05)";
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ═══════════ STAT CARDS ═══════════ */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
                >
                    {statCards.map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + i * 0.06, duration: 0.5 }}
                            whileHover={{ y: -6, transition: { duration: 0.25 } }}
                            className="group relative overflow-hidden rounded-2xl p-5 sm:p-6 cursor-default"
                            style={{
                                background: "hsl(var(--card) / 0.8)",
                                backdropFilter: "blur(16px)",
                                border: `1px solid ${stat.from}20`,
                                boxShadow: `0 4px 24px -4px ${stat.from}10`,
                            }}
                        >
                            {/* Hover glow */}
                            <div
                                className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-0 group-hover:opacity-30 transition-all duration-700 blur-2xl"
                                style={{ background: `linear-gradient(135deg, ${stat.from}, ${stat.to})` }}
                            />
                            {/* Accent line */}
                            <div className="absolute top-0 left-0 right-0 h-[3px] group-hover:h-[4px] transition-all duration-500"
                                style={{ background: `linear-gradient(90deg, ${stat.from}, ${stat.to})` }} />
                            <div className="relative flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider"
                                        style={{ color: stat.from }}>{stat.label}</p>
                                    <p className="text-2xl sm:text-3xl font-black mt-1.5 tracking-tight text-foreground tabular-nums">
                                        {stat.value.toLocaleString()}
                                    </p>
                                </div>
                                <motion.div
                                    whileHover={{ scale: 1.15, rotate: 8 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                                    style={{
                                        background: `linear-gradient(135deg, ${stat.from}, ${stat.to})`,
                                        boxShadow: `0 8px 24px -4px ${stat.from}40`,
                                    }}
                                >
                                    <stat.icon className="w-5 h-5 text-white" />
                                </motion.div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* ═══════════ QUICK ACTIONS ═══════════ */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="space-y-3"
                >
                    <div className="flex items-center gap-2 px-1">
                        <motion.div
                            animate={{ rotate: [0, 15, -15, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                        >
                            <Zap className="w-4 h-4 text-amber-400" />
                        </motion.div>
                        <h2 className="text-xs font-extrabold uppercase tracking-[0.15em] text-muted-foreground/60">{t("quickAccess")}</h2>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                        {quickActions.map((action, i) => (
                            <motion.div
                                key={action.href}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.35 + i * 0.04 }}
                            >
                                <Link
                                    href={action.href}
                                    className="group/qa flex items-center gap-2.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl transition-all duration-300 active:scale-[0.97]"
                                    style={{
                                        background: "hsl(var(--card) / 0.7)",
                                        backdropFilter: "blur(8px)",
                                        border: "1px solid hsl(var(--border) / 0.3)",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.border = `1px solid ${action.gradient.match(/#[a-f0-9]+/i)?.[0] || "#3b82f6"}40`;
                                        e.currentTarget.style.boxShadow = `0 8px 32px -8px ${action.gradient.match(/#[a-f0-9]+/i)?.[0] || "#3b82f6"}20`;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.border = "1px solid hsl(var(--border) / 0.3)";
                                        e.currentTarget.style.boxShadow = "none";
                                    }}
                                >
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover/qa:scale-110 group-hover/qa:shadow-lg"
                                        style={{ background: action.gradient }}>
                                        <action.icon className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-sm font-semibold text-foreground/70 group-hover/qa:text-foreground transition-colors duration-300">
                                        {action.label}
                                    </span>
                                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover/qa:text-foreground/50 group-hover/qa:translate-x-1 transition-all duration-300" />
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* ═══════════ MODULE CARDS GRID ═══════════ */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35, duration: 0.5 }}
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5"
                >
                    <AnimatePresence mode="popLayout">
                        {filteredSections.map((section, idx) => (
                            <motion.div
                                key={section.id}
                                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{
                                    delay: 0.05 * idx,
                                    type: "spring",
                                    stiffness: 260,
                                    damping: 24,
                                }}
                                layout
                                onMouseEnter={() => setHoveredCard(section.id)}
                                onMouseLeave={() => setHoveredCard(null)}
                            >
                                <div
                                    className="group relative flex flex-col h-full rounded-[22px] overflow-hidden transition-all duration-500 hover:-translate-y-2"
                                    style={{
                                        background: "hsl(var(--card) / 0.8)",
                                        backdropFilter: "blur(16px)",
                                        border: hoveredCard === section.id
                                            ? `1px solid ${section.accentFrom}40`
                                            : "1px solid hsl(var(--border) / 0.3)",
                                        boxShadow: hoveredCard === section.id
                                            ? `0 24px 64px -16px ${section.accentFrom}20, 0 0 0 1px ${section.accentFrom}10`
                                            : "0 2px 8px rgba(0,0,0,0.04)",
                                    }}
                                >
                                    {/* Top gradient accent bar */}
                                    <div className="h-[3px] w-full transition-all duration-500 group-hover:h-[4px]"
                                        style={{
                                            background: `linear-gradient(90deg, ${section.accentFrom}, ${section.accentTo})`,
                                            opacity: hoveredCard === section.id ? 1 : 0.5,
                                        }}
                                    />

                                    {/* Background hover glow */}
                                    <div
                                        className="absolute inset-0 opacity-0 group-hover:opacity-[0.04] transition-opacity duration-700"
                                        style={{ background: `linear-gradient(135deg, ${section.accentFrom}, ${section.accentTo})` }}
                                    />

                                    <div className="relative z-10 flex flex-col h-full p-5 sm:p-6">
                                        {/* Card Header */}
                                        <div className="flex items-start justify-between mb-5">
                                            <div className="flex items-center gap-3.5">
                                                <motion.div
                                                    whileHover={{ scale: 1.12, rotate: 5 }}
                                                    transition={{ type: "spring", stiffness: 300 }}
                                                    className="relative p-3 rounded-xl shadow-lg"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${section.accentFrom}, ${section.accentTo})`,
                                                        boxShadow: `0 8px 24px -4px ${section.accentFrom}35`,
                                                    }}
                                                >
                                                    <section.icon className="w-5 h-5 text-white" />
                                                </motion.div>
                                                <div className="min-w-0">
                                                    <h3 className="text-[15px] font-bold tracking-tight text-foreground leading-tight">
                                                        {section.title}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground/50 mt-0.5 leading-relaxed line-clamp-1">
                                                        {section.description}
                                                    </p>
                                                </div>
                                            </div>
                                            {section.stat && (
                                                <div className="flex flex-col items-end shrink-0 ml-4">
                                                    <span className="text-xl font-black tracking-tight tabular-nums"
                                                        style={{
                                                            background: `linear-gradient(135deg, ${section.accentFrom}, ${section.accentTo})`,
                                                            WebkitBackgroundClip: "text",
                                                            WebkitTextFillColor: "transparent",
                                                        }}>
                                                        {section.stat}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-wider">{section.statLabel}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Links list */}
                                        <div className="space-y-0.5 mt-auto">
                                            {section.links.map((link) => {
                                                const isMobileConnect = link.href === "/mobile-connect";
                                                const content = (
                                                    <>
                                                        <div
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 group-hover/link:scale-105"
                                                            style={{
                                                                background: `${section.accentFrom}10`,
                                                            }}
                                                        >
                                                            <link.icon className="w-3.5 h-3.5 transition-colors duration-200"
                                                                style={{ color: `${section.accentFrom}90` }}
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0 flex items-center gap-2">
                                                            <span className="text-sm font-medium text-foreground/70 group-hover/link:text-foreground transition-colors duration-200 block truncate">
                                                                {link.label}
                                                            </span>
                                                            {link.badge && (
                                                                <span 
                                                                    className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full animate-pulse shrink-0"
                                                                    style={{
                                                                        backgroundColor: `${link.badgeColor || '#10b981'}20`,
                                                                        color: link.badgeColor || '#10b981',
                                                                        border: `1px solid ${link.badgeColor || '#10b981'}40`
                                                                    }}
                                                                >
                                                                    {link.badge}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {link.description && (
                                                            <span className="text-xs font-bold shrink-0 tabular-nums px-2.5 py-1 rounded-lg"
                                                                style={{
                                                                    background: `${section.accentFrom}12`,
                                                                    color: section.accentFrom,
                                                                }}>
                                                                {link.description}
                                                            </span>
                                                        )}
                                                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover/link:text-muted-foreground/60 group-hover/link:translate-x-0.5 transition-all duration-200 shrink-0" />
                                                    </>
                                                );

                                                if (isMobileConnect) {
                                                    return (
                                                        <button
                                                            key={link.href + link.label}
                                                            type="button"
                                                            onClick={() => setShowQrModal(true)}
                                                            className="w-full text-start group/link flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/60 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                                                        >
                                                            {content}
                                                        </button>
                                                    );
                                                }

                                                return (
                                                    <Link
                                                        key={link.href + link.label}
                                                        href={link.href}
                                                        className="group/link flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/60 transition-all duration-200 active:scale-[0.98]"
                                                    >
                                                        {content}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>

                {/* ═══════════ EMPTY STATE ═══════════ */}
                {filteredSections.length === 0 && searchQuery && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-24 text-center"
                    >
                        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                            style={{ background: "linear-gradient(135deg, #3b82f620, #8b5cf620)" }}>
                            <Search className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                        <h3 className="text-xl font-bold text-muted-foreground/50">
                            {t("noResults")}
                        </h3>
                        <p className="text-sm text-muted-foreground/30 mt-2 max-w-sm">
                            {t("noResultsDesc", { query: searchQuery })}
                        </p>
                    </motion.div>
                )}

                {/* ═══════════ FOOTER ═══════════ */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="flex items-center justify-center pt-10 pb-4"
                >
                    <div className="flex items-center gap-2.5 text-xs text-muted-foreground/25 hover:text-muted-foreground/50 transition-colors duration-300">
                        <Globe className="w-3.5 h-3.5" />
                        <span className="font-medium">{t("footer")}</span>
                    </div>
                </motion.div>
            </div>

            {/* ═══════════ FLOATING ACTION BUTTON ═══════════ */}
            <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowQrModal(true)}
                className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-emerald-500/15 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 dark:border-emerald-500/20 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(16,185,129,0.15)] transition-all duration-300 cursor-pointer"
            >
                <div className="relative flex items-center justify-center w-5 h-5">
                    <Smartphone className="w-5 h-5" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full" />
                </div>
                <span className="text-sm font-bold tracking-wide uppercase pr-1">
                    {t("links.mobileConnect") || "App Mobile"}
                </span>
            </motion.button>

            {/* ═══════════ GLASSMORPHIC MOBILE CONNECT MODAL ═══════════ */}
            <AnimatePresence>
                {showQrModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowQrModal(false)}
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                        />

                        {/* Modal Dialog */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 16 }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
                            className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-[#090d16] border border-slate-800 shadow-[0_24px_70px_-10px_rgba(0,0,0,0.7)] text-slate-100 flex flex-col z-10"
                        >
                            {/* Decorative blur orbs inside modal */}
                            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

                            {/* Modal Header */}
                            <div className="relative p-6 border-b border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                        <Smartphone className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold tracking-tight text-white">
                                            {t("links.scanQrCode") || "Connexion Mobile App"}
                                        </h3>
                                        <p className="text-xs text-slate-400/85 mt-0.5">
                                            {t("links.mobileConnectDesc") || "Scannez le QR Code pour connecter votre mobile"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowQrModal(false)}
                                    className="p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition-all duration-200 cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="relative p-6 flex flex-col space-y-6">
                                {/* Segmented control (tabs) */}
                                <div className="flex p-1 rounded-2xl bg-slate-950 border border-slate-800/80">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("gerant")}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                                            activeTab === "gerant"
                                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_2px_12px_rgba(16,185,129,0.1)]"
                                                : "text-slate-400 hover:text-slate-200 border border-transparent"
                                        }`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${activeTab === "gerant" ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                                        Application Gérant
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("tournee")}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                                            activeTab === "tournee"
                                                ? "bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-[0_2px_12px_rgba(59,130,246,0.1)]"
                                                : "text-slate-400 hover:text-slate-200 border border-transparent"
                                        }`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${activeTab === "tournee" ? "bg-blue-400 animate-pulse" : "bg-slate-600"}`} />
                                        Application Tournée
                                    </button>
                                </div>

                                {/* Active App Highlight Card */}
                                {activeTab === "gerant" ? (
                                    <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-400">
                                            <Store className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-emerald-400">Application Gérant ERP</h4>
                                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                Accès complet aux ventes, stocks, caisse et IA pour le gérant de boutique.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-400">
                                            <Truck className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-blue-400">Application Tournée Livreur</h4>
                                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                Accès aux livraisons, commandes clients et suivi GPS pour les livreurs sur le terrain.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Main layout: QR on the left/center, instructions on the right/bottom */}
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    {/* QR Code Container */}
                                    <div className="flex flex-col items-center justify-center shrink-0">
                                        <div 
                                            className="p-4 bg-white rounded-2xl shadow-2xl relative transition-all duration-500"
                                            style={{
                                                border: `4px solid ${activeTab === "gerant" ? "#10b981" : "#3b82f6"}`
                                            }}
                                        >
                                            <QRCodeSVG
                                                value={getAppDownloadUrl(activeTab)}
                                                size={160}
                                                level="H"
                                                includeMargin={false}
                                            />
                                        </div>
                                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mt-2">
                                            Télécharger APK
                                        </span>
                                    </div>

                                    {/* Instructions list */}
                                    <div className="flex-1 space-y-4 text-start">
                                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                            <Wifi className="w-3.5 h-3.5 text-slate-500" />
                                            {t("links.howToConnect") || "Comment se connecter :"}
                                        </h4>
                                        
                                        <div className="space-y-3">
                                            <div className="flex gap-3 text-xs leading-relaxed text-slate-300">
                                                <div className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center shrink-0 text-[10px] font-bold text-slate-400">1</div>
                                                <p className="flex-1">
                                                    Scannez le QR code avec votre caméra pour ouvrir la page de téléchargement.
                                                </p>
                                            </div>

                                            <div className="flex gap-3 text-xs leading-relaxed text-slate-300">
                                                <div className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center shrink-0 text-[10px] font-bold text-slate-400">2</div>
                                                <p className="flex-1">
                                                    Téléchargez le fichier APK et installez-le sur votre téléphone Android.
                                                </p>
                                            </div>

                                            <div className="flex gap-3 text-xs leading-relaxed text-slate-300">
                                                <div className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center shrink-0 text-[10px] font-bold text-slate-400">3</div>
                                                <p className="flex-1">
                                                    Ouvrez l&apos;application et connectez-vous avec vos identifiants SynCloud.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer link / input for manual connect */}
                                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col space-y-2">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                        <Download className="w-3.5 h-3.5" />
                                        Ou ouvrez ce lien dans votre navigateur mobile :
                                    </span>
                                    <div className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
                                        <code className="text-xs text-slate-300 break-all select-all font-mono">
                                            {getAppDownloadUrl(activeTab)}
                                        </code>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
