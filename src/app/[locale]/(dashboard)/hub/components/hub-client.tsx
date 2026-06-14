"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { VoiceAssistantWidget } from "@/components/ui/voice-assistant-widget";
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
    X,
    Wifi,
    Download,
    LayoutGrid,
    ChevronLeft,
    ArrowRightLeft,
    History,
    ShieldCheck,
    TrendingUp,
    ShieldAlert,
    ArrowDownCircle,
    ArrowUpCircle,
    type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useEffect } from "react";
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
    accentColor: string; // Hex color for SVG lines
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
    const [viewMode, setViewMode] = useState<"grid" | "custom">("custom");
    
    // Configurable Hub states
    const [customButtons, setCustomButtons] = useState<string[]>([]);
    const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

    // Load custom hub buttons from LocalStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("syncloudpos_custom_hub_links");
            if (stored) {
                try {
                    setCustomButtons(JSON.parse(stored));
                } catch {
                    setCustomButtons(["/pos", "/dashboard", "/products", "/sales"]);
                }
            } else {
                setCustomButtons(["/pos", "/dashboard", "/products", "/sales", "/treasury?action=manual-credit", "/treasury?action=manual-debit"]);
            }

            // Load saved custom buttons from LocalStorage
            const savedViewMode = localStorage.getItem("syncloudpos_hub_view_mode");
            // Always default to custom (Mon Hub Perso) on fresh load/entry
            setViewMode("custom");
        }
    }, []);

    const changeViewMode = (mode: "grid" | "custom") => {
        setViewMode(mode);
        if (typeof window !== "undefined") {
            localStorage.setItem("syncloudpos_hub_view_mode", mode);
        }
    };

    const toggleCustomButton = (href: string) => {
        setCustomButtons(prev => {
            const next = prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href];
            if (typeof window !== "undefined") {
                localStorage.setItem("syncloudpos_custom_hub_links", JSON.stringify(next));
                localStorage.setItem("syncloudpos_hub_view_mode", "custom");
            }
            return next;
        });
        setViewMode("custom");
    };

    const isLocal = typeof window !== "undefined" && (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.startsWith("192.168.")
    );

    const getAppDownloadUrl = (tab: "gerant" | "tournee") => {
        if (isLocal) {
            return "exp://192.168.0.132:8081";
        }
        return tab === "gerant"
            ? "https://chirpedbeo.online/downloads/syncloudpos-gerant-v2.3.2.apk"
            : "https://chirpedbeo.online/downloads/syncloudpos-tournee-v1.0.0.apk";
    };

    // ═══════════════ Quick Actions ═══════════════
    const quickActions = useMemo(() => [
        { label: "POS / Caisse", href: "/pos", icon: Store, gradient: "linear-gradient(135deg, #3b82f6, #06b6d4)" },
        { label: t("links.dashboard") || "Tableau de Bord", href: "/dashboard", icon: LayoutDashboard, gradient: "linear-gradient(135deg, #6366f1, #a855f7)" },
        { label: t("links.products") || "Catalogue Produits", href: "/products", icon: Package, gradient: "linear-gradient(135deg, #10b981, #059669)" },
        { label: t("links.allSales") || "Bons de Livraison", href: "/sales", icon: ShoppingCart, gradient: "linear-gradient(135deg, #f59e0b, #ea580c)" },
        { label: t("links.analytics") || "Analyses & KPI", href: "/analytics", icon: LineChart, gradient: "linear-gradient(135deg, #ef4444, #db2777)" },
    ], [t]);

    // ═══════════════ Module Sections with enriched direct functionalities ═══════════════
    const sections: ModuleSection[] = useMemo(() => [
        {
            id: "pos-sales",
            title: t("sections.posSales.title") || "Ventes & Facturation",
            description: t("sections.posSales.description") || "Caisse POS tactile, commandes et livraisons",
            icon: ShoppingCart,
            accentFrom: "#3b82f6",
            accentTo: "#06b6d4",
            accentColor: "#3b82f6",
            stat: metrics.salesCount.toLocaleString(),
            statLabel: t("stats.sales") || "Commandes",
            links: [
                { label: t("links.pos") || "Écran POS (Caisse)", href: "/pos", icon: Store },
                { label: t("links.allSales") || "Bons de Commande/BL", href: "/sales", icon: ShoppingCart },
                { label: t("links.returns") || "Retours & Remboursements", href: "/retours", icon: ArrowRightLeft, badge: "Nouveau", badgeColor: "#a855f7" },
                { label: t("links.recurringInvoices") || "Factures Récurrentes", href: "/recurring-invoices", icon: Repeat },
                { label: t("links.reservations") || "Réservations Clients", href: "/reservations", icon: Package2 },
                { label: t("links.delivery") || "Expéditions & Livraisons", href: "/delivery", icon: MapPin },
                { label: t("links.driverTracking") || "Suivi Livreur GPS", href: "/driver-tracking", icon: MapPin },
                { label: "Portail Livreur Terrain", href: "/driver", icon: Truck },
                { label: t("links.payments") || "Paiements & Règlements", href: "/payments", icon: CreditCard },
            ],
        },
        {
            id: "catalog",
            title: t("sections.catalog.title") || "Stocks & Catalogue",
            description: t("sections.catalog.description") || "Produits, variations, inventaires et code-barres",
            icon: Package,
            accentFrom: "#10b981",
            accentTo: "#34d399",
            accentColor: "#10b981",
            stat: metrics.productsCount.toLocaleString(),
            statLabel: t("stats.products") || "Articles",
            links: [
                { label: t("links.products") || "Catalogue Produits", href: "/products", icon: Package, description: `${metrics.productsCount}` },
                { label: t("links.stock") || "Contrôle du Stock", href: "/products/stock", icon: ClipboardList },
                { label: t("links.categories") || "Familles / Catégories", href: "/categories", icon: List, description: `${metrics.categoriesCount}` },
                { label: t("links.brands") || "Marques de Produits", href: "/brands", icon: Tag, description: `${metrics.brandsCount}` },
                { label: t("links.promotions") || "Promotions & Offres", href: "/promotions", icon: Gift },
                { label: t("links.transfers") || "Transferts Inter-Dépôts", href: "/transfers", icon: ArrowRightLeft },
                { label: t("links.barcodeLabels") || "Étiquettes Codes-barres", href: "/barcode-labels", icon: Tag },
                { label: t("links.damages") || "Registre des Avaries", href: "/avaries", icon: Package },
                { label: t("links.reorder") || "Réapprovisionnements", href: "/reorder", icon: RefreshCw },
                { label: t("links.inventoryAudit") || "Audits d'Inventaires", href: "/inventory-audit", icon: ClipboardList },
            ],
        },
        {
            id: "purchases",
            title: t("sections.purchases.title") || "Fournisseurs & Achats",
            description: t("sections.purchases.description") || "Bons de commande achats et notes de frais",
            icon: Truck,
            accentFrom: "#f59e0b",
            accentTo: "#fbbf24",
            accentColor: "#f59e0b",
            stat: metrics.purchasesCount.toLocaleString(),
            statLabel: t("links.purchases") || "Bons d'Achat",
            links: [
                { label: t("links.purchases") || "Bons d'Achat / Factures", href: "/purchases", icon: ShoppingBag, description: `${metrics.purchasesCount}` },
                { label: t("links.suppliers") || "Fiches Fournisseurs", href: "/suppliers", icon: Truck, description: `${metrics.suppliersCount}` },
                { label: t("links.returns") || "Retours Fournisseurs", href: "/retours", icon: ArrowRightLeft },
                { label: t("links.expenses") || "Dépenses & Charges", href: "/expenses", icon: FileText, description: `${metrics.expensesCount}` },
                { label: t("links.supplierLoan") || "Emprunts Fournisseurs", href: "/emprunt-fournisseur", icon: Building2 },
            ],
        },
        {
            id: "customers",
            title: t("sections.customers.title") || "Clients & Dettes",
            description: t("sections.customers.description") || "Gestion de la clientèle et crédits clients",
            icon: Users,
            accentFrom: "#8b5cf6",
            accentTo: "#a78bfa",
            accentColor: "#8b5cf6",
            stat: metrics.customersCount.toLocaleString(),
            statLabel: t("stats.clients") || "Clients",
            links: [
                { label: t("links.customers") || "Registre Clients", href: "/customers", icon: Users, description: `${metrics.customersCount}` },
                { label: t("links.customerLoan") || "Dettes & Emprunts", href: "/emprunt", icon: Landmark },
                { label: t("links.reservations") || "Réservations Clients", href: "/reservations", icon: Package2 },
            ],
        },
        {
            id: "treasury",
            title: t("sections.treasury.title") || "Finances & Trésorerie",
            description: t("sections.treasury.description") || "Suivi des caisses, banques et rapprochements",
            icon: Wallet,
            accentFrom: "#06b6d4",
            accentTo: "#2dd4bf",
            accentColor: "#06b6d4",
            links: [
                { label: t("links.treasuryOverview") || "Comptes de Trésorerie", href: "/treasury", icon: Wallet },
                { label: "Entrée de Caisse (Hors-ERP)", href: "/treasury?action=manual-credit", icon: ArrowDownCircle },
                { label: "Sortie de Caisse (Hors-ERP)", href: "/treasury?action=manual-debit", icon: ArrowUpCircle },
                { label: "Virement Interne", href: "/treasury?action=transfer", icon: ArrowRightLeft },
                { label: t("links.cheques") || "Suivi des Chèques", href: "/treasury/cheques", icon: Receipt },
                { label: t("links.reconciliation") || "Rapprochement Bancaire", href: "/treasury/reconciliation", icon: RefreshCw },
                { label: t("links.payments") || "Registre des Flux", href: "/payments", icon: CreditCard },
                { label: t("links.dailyClose") || "Clôtures de Caisse", href: "/cloture", icon: LockKeyhole },
            ],
        },
        {
            id: "reports",
            title: t("sections.reports.title") || "Analyses & Rapports",
            description: t("sections.reports.description") || "Fiscalité algérienne et rapports de rentabilité",
            icon: BarChart3,
            accentFrom: "#ef4444",
            accentTo: "#f87171",
            accentColor: "#ef4444",
            links: [
                { label: t("links.reports") || "Rapports d'Activité", href: "/reports", icon: BarChart3 },
                { label: t("links.analytics") || "Analytiques Graphiques", href: "/analytics", icon: LineChart },
                { label: t("links.salesJournal") || "Journaux Comptables", href: "/journals", icon: BookOpen },
                { label: "Marge & Rentabilité", href: "/reports/profit", icon: TrendingUp },
                { label: t("links.fiscal") || "Impôts G50 / IFU / TAP", href: "/fiscal", icon: Receipt },
                { label: t("links.annualInventory") || "Inventaires Annuels", href: "/inventaire-annuel", icon: Package },
                { label: t("links.commissions") || "Commissions Vendeurs", href: "/commissions", icon: Award },
            ],
        },
        {
            id: "system",
            title: t("sections.system.title") || "Paramètres & Sécurité",
            description: t("sections.system.description") || "Configuration, utilisateurs et fiches boutiques",
            icon: Settings,
            accentFrom: "#64748b",
            accentTo: "#94a3b8",
            accentColor: "#64748b",
            links: [
                { label: t("links.settings") || "Configuration Générale", href: "/settings", icon: Settings },
                { label: t("links.company") || "Ma Fiche Entreprise", href: "/company", icon: Store },
                { label: t("links.users") || "Gestion des Rôles", href: "/users", icon: Users },
                { label: t("links.auditLog") || "Journaux d'Audit & Sécurité", href: "/audit-log", icon: History },
                { label: t("links.training") || "ERP Mode d'Emploi", href: "/formation", icon: BookOpen },
                { label: t("links.dashboard") || "Dashboard Classique", href: "/dashboard", icon: LayoutDashboard },
                { label: t("links.mobileConnect") || "Connexion Mobile App", href: "/mobile-connect", icon: Smartphone, badge: "Expo", badgeColor: "#10b981" },
            ],
        },
    ], [t, metrics]);

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
    const statCards = useMemo(() => [
        { label: t("stats.products") || "Produits Actifs", value: metrics.productsCount, icon: Package, from: "#10b981", to: "#34d399", shadowColor: "rgba(16,185,129,0.25)" },
        { label: t("stats.sales") || "Total Ventes (BL)", value: metrics.salesCount, icon: ShoppingCart, from: "#3b82f6", to: "#60a5fa", shadowColor: "rgba(59,130,246,0.25)" },
        { label: t("stats.clients") || "Clients Enregistrés", value: metrics.customersCount, icon: Users, from: "#8b5cf6", to: "#a78bfa", shadowColor: "rgba(139,92,246,0.25)" },
        { label: t("stats.suppliers") || "Fournisseurs", value: metrics.suppliersCount, icon: Truck, from: "#f59e0b", to: "#fbbf24", shadowColor: "rgba(245,158,11,0.25)" },
    ], [t, metrics]);

    // Prepare custom links
    const selectedLinks = useMemo(() => {
        const allLinks: (QuickLink & { accentFrom: string; accentTo: string; sectionId: string })[] = [];
        sections.forEach(sec => {
            sec.links.forEach(l => {
                allLinks.push({
                    ...l,
                    accentFrom: sec.accentFrom,
                    accentTo: sec.accentTo,
                    sectionId: sec.id
                });
            });
        });
        return allLinks.filter(l => customButtons.includes(l.href));
    }, [sections, customButtons]);

    return (
        <div className="relative min-h-screen bg-[#020205] text-white overflow-x-hidden select-none">
            {/* CSS ANIMATION STYLES FOR RADAR & DATA FLOW */}
            <style>{`
                @keyframes pulseReactor {
                    0%, 100% { transform: scale(1); opacity: 0.9; box-shadow: 0 0 50px rgba(6, 182, 212, 0.4), inset 0 0 20px rgba(59, 130, 246, 0.2); }
                    50% { transform: scale(1.05); opacity: 1; box-shadow: 0 0 70px rgba(16, 185, 129, 0.5), inset 0 0 30px rgba(6, 182, 212, 0.4); }
                }
                @keyframes radarSweep {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes floatSlow {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-6px) rotate(1.5deg); }
                }
                @keyframes dataFlow {
                    0% { stroke-dashoffset: 240; }
                    100% { stroke-dashoffset: 0; }
                }
                @keyframes scanner-line {
                    0% { top: 0%; opacity: 0.1; }
                    50% { top: 100%; opacity: 0.7; }
                    100% { top: 0%; opacity: 0.1; }
                }
                @keyframes scanner-horizontal {
                    0% { left: -100%; }
                    50% { left: 100%; }
                    100% { left: -100%; }
                }
                @keyframes neonGlowPulse {
                    0%, 100% { opacity: 0.4; filter: blur(20px); }
                    50% { opacity: 0.8; filter: blur(30px); }
                }
                .radar-line {
                    transform-origin: 50% 50%;
                    animation: radarSweep 18s linear infinite;
                }
                .flowing-packet {
                    stroke-dasharray: 8, 80;
                    animation: dataFlow 4s linear infinite;
                }
                .flowing-packet-fast {
                    stroke-dasharray: 12, 60;
                    animation: dataFlow 2s linear infinite;
                }
                .cyber-grid {
                    background-image: 
                        linear-gradient(rgba(6, 182, 212, 0.015) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(6, 182, 212, 0.015) 1px, transparent 1px);
                    background-size: 45px 45px;
                }
                .cyber-corner {
                    position: relative;
                }
                .cyber-corner::before {
                    content: '';
                    position: absolute;
                    top: -1px;
                    left: -1px;
                    width: 10px;
                    height: 10px;
                    border-top: 2px solid var(--accent, #3b82f6);
                    border-left: 2px solid var(--accent, #3b82f6);
                    pointer-events: none;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    opacity: 0.6;
                }
                .cyber-corner::after {
                    content: '';
                    position: absolute;
                    bottom: -1px;
                    right: -1px;
                    width: 10px;
                    height: 10px;
                    border-bottom: 2px solid var(--accent, #3b82f6);
                    border-right: 2px solid var(--accent, #3b82f6);
                    pointer-events: none;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    opacity: 0.6;
                }
                .group:hover .cyber-corner::before {
                    width: 18px;
                    height: 18px;
                    opacity: 1;
                }
                .group:hover .cyber-corner::after {
                    width: 18px;
                    height: 18px;
                    opacity: 1;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            {/* ═══════ Advanced Glow Orbs & Grid Background ═══════ */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute inset-0 cyber-grid opacity-[0.8]" />
                
                {/* Parallax Glowing space depth */}
                <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-900/10 blur-[130px] animate-pulse" style={{ animationDuration: "14s" }} />
                <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/15 blur-[150px] animate-pulse" style={{ animationDuration: "18s" }} />
                <div className="absolute top-[25%] left-[20%] w-[50%] h-[50%] rounded-full bg-emerald-950/5 blur-[170px]" />
                <div className="absolute bottom-[20%] left-[-5%] w-[40%] h-[40%] rounded-full bg-cyan-900/5 blur-[130px]" />
            </div>

            <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 space-y-8">
                
                {/* ═══════════ CODESCAPE SCI-FI HEADER ═══════════ */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="relative overflow-hidden rounded-[24px] border border-white/[0.04] backdrop-blur-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)]"
                    style={{
                        background: "linear-gradient(135deg, rgba(6,8,20,0.85) 0%, rgba(10,9,26,0.75) 50%, rgba(6,8,20,0.85) 100%)",
                    }}
                >
                    <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/40 to-emerald-500/20" />
                    
                    <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-6 p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                            <motion.div
                                whileHover={{ scale: 1.04, rotate: 1.5 }}
                                transition={{ type: "spring", stiffness: 350, damping: 12 }}
                                className="relative shrink-0"
                            >
                                <div className="absolute -inset-2 rounded-2xl blur-xl opacity-60 bg-gradient-to-tr from-cyan-500 via-emerald-500 to-indigo-500 animate-pulse" style={{ animationDuration: "6s" }} />
                                <div className="relative w-16 h-16 flex items-center justify-center rounded-2xl shadow-2xl bg-gradient-to-br from-[#0c0f24] to-[#050611] border border-white/10">
                                    <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 shadow-lg shadow-cyan-500/20">
                                        <Store className="w-5.5 h-5.5 text-white" />
                                    </div>
                                </div>
                            </motion.div>
                            <div>
                                <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center sm:justify-start gap-2.5">
                                    SYNCLOUD<span className="bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent font-black tracking-widest text-2xl">POS</span>
                                    <span className="text-[9px] font-mono tracking-widest font-bold px-2 py-0.5 rounded bg-slate-900 border border-white/5 text-slate-500 uppercase">v1.8</span>
                                </h1>
                                <p className="text-[10px] sm:text-xs text-slate-400 font-extrabold uppercase mt-1.5 tracking-[0.2em] flex items-center gap-2 justify-center sm:justify-start">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    {t("commandCenter") || "Centre de Contrôle Général"} 
                                    <span className="text-slate-700">|</span> 
                                    <span className="bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 bg-clip-text text-transparent font-medium">{t("subtitle") || "Premium POS & ERP"}</span>
                                </p>
                            </div>
                        </div>

                        {/* HIGH-TECH VIEW MODE SWITCHER & REAL-TIME SEARCH */}
                        <div className="flex flex-col lg:flex-row items-center gap-4 w-full xl:w-auto">
                            <div className="relative flex p-1 rounded-2xl bg-slate-950/80 border border-white/[0.04] w-full lg:w-auto overflow-hidden">
                                {/* Slide indicators will glow according to active views */}
                                <button
                                    onClick={() => changeViewMode("grid")}
                                    className={`relative z-10 flex-1 lg:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-wider transition-all duration-300 cursor-pointer ${
                                        viewMode === "grid"
                                            ? "text-cyan-400 shadow-md"
                                            : "text-slate-500 hover:text-slate-300"
                                    }`}
                                >
                                    {viewMode === "grid" && (
                                        <motion.div 
                                            layoutId="activeTab"
                                            className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-900/30 to-cyan-900/20 border border-cyan-500/30 -z-10 shadow-[inset_0_1px_8px_rgba(6,182,212,0.15)]"
                                        />
                                    )}
                                    <LayoutGrid className="w-4 h-4" />
                                    GRILLE DE CONTRÔLE
                                </button>
                                <button
                                    onClick={() => changeViewMode("custom")}
                                    className={`relative z-10 flex-1 lg:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-wider transition-all duration-300 cursor-pointer ${
                                        viewMode === "custom"
                                            ? "text-emerald-400 shadow-md"
                                            : "text-slate-500 hover:text-slate-300"
                                    }`}
                                >
                                    {viewMode === "custom" && (
                                        <motion.div 
                                            layoutId="activeTab"
                                            className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-900/30 to-indigo-900/20 border border-indigo-500/30 -z-10 shadow-[inset_0_1px_8px_rgba(139,92,246,0.15)]"
                                        />
                                    )}
                                    <Zap className="w-4 h-4" />
                                    MON HUB PERSO
                                </button>
                            </div>

                            <div className="relative w-full lg:w-64">
                                <Search className="absolute left-3.5 top-3.5 w-3.5 h-3.5 text-slate-500" />
                                <span className="absolute left-2.5 top-[18px] w-1 h-1 bg-cyan-400 rounded-full animate-ping pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t("searchPlaceholder") || "Rechercher un module..."}
                                    className="w-full pl-10 pr-9 py-3 bg-slate-950/80 text-white placeholder:text-slate-600 rounded-xl text-xs outline-none border border-white/[0.04] focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/25 shadow-inner shadow-black/80 transition-all duration-300 font-bold"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2.5 p-1 rounded-md hover:bg-slate-900 text-slate-400 transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.header>

                {/* ═══════════ COGNITIVE DIAGNOSTIC STAT WIDGETS ═══════════ */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.6 }}
                    className="grid grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    {statCards.map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            whileHover={{ y: -4, scale: 1.01 }}
                            className="group relative overflow-hidden rounded-2xl p-5 bg-gradient-to-b from-[#090b16]/70 to-[#04050a]/90 backdrop-blur-2xl border border-white/[0.02] hover:border-slate-800 transition-all duration-300 shadow-[0_10px_35px_rgba(0,0,0,0.6)]"
                            style={{
                                boxShadow: `0 4px 30px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.02)`,
                            }}
                        >
                            {/* Diagnostic brackets */}
                            <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-slate-700/60 pointer-events-none" />
                            <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-slate-700/60 pointer-events-none" />
                            <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-slate-700/60 pointer-events-none" />
                            <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-slate-700/60 pointer-events-none" />

                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-0 group-hover:opacity-15 transition-opacity duration-500 blur-2xl pointer-events-none"
                                style={{ background: stat.from }}
                            />
                            
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest block text-slate-500 group-hover:text-slate-300 transition-colors">
                                        {stat.label}
                                    </span>
                                    <span className="text-2xl font-black tracking-tight block tabular-nums bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent"
                                        style={{ textShadow: `0 0 15px ${stat.from}15` }}
                                    >
                                        {stat.value.toLocaleString()}
                                    </span>
                                    
                                    {/* Beautiful Diagnostic Trend Indicator */}
                                    <div className="flex items-center gap-1.5 pt-1.5">
                                        <span className="text-[8px] font-mono font-bold text-slate-600 block">SYSTEM STATUS:</span>
                                        <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 flex items-center gap-0.5 tracking-wider">
                                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                            OK
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col items-end gap-3 shrink-0">
                                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg border border-white/[0.04] transition-all duration-300 group-hover:scale-105"
                                        style={{
                                            background: `linear-gradient(135deg, ${stat.from}10, ${stat.to}18)`,
                                            boxShadow: `0 8px 24px -8px ${stat.shadowColor}`,
                                        }}
                                    >
                                        <stat.icon className="w-5 h-5 transition-transform duration-500 group-hover:rotate-[360deg]" style={{ color: stat.from }} />
                                    </div>
                                    
                                    {/* Breathtaking Sparkline underlay */}
                                    <svg className="w-12 h-5 opacity-25 group-hover:opacity-60 transition-opacity" viewBox="0 0 100 30" fill="none">
                                        <path 
                                            d={i === 0 ? "M0 25 Q20 5, 40 20 T80 10 T100 15" : i === 1 ? "M0 10 Q25 25, 50 15 T85 5 T100 20" : i === 2 ? "M0 20 Q30 5, 60 25 T90 10 T100 5" : "M0 15 Q20 25, 40 10 T80 20 T100 12"} 
                                            stroke={stat.from} 
                                            strokeWidth="2.5" 
                                            strokeLinecap="round" 
                                        />
                                    </svg>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* ═══════════ MAIN HUB LAYOUT CONFIG ═══════════ */}
                <AnimatePresence mode="wait">
                    {viewMode === "grid" ? (
                        
                        /* ═══════════ Standard Glass Panel Grid ═══════════ */
                        <motion.div
                            key="grid"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-8"
                        >
                            {/* SYSTEM QUICK SHORTCUTS DOCK */}
                            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950/60 to-slate-950/30 border border-white/[0.03] space-y-4 backdrop-blur-3xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl pointer-events-none" />
                                <div className="flex items-center justify-between text-slate-500 px-1">
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t("quickAccess") || "Raccourcis Système"}</h2>
                                    </div>
                                    <span className="text-[8px] font-mono font-bold tracking-widest text-slate-600 uppercase">Online Terminal Launcher</span>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {quickActions.map((action, i) => (
                                        <motion.div
                                            key={action.href}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: i * 0.03 }}
                                        >
                                            <Link
                                                href={action.href}
                                                className="group flex items-center gap-3 px-4.5 py-3 rounded-xl bg-[#070810]/70 hover:bg-[#0f1122]/90 border border-white/[0.02] hover:border-slate-800 active:scale-[0.98] transition-all duration-300 shadow-md hover:shadow-cyan-500/[0.03]"
                                            >
                                                <div className="w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
                                                    style={{ background: action.gradient }}>
                                                    <action.icon className="w-4 h-4 text-white" />
                                                </div>
                                                <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">
                                                    {action.label}
                                                </span>
                                                <ArrowRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
                                            </Link>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* MAIN MODULE SECTIONS GRID */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredSections.map((section, idx) => (
                                    <motion.div
                                        key={section.id}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        onMouseEnter={() => setHoveredCard(section.id)}
                                        onMouseLeave={() => setHoveredCard(null)}
                                        className="h-full"
                                    >
                                        <div
                                            style={{
                                                "--accent": section.accentFrom,
                                                boxShadow: hoveredCard === section.id
                                                    ? `0 20px 45px -15px ${section.accentFrom}18, inset 0 1px 0 rgba(255,255,255,0.03)`
                                                    : "0 12px 35px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.01)",
                                            } as React.CSSProperties}
                                            className="group relative flex flex-col h-full rounded-2xl overflow-hidden bg-gradient-to-b from-[#080a18]/70 to-[#04050a]/90 border border-white/[0.02] hover:border-slate-800/80 transition-all duration-300 hover:-translate-y-1 cyber-corner"
                                        >
                                            {/* Glowing card border sweep line */}
                                            <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 overflow-hidden"
                                                style={{
                                                    background: `linear-gradient(90deg, transparent, ${section.accentFrom}, transparent)`,
                                                }}
                                            />
                                            
                                            {/* Laser scanning strip inside the card */}
                                            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

                                            <div className="relative z-10 flex flex-col h-full p-5.5">
                                                <div className="flex items-start justify-between pb-3.5 mb-4 border-b border-white/[0.04]">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2.5 rounded-xl shrink-0 border border-white/[0.03] transition-all duration-300 group-hover:scale-105"
                                                            style={{
                                                                background: `linear-gradient(135deg, ${section.accentFrom}15, ${section.accentTo}20)`,
                                                                boxShadow: `0 4px 15px -4px ${section.accentFrom}40`,
                                                            }}
                                                        >
                                                            <section.icon className="w-4.5 h-4.5" style={{ color: section.accentFrom }} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="text-xs font-black tracking-widest text-white uppercase group-hover:text-slate-100 flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-700 transition-colors" style={{ backgroundColor: hoveredCard === section.id ? section.accentFrom : undefined }} />
                                                                {section.title}
                                                            </h3>
                                                            <p className="text-[10px] text-slate-500 font-bold mt-0.5 leading-relaxed truncate max-w-[200px]">
                                                                {section.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {section.stat && (
                                                        <div className="flex flex-col items-end shrink-0 ml-3">
                                                            <span className="text-base font-black tracking-tight tabular-nums font-mono" style={{ color: section.accentFrom }}>
                                                                {section.stat}
                                                            </span>
                                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                                                                {section.statLabel}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-1.5 mt-auto">
                                                    {section.links.map((link) => {
                                                        const isMobileConnect = link.href === "/mobile-connect";
                                                        const itemClass = "group/link flex items-center justify-between w-full p-2.5 rounded-xl bg-slate-950/45 hover:bg-slate-900/60 border border-white/[0.01] hover:border-slate-800/80 active:scale-[0.99] transition-all duration-200 cursor-pointer overflow-hidden relative";
                                                        
                                                        const linkHoverIndicator = (
                                                            <div className="absolute left-0 top-0 bottom-0 w-0 bg-transparent group-hover/link:w-[2.5px] transition-all duration-200"
                                                                style={{ backgroundColor: section.accentFrom }}
                                                            />
                                                        );

                                                        const content = (
                                                            <div className="flex items-center justify-between w-full gap-3 z-10 transition-transform duration-200 group-hover/link:translate-x-1">
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className="w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 border border-white/[0.02] bg-slate-950 text-slate-500 group-hover/link:text-white transition-colors"
                                                                        style={{ color: hoveredCard === section.id ? section.accentFrom : undefined }}>
                                                                        <link.icon className="w-3.5 h-3.5 shrink-0" />
                                                                    </div>
                                                                    <span className="text-xs font-bold text-slate-400 group-hover/link:text-white transition-colors truncate">
                                                                        {link.label}
                                                                    </span>
                                                                    {link.badge && (
                                                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md border shrink-0 animate-pulse"
                                                                            style={{
                                                                                backgroundColor: `${link.badgeColor || '#10b981'}15`,
                                                                                color: link.badgeColor || '#10b981',
                                                                                borderColor: `${link.badgeColor || '#10b981'}30`
                                                                            }}>
                                                                            {link.badge}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {link.description && (
                                                                        <span className="text-[9px] font-extrabold tabular-nums px-1.5 py-0.5 rounded font-mono"
                                                                            style={{
                                                                                background: `${section.accentFrom}15`,
                                                                                color: section.accentFrom
                                                                            }}>
                                                                            {link.description}
                                                                        </span>
                                                                    )}
                                                                    <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover/link:text-white group-hover/link:translate-x-0.5 transition-all" />
                                                                </div>
                                                            </div>
                                                        );

                                                        if (isMobileConnect) {
                                                            return (
                                                                <button
                                                                    key={link.href + link.label}
                                                                    type="button"
                                                                    onClick={() => setShowQrModal(true)}
                                                                    className={itemClass}
                                                                >
                                                                    {linkHoverIndicator}
                                                                    {content}
                                                                </button>
                                                            );
                                                        }

                                                        return (
                                                            <Link
                                                                key={link.href + link.label}
                                                                href={link.href}
                                                                className={itemClass}
                                                            >
                                                                {linkHoverIndicator}
                                                                {content}
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        /* ═══════════ Custom Configurable Hub View ═══════════ */
                        <motion.div
                            key="custom"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-6"
                        >
                            <div className="flex flex-col sm:flex-row items-center justify-between p-5 bg-gradient-to-r from-slate-950/80 to-slate-950/45 border border-white/[0.04] rounded-2xl backdrop-blur-3xl gap-4">
                                <div className="text-center sm:text-left">
                                    <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center justify-center sm:justify-start gap-2.5">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        Mon Hub Paramétrable
                                    </h2>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1">Accédez instantanément à vos modules et actions favoris.</p>
                                </div>
                                <button 
                                    onClick={() => setIsCustomizerOpen(true)}
                                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer shrink-0 flex items-center gap-2"
                                >
                                    ⚙️ Configurer mon Hub
                                </button>
                            </div>

                            {selectedLinks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center bg-gradient-to-b from-slate-950/50 to-transparent rounded-3xl border border-dashed border-white/[0.04] p-6 relative overflow-hidden min-h-[380px]">
                                    {/* Holographic grid mockup inside empty state */}
                                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5 select-none">
                                        <div className="w-[300px] h-[300px] border border-cyan-500 rounded-full" />
                                        <div className="w-[150px] h-[150px] border border-dashed border-cyan-500 rounded-full absolute" />
                                    </div>
                                    
                                    <div className="w-16 h-16 rounded-2xl bg-slate-950 flex items-center justify-center mb-5 border border-slate-900 shadow-2xl shadow-emerald-500/5 relative">
                                        <div className="absolute -inset-1 rounded-2xl bg-emerald-500/10 animate-ping opacity-40" />
                                        <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
                                    </div>
                                    <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">
                                        Votre Hub est vide
                                    </h3>
                                    <p className="text-[10px] text-slate-500 mt-2.5 max-w-xs leading-relaxed font-bold">
                                        Sélectionnez les raccourcis système dont vous avez besoin pour configurer votre propre tableau de bord.
                                    </p>
                                    <button 
                                        onClick={() => setIsCustomizerOpen(true)} 
                                        className="mt-6 px-5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 font-bold text-xs cursor-pointer active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        ⚙️ Choisir mes Raccourcis
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {selectedLinks.map((link) => {
                                        const isMobileConnect = link.href === "/mobile-connect";
                                        const isDirectTransaction = link.href.startsWith("/treasury?action=");
                                        const itemClass = "group flex flex-col justify-between p-5 rounded-2xl bg-gradient-to-b from-[#090b16]/75 to-[#04050a]/95 border border-white/[0.02] hover:border-slate-800 shadow-xl hover:shadow-[0_15px_30px_-10px_rgba(0,0,0,0.9)] active:scale-[0.98] transition-all duration-300 relative overflow-hidden text-left cursor-pointer cyber-corner";
                                        
                                        const cardHeader = (
                                            <div className="absolute top-0 left-0 right-0 h-1 transition-colors"
                                                style={{
                                                    background: `linear-gradient(90deg, ${link.accentFrom}, ${link.accentTo})`,
                                                }}
                                            />
                                        );

                                        const cardContent = (
                                            <div className="flex flex-col h-full gap-4 mt-2">
                                                <div className="flex items-start justify-between">
                                                    <div className="p-2.5 rounded-xl shrink-0 border border-white/[0.03] bg-slate-900"
                                                        style={{
                                                            background: `${link.accentFrom}15`,
                                                            boxShadow: `0 4px 10px -4px ${link.accentFrom}40`,
                                                        }}
                                                    >
                                                        <link.icon className="w-4 h-4" style={{ color: link.accentFrom }} />
                                                    </div>
                                                    
                                                    {link.badge && (
                                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md border shrink-0 animate-pulse"
                                                            style={{
                                                                backgroundColor: `${link.badgeColor || '#10b981'}15`,
                                                                color: link.badgeColor || '#10b981',
                                                                borderColor: `${link.badgeColor || '#10b981'}30`
                                                            }}>
                                                            {link.badge}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <div>
                                                    <h4 className="text-xs font-black tracking-widest text-white uppercase group-hover:text-slate-100 flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-700 transition-colors" style={{ backgroundColor: link.accentFrom }} />
                                                        {link.label}
                                                    </h4>
                                                    <p className="text-[9px] text-slate-500 font-bold mt-1.5 leading-relaxed">
                                                        {isDirectTransaction ? "Saisie directe de trésorerie" : "Accès direct au module"}
                                                    </p>
                                                </div>

                                                <div className="flex items-center justify-end text-slate-700 group-hover:text-slate-400 transition-colors pt-2.5 border-t border-white/[0.03] mt-auto">
                                                    <span className="text-[8px] font-black tracking-widest uppercase mr-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 font-mono">LAUNCH</span>
                                                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-all" />
                                                </div>
                                            </div>
                                        );

                                        if (isMobileConnect) {
                                            return (
                                                <button
                                                    key={link.href + link.label}
                                                    type="button"
                                                    style={{ "--accent": link.accentFrom } as React.CSSProperties}
                                                    onClick={() => setShowQrModal(true)}
                                                    className={itemClass}
                                                >
                                                    {cardHeader}
                                                    {cardContent}
                                                </button>
                                            );
                                        }

                                        return (
                                            <Link
                                                key={link.href + link.label}
                                                href={link.href}
                                                style={{ "--accent": link.accentFrom } as React.CSSProperties}
                                                className={itemClass}
                                            >
                                                {cardHeader}
                                                {cardContent}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ═══════════ EMPTY SEARCH STATE ═══════════ */}
                {filteredSections.length === 0 && searchQuery && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-slate-950 flex items-center justify-center mb-4 border border-slate-900 shadow-xl shadow-cyan-500/5">
                            <Search className="w-5 h-5 text-slate-600 animate-pulse" />
                        </div>
                        <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">
                            {t("noResults") || "Aucun module trouvé"}
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-2.5 max-w-xs leading-relaxed font-bold">
                            {t("noResultsDesc", { query: searchQuery }) || `Aucune action ou section ne correspond à "${searchQuery}".`}
                        </p>
                    </motion.div>
                )}

                {/* ═══════════ FOOTER ═══════════ */}
                <motion.footer
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-white/[0.02] gap-3"
                >
                    <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.25em] text-slate-600 hover:text-slate-400 transition-colors select-none">
                        <Globe className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "20s" }} />
                        <span className="font-black">{t("footer") || "SYNCLOUDPOS PREMIUM DECK PANEL"}</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-700 tracking-widest select-none">
                        V1.8.2 ACTIVE DEPLOY
                    </span>
                </motion.footer>
            </div>

            {/* ═══════════ EXPO SCAN QR CODE MODAL ═══════════ */}
            <AnimatePresence>
                {showQrModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowQrModal(false)}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="relative w-full max-w-lg overflow-hidden rounded-[24px] bg-[#05060b] border border-white/[0.04] shadow-2xl flex flex-col z-10 p-6 space-y-5"
                        >
                            <div className="absolute top-[-10%] right-[-10%] w-36 h-36 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
                            <div className="absolute bottom-[-10%] left-[-10%] w-36 h-36 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

                            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.03]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/15 shrink-0">
                                        <Smartphone className="w-4.5 h-4.5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black text-white uppercase tracking-widest">
                                            {t("links.scanQrCode") || "Connexion Mobile App"}
                                        </h3>
                                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                                            {t("links.mobileConnectDesc") || "Scannez le QR Code pour connecter votre mobile"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowQrModal(false)}
                                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white border border-white/[0.03] transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex p-0.5 rounded-xl bg-slate-950 border border-white/[0.03]">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("gerant")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black tracking-wider transition-all cursor-pointer ${
                                        activeTab === "gerant"
                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm"
                                            : "text-slate-500 hover:text-slate-300 border border-transparent"
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${activeTab === "gerant" ? "bg-emerald-400 animate-pulse" : "bg-slate-700"}`} />
                                    APPLICATION GÉRANT
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("tournee")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black tracking-wider transition-all cursor-pointer ${
                                        activeTab === "tournee"
                                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm"
                                            : "text-slate-500 hover:text-slate-300 border border-transparent"
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${activeTab === "tournee" ? "bg-blue-400 animate-pulse" : "bg-slate-700"}`} />
                                    APPLICATION TOURNÉE
                                </button>
                            </div>

                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="flex flex-col items-center justify-center shrink-0">
                                    <div 
                                        className="p-3.5 bg-white rounded-2xl shadow-xl relative transition-all duration-300 overflow-hidden"
                                        style={{
                                            border: `3px solid ${activeTab === "gerant" ? "#10b981" : "#3b82f6"}`
                                        }}
                                    >
                                        <div 
                                            className="absolute left-0 right-0 h-0.5 z-10 opacity-70"
                                            style={{
                                                background: activeTab === "gerant" ? "#10b981" : "#3b82f6",
                                                boxShadow: `0 0 8px ${activeTab === "gerant" ? "#10b981" : "#3b82f6"}`,
                                                animation: "scanner-line 2.5s ease-in-out infinite"
                                            }}
                                        />
                                        <QRCodeSVG
                                            value={getAppDownloadUrl(activeTab)}
                                            size={130}
                                            level="H"
                                            includeMargin={false}
                                        />
                                    </div>
                                    <span className="text-[8px] uppercase tracking-widest font-black text-slate-500 mt-2.5">
                                        Scan QR to install
                                    </span>
                                </div>

                                <div className="flex-1 space-y-3">
                                    <h4 className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 flex items-center gap-1.5">
                                        <Wifi className="w-3.5 h-3.5" />
                                        {t("links.howToConnect") || "Instructions de connexion :"}
                                    </h4>
                                    
                                    <div className="space-y-2">
                                        <div className="flex gap-2 text-xs leading-relaxed text-slate-400">
                                            <div className="w-5 h-5 rounded bg-slate-900 flex items-center justify-center shrink-0 text-[10px] font-black border border-slate-800">1</div>
                                            <p className="flex-1 text-[10px] font-medium leading-relaxed">
                                                Scannez le QR code avec votre appareil pour charger la page de build.
                                            </p>
                                        </div>
                                        <div className="flex gap-2 text-xs leading-relaxed text-slate-400">
                                            <div className="w-5 h-5 rounded bg-slate-900 flex items-center justify-center shrink-0 text-[10px] font-black border border-slate-800">2</div>
                                            <p className="flex-1 text-[10px] font-medium leading-relaxed">
                                                Téléchargez la dernière version APK et installez-la sur votre téléphone.
                                            </p>
                                        </div>
                                        <div className="flex gap-2 text-xs leading-relaxed text-slate-400">
                                            <div className="w-5 h-5 rounded bg-slate-900 flex items-center justify-center shrink-0 text-[10px] font-black border border-slate-800">3</div>
                                            <p className="flex-1 text-[10px] font-medium leading-relaxed">
                                                Ouvrez l&apos;application et connectez-vous avec vos identifiants SynCloud.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-950 border border-white/[0.02] flex flex-col space-y-1.5">
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                                    <Download className="w-3.5 h-3.5" />
                                    Copier le lien direct de build :
                                </span>
                                <div className="bg-slate-900 px-3 py-2 rounded-lg border border-slate-950 overflow-x-auto flex items-center justify-between">
                                    <code className="text-[9px] text-slate-400 break-all select-all font-mono">
                                        {getAppDownloadUrl(activeTab)}
                                    </code>
                                    <button 
                                        onClick={() => {
                                            if (typeof navigator !== "undefined") {
                                                navigator.clipboard.writeText(getAppDownloadUrl(activeTab));
                                            }
                                        }}
                                        className="text-[9px] font-black text-emerald-400 hover:text-emerald-300 ml-2 uppercase shrink-0 cursor-pointer"
                                    >
                                        Copier
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══════════ HUB CUSTOMIZER MODAL ═══════════ */}
            <AnimatePresence>
                {isCustomizerOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCustomizerOpen(false)}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="relative w-full max-w-4xl overflow-hidden rounded-[24px] bg-[#05060b] border border-white/[0.04] shadow-2xl flex flex-col z-10 max-h-[90vh]"
                        >
                            {/* Ambient Glows */}
                            <div className="absolute top-[-10%] right-[-10%] w-48 h-48 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
                            <div className="absolute bottom-[-10%] left-[-10%] w-48 h-48 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/[0.03] shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-500 flex items-center justify-center shadow-lg shrink-0">
                                        <Zap className="w-4.5 h-4.5 text-white animate-bounce" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest">
                                            Personnaliser mon Hub
                                        </h3>
                                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                                            Sélectionnez les raccourcis à afficher sur votre tableau de bord personnel.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsCustomizerOpen(false)}
                                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white border border-white/[0.03] transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Options Scrollable List */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                                {sections.map((section) => (
                                    <div key={section.id} className="space-y-3">
                                        <div className="flex items-center gap-2 text-slate-400 px-1">
                                            <section.icon className="w-4.5 h-4.5" style={{ color: section.accentFrom }} />
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">{section.title}</h4>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            {section.links.map((link) => {
                                                const isSelected = customButtons.includes(link.href);
                                                return (
                                                    <button
                                                        key={link.href + link.label}
                                                        type="button"
                                                        onClick={() => toggleCustomButton(link.href)}
                                                        className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                                                            isSelected
                                                                ? "bg-slate-900/40 border-emerald-500/30 text-white shadow-lg"
                                                                : "bg-slate-950/20 border-white/[0.02] text-slate-400 hover:border-slate-800 hover:text-slate-200"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-white/[0.02]"
                                                                style={{
                                                                    background: isSelected ? `${section.accentFrom}20` : "rgba(255,255,255,0.01)",
                                                                    color: isSelected ? section.accentFrom : undefined
                                                                }}>
                                                                <link.icon className="w-3.5 h-3.5 shrink-0" />
                                                            </div>
                                                            <span className="text-[11px] font-bold truncate max-w-[150px]">
                                                                {link.label}
                                                            </span>
                                                        </div>
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                                            isSelected
                                                                ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                                                : "border-slate-700 bg-transparent"
                                                        }`}>
                                                            {isSelected && <span className="text-[10px] font-black">✓</span>}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer Buttons */}
                            <div className="p-6 border-t border-white/[0.03] bg-slate-950/40 flex items-center justify-end gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const allHrefs: string[] = [];
                                        sections.forEach(s => s.links.forEach(l => allHrefs.push(l.href)));
                                        setCustomButtons(allHrefs);
                                        localStorage.setItem("syncloudpos_custom_hub_links", JSON.stringify(allHrefs));
                                    }}
                                    className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-white/[0.02] text-slate-400 hover:text-white font-bold text-xs cursor-pointer transition-colors"
                                >
                                    Tout sélectionner
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCustomButtons([]);
                                        localStorage.setItem("syncloudpos_custom_hub_links", JSON.stringify([]));
                                    }}
                                    className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-white/[0.02] text-slate-400 hover:text-white font-bold text-xs cursor-pointer transition-colors"
                                >
                                    Tout désélectionner
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCustomizerOpen(false)}
                                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/10 cursor-pointer transition-colors"
                                >
                                    Terminer & Enregistrer
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
