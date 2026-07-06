"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
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
    Zap,
    Globe,
    Smartphone,
    X,
    Wifi,
    Download,
    ArrowRightLeft,
    History,
    TrendingUp,
    ArrowDownCircle,
    ArrowUpCircle,
    MessageCircle,
    HeadphonesIcon,
    ShieldCheck,
    Star,
    GripVertical,
    LayoutGrid,
    LayoutList,
    Grid3X3,
    Plus,
    Minus,
    Eye,
    EyeOff,
    RotateCcw,
    Clock,
    Keyboard,
    type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useHubSettings, type HubLayoutMode, type HubCardSize } from "./use-hub-settings";

/* ═══════════════════════════════════════════════════════
   TYPE DEFINITIONS
   ═══════════════════════════════════════════════════════ */

interface QuickAction {
    label: string;
    href: string;
    icon: LucideIcon;
    color: string;
    colorEnd: string;
    shadowColor: string;
    external?: boolean;
}

interface TabLink {
    label: string;
    href: string;
    icon: LucideIcon;
    color: string;
    description?: string;
    badge?: string;
    badgeColor?: string;
    keywords?: string[];
}

interface TabSection {
    id: string;
    label: string;
    icon: LucideIcon;
    accentColor: string;
    links: TabLink[];
}

/* ═══════════════════════════════════════════════════════
   ICON MAP — for serializing/deserializing icon names
   ═══════════════════════════════════════════════════════ */
const ICON_MAP: Record<string, LucideIcon> = {
    Package, ShoppingCart, Users, CreditCard, BarChart3, Settings, Truck,
    Wallet, Sparkles, Store, LayoutDashboard, FileText, List, Tag,
    ShoppingBag, LineChart, Landmark, Building2, BookOpen, Gift,
    LockKeyhole, RefreshCw, ClipboardList, Repeat, Receipt, Award,
    Package2, MapPin, ArrowRightLeft, History, TrendingUp,
    ArrowDownCircle, ArrowUpCircle, Smartphone, ShieldCheck,
};

function getIconName(icon: LucideIcon): string {
    for (const [name, ic] of Object.entries(ICON_MAP)) {
        if (ic === icon) return name;
    }
    return "Package";
}

/* ═══════════════════════════════════════════════════════
   GREETING HELPER
   ═══════════════════════════════════════════════════════ */
function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export const HubClient: React.FC = () => {
    const t = useTranslations("Hub");
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTabId, setActiveTabId] = useState("commerce");
    const [showQrModal, setShowQrModal] = useState(false);
    const [activeQrTab, setActiveQrTab] = useState<"gerant" | "tournee">("gerant");
    const [showQuickAccessPicker, setShowQuickAccessPicker] = useState(false);
    const [showTabManager, setShowTabManager] = useState(false);
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
    const [showTabLinksPicker, setShowTabLinksPicker] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const {
        settings,
        isLoaded,
        setQuickAccessOrder,
        addQuickAccess,
        removeQuickAccess,
        toggleFavorite,
        isFavorite,
        setTabOrder,
        toggleTabVisibility,
        isTabHidden,
        setTabLinks,
        addLinkToTab,
        removeLinkFromTab,
        setLayoutMode,
        setCardSize,
        addRecentlyVisited,
        resetSettings,
    } = useHubSettings();



    const isLocal = typeof window !== "undefined" && (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.startsWith("192.168.")
    );

    const getAppDownloadUrl = (tab: "gerant" | "tournee") => {
        if (isLocal) return "exp://192.168.0.132:8081";
        return tab === "gerant"
            ? "https://chirpedbeo.online/downloads/syncloudpos-gerant-v2.3.2.apk"
            : "https://chirpedbeo.online/downloads/syncloudpos-tournee-v1.0.0.apk";
    };

    /* ═══════════ ALL QUICK ACTIONS (FULL POOL) ═══════════ */
    const allQuickActions: QuickAction[] = useMemo(() => [
        { label: "POS / Caisse",  href: "/pos",            icon: Store,          color: "#3b82f6", colorEnd: "#2563eb", shadowColor: "rgba(59,130,246,0.35)" },
        { label: "Produits",      href: "/products",       icon: Package,        color: "#10b981", colorEnd: "#059669", shadowColor: "rgba(16,185,129,0.35)" },
        { label: "Stock",         href: "/products/stock", icon: ClipboardList,  color: "#14b8a6", colorEnd: "#0d9488", shadowColor: "rgba(20,184,166,0.35)" },
        { label: "Achats",        href: "/purchases",      icon: ShoppingBag,    color: "#f59e0b", colorEnd: "#d97706", shadowColor: "rgba(245,158,11,0.35)" },
        { label: "Ventes / BL",   href: "/sales",          icon: ShoppingCart,   color: "#8b5cf6", colorEnd: "#7c3aed", shadowColor: "rgba(139,92,246,0.35)" },
        { label: "Paiements",     href: "/payments",       icon: CreditCard,     color: "#22c55e", colorEnd: "#16a34a", shadowColor: "rgba(34,197,94,0.35)" },
        { label: "Retours",       href: "/retours",        icon: ArrowRightLeft, color: "#a855f7", colorEnd: "#9333ea", shadowColor: "rgba(168,85,247,0.35)" },
        { label: "Emprunts",      href: "/emprunt",        icon: Landmark,       color: "#f43f5e", colorEnd: "#e11d48", shadowColor: "rgba(244,63,94,0.35)" },
        { label: "Trésorerie",    href: "/treasury",       icon: Wallet,         color: "#06b6d4", colorEnd: "#0891b2", shadowColor: "rgba(6,182,212,0.35)" },
        { label: "Dépenses",      href: "/expenses",       icon: FileText,       color: "#ea580c", colorEnd: "#c2410c", shadowColor: "rgba(234,88,12,0.35)" },
        { label: "Clients",       href: "/customers",      icon: Users,          color: "#8b5cf6", colorEnd: "#7c3aed", shadowColor: "rgba(139,92,246,0.35)" },
        { label: "Fournisseurs",  href: "/suppliers",      icon: Truck,          color: "#f59e0b", colorEnd: "#d97706", shadowColor: "rgba(245,158,11,0.35)" },
        { label: "Rapports",      href: "/reports",        icon: BarChart3,      color: "#ef4444", colorEnd: "#dc2626", shadowColor: "rgba(239,68,68,0.35)" },
        { label: "Dashboard",     href: "/dashboard",      icon: LayoutDashboard,color: "#3b82f6", colorEnd: "#2563eb", shadowColor: "rgba(59,130,246,0.35)" },
        { label: "Catégories",    href: "/categories",     icon: List,           color: "#0ea5e9", colorEnd: "#0284c7", shadowColor: "rgba(14,165,233,0.35)" },
        { label: "Promotions",    href: "/promotions",     icon: Gift,           color: "#f43f5e", colorEnd: "#e11d48", shadowColor: "rgba(244,63,94,0.35)" },
        { label: "Réglages",      href: "/settings",       icon: Settings,       color: "#64748b", colorEnd: "#475569", shadowColor: "rgba(100,116,139,0.35)" },
        { label: "Livraisons",    href: "/delivery",       icon: MapPin,         color: "#14b8a6", colorEnd: "#0d9488", shadowColor: "rgba(20,184,166,0.35)" },
    ], []);

    const DEFAULT_QUICK_HREFS = useMemo(() => [
        "/pos", "/products", "/products/stock", "/purchases", "/sales",
        "/payments", "/retours", "/emprunt", "/treasury", "/expenses",
    ], []);

    // Get active quick actions in correct order
    const quickActions = useMemo(() => {
        const orderHrefs = settings.quickAccessOrder.length > 0
            ? settings.quickAccessOrder
            : DEFAULT_QUICK_HREFS;
        return orderHrefs
            .map(href => allQuickActions.find(a => a.href === href))
            .filter(Boolean) as QuickAction[];
    }, [settings.quickAccessOrder, allQuickActions, DEFAULT_QUICK_HREFS]);

    /* ═══════════ 5 GROUPED TABS ═══════════ */
    const allTabs: TabSection[] = useMemo(() => [
        {
            id: "commerce",
            label: "Commerce & Livraison",
            icon: ShoppingCart,
            accentColor: "#3b82f6",
            links: [
                { label: "Écran POS (Caisse)",        href: "/pos",                 icon: Store,          color: "#3b82f6", description: "Point de vente tactile complet" },
                { label: "Catalogue de Vente",         href: "/catalog",             icon: BookOpen,       color: "#f59e0b", description: "Vitrine pour vos clients" },
                { label: "Bons de Commande / BL",     href: "/sales",               icon: ShoppingCart,   color: "#6366f1", description: "Factures, devis et bons" },
                { label: "Paiements & Règlements",    href: "/payments",            icon: CreditCard,     color: "#22c55e", description: "Historique des encaissements" },
                { label: "Retours & Remboursements",  href: "/retours",             icon: ArrowRightLeft, color: "#a855f7", description: "Gestion des avoirs client", badge: "Nouveau", badgeColor: "#a855f7" },
                { label: "Factures Récurrentes",      href: "/recurring-invoices",   icon: Repeat,         color: "#0ea5e9", description: "Abonnements et loyers" },
                { label: "Réservations Clients",      href: "/reservations",         icon: Package2,       color: "#ec4899", description: "Articles mis de côté" },
                { label: "Expéditions & Livraisons",  href: "/delivery",             icon: MapPin,         color: "#14b8a6", description: "Gestion des expéditions" },
                { label: "Suivi Livreur GPS",         href: "/driver-tracking",      icon: MapPin,         color: "#22c55e", description: "Localisation en direct", badge: "Live", badgeColor: "#22c55e" },
                { label: "Portail Livreur Terrain",   href: "/driver",               icon: Truck,          color: "#f59e0b", description: "Interface smartphone livreur" },
                { label: "Clôtures de Caisse",        href: "/cloture",              icon: LockKeyhole,    color: "#ea580c", description: "Bilan journalier des ventes" },
                { label: "Commissions Vendeurs",      href: "/commissions",          icon: Award,          color: "#ec4899", description: "Prime et objectifs vendeurs" },
            ],
        },
        {
            id: "catalogue",
            label: "Catalogue & Inventaire",
            icon: Package,
            accentColor: "#10b981",
            links: [
                { label: "Catalogue Produits",       href: "/products",         icon: Package,        color: "#10b981", description: "Tous vos articles de vente" },
                { label: "Catalogue de Vente",       href: "/catalog",          icon: BookOpen,       color: "#f59e0b", description: "Interface vitrine pour client" },
                { label: "Contrôle du Stock",        href: "/products/stock",   icon: ClipboardList,  color: "#14b8a6", description: "Niveaux, alertes, ruptures" },
                { label: "Familles / Catégories",    href: "/categories",       icon: List,           color: "#0ea5e9", description: "Hiérarchie du catalogue" },
                { label: "Marques de Produits",      href: "/brands",           icon: Tag,            color: "#8b5cf6", description: "Fabricants et marques" },
                { label: "Promotions & Offres",      href: "/promotions",       icon: Gift,           color: "#f43f5e", description: "Réductions et soldes" },
                { label: "Transferts Inter-Dépôts",  href: "/transfers",        icon: ArrowRightLeft, color: "#f59e0b", description: "Mouvements de marchandise" },
                { label: "Étiquettes Codes-barres",  href: "/barcode-labels",   icon: Tag,            color: "#6366f1", description: "Impression codes-barres" },
                { label: "Registre des Avaries",     href: "/avaries",          icon: Package,        color: "#ea580c", description: "Produits périmés ou cassés" },
                { label: "Réapprovisionnements",     href: "/reorder",          icon: RefreshCw,      color: "#06b6d4", description: "Produits à commander" },
                { label: "Audits d'Inventaires",     href: "/inventory-audit",  icon: ClipboardList,  color: "#a855f7", description: "Contrôles ponctuels" },
                { label: "Inventaires Annuels",      href: "/inventaire-annuel", icon: Package,        color: "#14b8a6", description: "Bilan complet annuel" },
            ],
        },
        {
            id: "finances",
            label: "Finances & Trésorerie",
            icon: Wallet,
            accentColor: "#06b6d4",
            links: [
                { label: "Comptes de Trésorerie",       href: "/treasury",                     icon: Wallet,          color: "#06b6d4", description: "Vue d'ensemble des soldes" },
                { label: "Entrée de Caisse (Hors-ERP)", href: "/treasury?action=manual-credit", icon: ArrowDownCircle, color: "#22c55e", description: "Apport et crédit manuel" },
                { label: "Sortie de Caisse (Hors-ERP)", href: "/treasury?action=manual-debit",  icon: ArrowUpCircle,   color: "#ef4444", description: "Retrait et débit manuel" },
                { label: "Virement Interne",            href: "/treasury?action=transfer",      icon: ArrowRightLeft,  color: "#f59e0b", description: "Transfert entre caisses" },
                { label: "Paiements & Règlements",      href: "/payments",                      icon: CreditCard,      color: "#10b981", description: "Historique des versements" },
                { label: "Suivi des Chèques",           href: "/treasury/cheques",              icon: Receipt,         color: "#8b5cf6", description: "Échéances et portefeuille" },
                { label: "Rapprochement Bancaire",      href: "/treasury/reconciliation",       icon: RefreshCw,       color: "#3b82f6", description: "Validation comptable" },
                { label: "Clôtures de Caisse",          href: "/cloture",                       icon: LockKeyhole,     color: "#ea580c", description: "Arrêté journalier" },
                { label: "Dépenses & Charges",          href: "/expenses",                      icon: FileText,        color: "#f43f5e", description: "Achats internes (Loyer, etc.)" },
                { label: "Bons d'Achat / Factures",     href: "/purchases",                     icon: ShoppingBag,     color: "#f59e0b", description: "Achat de marchandises" },
                { label: "Commissions Vendeurs",        href: "/commissions",                   icon: Award,           color: "#ec4899", description: "Prime et objectifs" },
                { label: "Impôts G50 / IFU / TAP",     href: "/fiscal",                        icon: Receipt,         color: "#f59e0b", description: "Déclarations fiscales" },
            ],
        },
        {
            id: "partenaires",
            label: "Partenaires & Dettes",
            icon: Users,
            accentColor: "#8b5cf6",
            links: [
                { label: "Registre Clients",           href: "/customers",            icon: Users,       color: "#8b5cf6", description: "Annuaire et coordonnées" },
                { label: "Fiches Fournisseurs",        href: "/suppliers",            icon: Truck,       color: "#f59e0b", description: "Annuaire des partenaires" },
                { label: "Dettes & Emprunts Clients",  href: "/emprunt",              icon: Landmark,    color: "#f43f5e", description: "Crédits accordés et dus" },
                { label: "Emprunts Fournisseurs",      href: "/emprunt-fournisseur",  icon: Building2,   color: "#ea580c", description: "Dettes fournisseurs impayées" },
                { label: "Bons d'Achat / Factures",    href: "/purchases",            icon: ShoppingBag, color: "#3b82f6", description: "Historique des achats" },
                { label: "Réservations Clients",       href: "/reservations",         icon: Package2,    color: "#ec4899", description: "Articles mis de côté" },
                { label: "Expéditions & Livraisons",   href: "/delivery",             icon: MapPin,      color: "#14b8a6", description: "Suivi de colis" },
                { label: "Suivi Livreur GPS",          href: "/driver-tracking",      icon: MapPin,      color: "#22c55e", description: "Position en temps réel", badge: "Live", badgeColor: "#22c55e" },
            ],
        },
        {
            id: "analyses",
            label: "Analyses & Système",
            icon: BarChart3,
            accentColor: "#ef4444",
            links: [
                { label: "Rapports d'Activité",      href: "/reports",           icon: BarChart3,       color: "#ef4444", description: "Résumé des ventes" },
                { label: "Analytiques Graphiques",    href: "/analytics",         icon: LineChart,       color: "#6366f1", description: "Tableaux de bord visuels" },
                { label: "Marge & Rentabilité",       href: "/reports/profit",    icon: TrendingUp,      color: "#22c55e", description: "Bénéfice net et brut", keywords: ["benefice", "gain", "profit", "marge", "rentabilite", "rentabilité"] },
                { label: "Journaux Comptables",       href: "/journals",          icon: BookOpen,        color: "#0ea5e9", description: "Exports comptabilité" },
                { label: "Impôts G50 / IFU / TAP",   href: "/fiscal",            icon: Receipt,         color: "#f59e0b", description: "Déclarations fiscales" },
                { label: "Inventaires Annuels",       href: "/inventaire-annuel", icon: Package,         color: "#14b8a6", description: "Bilan général complet" },
                { label: "Commissions Vendeurs",      href: "/commissions",       icon: Award,           color: "#ec4899", description: "Prime et performance" },
                { label: "Dashboard Classique",       href: "/dashboard",         icon: LayoutDashboard, color: "#3b82f6", description: "Ancienne interface" },
                { label: "Assistant IA",              href: "/ai",                icon: Sparkles,        color: "#6366f1", description: "Chat et conseils" },
                { label: "Configuration Générale",    href: "/settings",          icon: Settings,        color: "#64748b", description: "Préférences système" },
                { label: "Ma Fiche Entreprise",       href: "/company",           icon: Store,           color: "#ea580c", description: "Informations légales" },
                { label: "Gestion des Rôles",         href: "/users",             icon: Users,           color: "#8b5cf6", description: "Accès et permissions" },
                { label: "Connexion Mobile App",      href: "/mobile-connect",    icon: Smartphone,      color: "#10b981", description: "Scanner le QR Code APK", badge: "App", badgeColor: "#10b981" },
                { label: "Super Admin",               href: "/superadmin",        icon: ShieldCheck,     color: "#f43f5e", description: "Outils de maintenance", badge: "Admin", badgeColor: "#f43f5e" },
                { label: "Journaux d'Audit",          href: "/audit-log",         icon: History,         color: "#a855f7", description: "Historique des actions" },
                { label: "ERP Mode d'Emploi",         href: "/formation",         icon: BookOpen,        color: "#06b6d4", description: "Guide d'utilisation" },
            ],
        },
    ], []);

    const handleRemoveLinkFromTab = useCallback((tabId: string, href: string) => {
        const defaultHrefs = allTabs.find(t => t.id === tabId)!.links.map(l => l.href);
        const currentHrefs = settings.customTabLinks[tabId] || defaultHrefs;
        const newHrefs = currentHrefs.filter(h => h !== href);
        setTabLinks(tabId, newHrefs);
    }, [allTabs, settings.customTabLinks, setTabLinks]);

    const handleAddLinkToTab = useCallback((tabId: string, href: string) => {
        const defaultHrefs = allTabs.find(t => t.id === tabId)!.links.map(l => l.href);
        const currentHrefs = settings.customTabLinks[tabId] || defaultHrefs;
        if (currentHrefs.includes(href)) return;
        const newHrefs = [...currentHrefs, href];
        setTabLinks(tabId, newHrefs);
    }, [allTabs, settings.customTabLinks, setTabLinks]);

    /* ═══════════ TABS WITH ORDERING + VISIBILITY ═══════════ */
    const tabs = useMemo(() => {
        let ordered = allTabs;
        if (settings.tabOrder.length > 0) {
            const orderMap = new Map(settings.tabOrder.map((id, i) => [id, i]));
            ordered = [...allTabs].sort((a, b) => {
                const ai = orderMap.get(a.id) ?? 999;
                const bi = orderMap.get(b.id) ?? 999;
                return ai - bi;
            });
        }
        return ordered
            .filter(tab => !settings.hiddenTabs.includes(tab.id))
            .map(tab => {
                const customHrefs = settings.customTabLinks[tab.id];
                if (!customHrefs) return tab;
                const allLinksMap = new Map(allTabs.flatMap(t => t.links).map(l => [l.href, l]));
                const links = customHrefs
                    .map(href => allLinksMap.get(href))
                    .filter(Boolean) as TabLink[];
                return {
                    ...tab,
                    links
                };
            });
    }, [allTabs, settings.tabOrder, settings.hiddenTabs, settings.customTabLinks]);

    /* ═══════════ SEARCH FILTER ═══════════ */
    const isSearching = searchQuery.trim().length > 0;
    const q = searchQuery.toLowerCase();

    const filteredLinks = useMemo(() => {
        if (!isSearching) return [];
        const allLinks = allTabs.flatMap(tab => tab.links);
        const uniqueLinks = Array.from(new Map(allLinks.map(link => [link.href, link])).values());
        return uniqueLinks.filter(link => {
            const matchLabel = link.label.toLowerCase().includes(q);
            const matchDesc = link.description?.toLowerCase().includes(q) || false;
            const matchKeywords = link.keywords?.some(kw => kw.toLowerCase().includes(q)) || false;
            return matchLabel || matchDesc || matchKeywords;
        });
    }, [isSearching, q, allTabs]);

    const activeTab = isSearching ? null : tabs.find(t => t.id === activeTabId) || tabs[0];

    /* ═══════════ FAVORITES ═══════════ */
    const favoriteLinks = useMemo(() => {
        const allLinks = allTabs.flatMap(tab => tab.links);
        const uniqueLinks = Array.from(new Map(allLinks.map(link => [link.href, link])).values());
        return uniqueLinks.filter(link => settings.favorites.includes(link.href));
    }, [allTabs, settings.favorites]);

    /* ═══════════ RECENTLY VISITED ═══════════ */
    const recentLinks = useMemo(() => {
        const allLinks = allTabs.flatMap(tab => tab.links);
        const linkMap = new Map(allLinks.map(link => [link.href, link]));
        return settings.recentlyVisited
            .map(r => linkMap.get(r.href))
            .filter(Boolean) as TabLink[];
    }, [allTabs, settings.recentlyVisited]);

    /* ═══════════ HANDLE CARD CLICK — track recently visited ═══════════ */
    const handleCardClick = useCallback((link: TabLink) => {
        addRecentlyVisited({
            href: link.href,
            label: link.label,
            color: link.color,
            icon: getIconName(link.icon),
        });
    }, [addRecentlyVisited]);

    /* ═══════════ KEYBOARD SHORTCUTS ═══════════ */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Ctrl+K or / → focus search
            if ((e.ctrlKey && e.key === "k") || (e.key === "/" && !(e.target instanceof HTMLInputElement))) {
                e.preventDefault();
                searchInputRef.current?.focus();
                return;
            }
            // Escape → clear search
            if (e.key === "Escape") {
                setSearchQuery("");
                searchInputRef.current?.blur();
                setShowQuickAccessPicker(false);
                setShowTabManager(false);
                setShowKeyboardHelp(false);
                return;
            }
            // 1-5 → switch tabs (only when not in input)
            if (!(e.target instanceof HTMLInputElement) && !e.ctrlKey && !e.altKey) {
                const num = parseInt(e.key);
                if (num >= 1 && num <= tabs.length) {
                    setActiveTabId(tabs[num - 1].id);
                    return;
                }
                // ? → show keyboard help
                if (e.key === "?") {
                    e.preventDefault();
                    setShowKeyboardHelp(prev => !prev);
                }
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [tabs]);

    /* ═══════════ QUICK ACCESS REORDER ═══════════ */
    const handleQuickAccessReorder = useCallback((newOrder: QuickAction[]) => {
        setQuickAccessOrder(newOrder.map(a => a.href));
    }, [setQuickAccessOrder]);

    /* ═══════════ TAB REORDER VIA DRAG ═══════════ */
    const handleTabReorder = useCallback((newTabs: TabSection[]) => {
        setTabOrder(newTabs.map(t => t.id));
    }, [setTabOrder]);

    /* ═══════════ LAYOUT HELPERS ═══════════ */
    const gridCols: Record<HubLayoutMode, string> = {
        grid: "grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
        list: "grid-cols-1",
        compact: "grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6",
    };

    const cardSizeClass: Record<HubCardSize, string> = {
        sm: "p-2 sm:p-2.5",
        md: "p-3 sm:p-4",
        lg: "p-4 sm:p-5",
    };

    /* ═══════════ RENDER ═══════════ */
    if (!isLoaded) {
        return (
            <div className="min-h-dvh flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="relative min-h-dvh bg-transparent text-foreground overflow-x-hidden select-none">
            <div className="relative z-10 max-w-[1440px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-6 pb-20 space-y-4 sm:space-y-6">

                {/* ═══════════ HEADER ═══════════ */}
                <motion.header
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-border bg-card/80 backdrop-blur-xl shadow-sm"
                >
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                    <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 p-3 sm:p-5 md:p-6">
                        <div className="flex items-center gap-4 text-center sm:text-left">
                            <div className="relative shrink-0">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-secondary/80 shadow-lg shadow-primary/20">
                                    <Store className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                                    SYNCLOUD<span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-black">POS</span>
                                </h1>
                                <p className="text-xs text-muted-foreground font-semibold mt-0.5 flex items-center gap-1.5">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                    </span>
                                    {getGreeting()} — {t("commandCenter") || "Centre de Contrôle Général"}
                                </p>
                            </div>
                        </div>

                        {/* Search + Controls */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64 md:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t("searchPlaceholder") || "Rechercher... (Ctrl+K)"}
                                    className="w-full pl-9 pr-9 py-2.5 bg-muted/60 text-foreground placeholder:text-muted-foreground/50 rounded-xl text-sm outline-none border border-border focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all font-medium"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-muted text-muted-foreground transition-colors cursor-pointer">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Layout toggles */}
                            <div className="hidden sm:flex items-center gap-0.5 p-1 rounded-lg bg-muted/50 border border-border">
                                {([
                                    { mode: "grid" as const, icon: LayoutGrid, tip: "Grille" },
                                    { mode: "list" as const, icon: LayoutList, tip: "Liste" },
                                    { mode: "compact" as const, icon: Grid3X3, tip: "Compact" },
                                ]).map(({ mode, icon: Icon, tip }) => (
                                    <button
                                        key={mode}
                                        onClick={() => setLayoutMode(mode)}
                                        title={tip}
                                        className={`p-1.5 rounded-md transition-all cursor-pointer ${
                                            settings.layoutMode === mode
                                                ? "bg-card text-foreground shadow-sm border border-border"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                    </button>
                                ))}
                            </div>

                            {/* Card size */}
                            <div className="hidden md:flex items-center gap-0.5 p-1 rounded-lg bg-muted/50 border border-border">
                                {(["sm", "md", "lg"] as const).map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => setCardSize(size)}
                                        title={`Taille ${size.toUpperCase()}`}
                                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                            settings.cardSize === size
                                                ? "bg-card text-foreground shadow-sm border border-border"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        {size.toUpperCase()}
                                    </button>
                                ))}
                            </div>

                            {/* Keyboard help */}
                            <button
                                onClick={() => setShowKeyboardHelp(true)}
                                title="Raccourcis clavier (?)"
                                className="p-2 rounded-lg bg-muted/50 border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer hidden sm:flex"
                            >
                                <Keyboard className="w-3.5 h-3.5" />
                            </button>

                            {/* Reset settings */}
                            <button
                                onClick={resetSettings}
                                title="Réinitialiser les préférences"
                                className="p-2 rounded-lg bg-muted/50 border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </motion.header>

                {/* ═══════════ RECENTLY VISITED ═══════════ */}
                {recentLinks.length > 0 && !isSearching && (
                    <motion.section
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05, duration: 0.4 }}
                        className="relative p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-card/40 border border-border/60 backdrop-blur-xl"
                    >
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <Clock className="w-3 h-3 text-muted-foreground/60" />
                            <h2 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                {t("recentlyVisited") || "Récemment consultés"}
                            </h2>
                        </div>
                        <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden scrollbar-none pb-1">
                            {recentLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/40 border border-border/50 hover:bg-muted/70 hover:border-border transition-all shrink-0 cursor-pointer group"
                                >
                                    <div
                                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                                        style={{ background: `${link.color}18` }}
                                    >
                                        <link.icon className="w-3 h-3" style={{ color: link.color }} />
                                    </div>
                                    <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-foreground truncate max-w-[100px]">
                                        {link.label}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </motion.section>
                )}

                {/* ═══════════ FAVORITES ═══════════ */}
                {favoriteLinks.length > 0 && !isSearching && (
                    <motion.section
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.06, duration: 0.4 }}
                        className="relative p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/15 backdrop-blur-xl"
                    >
                        <div className="flex items-center gap-2 mb-2.5 px-1">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <h2 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-foreground">
                                {t("favorites") || "Mes Favoris"}
                            </h2>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                {favoriteLinks.length}
                            </span>
                        </div>
                        <div className={`grid ${gridCols[settings.layoutMode]} gap-2 sm:gap-3`}>
                            {favoriteLinks.map((link, i) => (
                                <motion.div
                                    key={link.href + link.label}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03, duration: 0.3 }}
                                >
                                    <HubCard
                                        link={link}
                                        layoutMode={settings.layoutMode}
                                        cardSize={settings.cardSize}
                                        cardSizeClass={cardSizeClass[settings.cardSize]}
                                        isFav={true}
                                        onToggleFav={() => toggleFavorite(link.href)}
                                        onClick={() => handleCardClick(link)}
                                        onMobileConnect={() => setShowQrModal(true)}
                                    />
                                </motion.div>
                            ))}
                        </div>
                    </motion.section>
                )}

                {/* ═══════════ QUICK ACCESS ═══════════ */}
                <motion.section
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08, duration: 0.5 }}
                    className="relative p-2.5 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl bg-card/60 border border-border backdrop-blur-xl overflow-hidden"
                >
                    <div className="flex items-center justify-between mb-2.5 sm:mb-4 px-1">
                        <div className="flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                            <h2 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-foreground">
                                {t("quickAccess") || "Accès Rapide"}
                            </h2>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                {quickActions.length}
                            </span>
                        </div>
                        <button
                            onClick={() => setShowQuickAccessPicker(true)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer text-[10px] font-bold"
                        >
                            <Settings className="w-3 h-3" />
                            <span className="hidden sm:inline">{t("customize") || "Personnaliser"}</span>
                        </button>
                    </div>

                    <Reorder.Group
                        axis="x"
                        values={quickActions}
                        onReorder={handleQuickAccessReorder}
                        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 sm:gap-2 md:gap-3"
                        as="div"
                    >
                        {quickActions.map((action, i) => (
                            <Reorder.Item
                                key={action.href}
                                value={action}
                                as="div"
                                whileDrag={{ scale: 1.05, zIndex: 50, boxShadow: `0 12px 40px -8px ${action.shadowColor}` }}
                                className="cursor-grab active:cursor-grabbing"
                            >
                                <QuickAccessButton action={action} index={i} />
                            </Reorder.Item>
                        ))}
                    </Reorder.Group>
                </motion.section>

                {/* ═══════════ TABS SECTION ═══════════ */}
                <motion.section
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.5 }}
                    className="space-y-0"
                >
                    {/* Tab Bar */}
                    {!isSearching && (
                        <div className="flex items-center gap-0.5 sm:gap-1 mb-3 sm:mb-5">
                            <Reorder.Group
                                axis="x"
                                values={tabs}
                                onReorder={handleTabReorder}
                                className="flex items-center gap-0.5 sm:gap-1 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-muted/50 border border-border backdrop-blur-xl overflow-x-auto [&::-webkit-scrollbar]:hidden scrollbar-none flex-1"
                                as="div"
                            >
                                {tabs.map((tab) => {
                                    const isActive = activeTabId === tab.id;
                                    return (
                                        <Reorder.Item
                                            key={tab.id}
                                            value={tab}
                                            as="button"
                                            whileDrag={{ scale: 1.05, zIndex: 50 }}
                                            onClick={() => setActiveTabId(tab.id)}
                                            onContextMenu={(e: React.MouseEvent) => {
                                                e.preventDefault();
                                                if (tabs.length > 1) {
                                                    toggleTabVisibility(tab.id);
                                                }
                                            }}
                                            className={`relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold whitespace-nowrap transition-all duration-300 cursor-grab active:cursor-grabbing shrink-0 ${
                                                isActive
                                                    ? "text-foreground shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            {isActive && (
                                                <motion.div
                                                    layoutId="hub-active-tab"
                                                    className="absolute inset-0 rounded-xl bg-card border border-border shadow-sm"
                                                    style={{ zIndex: -1 }}
                                                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                                />
                                            )}
                                            <tab.icon
                                                className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors"
                                                style={{ color: isActive ? tab.accentColor : undefined }}
                                            />
                                            <span className="hidden sm:inline">{tab.label}</span>
                                            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                                            <span
                                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-all"
                                                style={{
                                                    backgroundColor: isActive ? `${tab.accentColor}15` : "transparent",
                                                    color: isActive ? tab.accentColor : "inherit",
                                                }}
                                            >
                                                {tab.links.length}
                                            </span>
                                        </Reorder.Item>
                                    );
                                })}
                            </Reorder.Group>

                            {/* Tab Manager Button */}
                            <button
                                onClick={() => setShowTabManager(true)}
                                title={t("manageTabs") || "Gérer les onglets"}
                                className="p-2 sm:p-2.5 rounded-xl bg-muted/50 border border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer shrink-0"
                            >
                                <Settings className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Tab Content */}
                    <AnimatePresence mode="wait">
                        {isSearching ? (
                            <motion.div
                                key="search-results"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                {filteredLinks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4 border border-border">
                                            <Search className="w-5 h-5 text-muted-foreground/50" />
                                        </div>
                                        <h3 className="text-sm font-bold text-foreground">Aucun résultat</h3>
                                        <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
                                            Aucun module ne correspond à &quot;{searchQuery}&quot;
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                                            {filteredLinks.length} Résultat{filteredLinks.length > 1 ? 's' : ''} trouvé{filteredLinks.length > 1 ? 's' : ''}
                                        </h3>
                                        <div className={`grid ${gridCols[settings.layoutMode]} gap-2 sm:gap-3`}>
                                            {filteredLinks.map(link => (
                                                <HubCard
                                                    key={link.href + link.label}
                                                    link={link}
                                                    layoutMode={settings.layoutMode}
                                                    cardSize={settings.cardSize}
                                                    cardSizeClass={cardSizeClass[settings.cardSize]}
                                                    isFav={isFavorite(link.href)}
                                                    onToggleFav={() => toggleFavorite(link.href)}
                                                    onClick={() => handleCardClick(link)}
                                                    onMobileConnect={() => setShowQrModal(true)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ) : activeTab ? (
                            <motion.div
                                key={activeTab.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                                        {activeTab.links.length} Modules disponibles
                                    </span>
                                    <button
                                        onClick={() => setShowTabLinksPicker(true)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer text-[10px] font-bold"
                                    >
                                        <Settings className="w-3 h-3 text-primary animate-spin-[hover]" />
                                        Personnaliser les boutons
                                    </button>
                                </div>
                                <div className={`grid ${gridCols[settings.layoutMode]} gap-2 sm:gap-3`}>
                                    {activeTab.links.map((link, i) => (
                                        <motion.div
                                            key={link.href + link.label}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.03, duration: 0.3 }}
                                        >
                                            <HubCard
                                                link={link}
                                                layoutMode={settings.layoutMode}
                                                cardSize={settings.cardSize}
                                                cardSizeClass={cardSizeClass[settings.cardSize]}
                                                isFav={isFavorite(link.href)}
                                                onToggleFav={() => toggleFavorite(link.href)}
                                                onClick={() => handleCardClick(link)}
                                                onMobileConnect={() => setShowQrModal(true)}
                                            />
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </motion.section>

                {/* ═══════════ FOOTER ═══════════ */}
                <motion.footer
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-border gap-2"
                >
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground/50">
                        <Globe className="w-3 h-3" />
                        <span className="font-bold">{t("footer") || "SYNCLOUDPOS — CENTRE DE CONTRÔLE"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground/40 flex items-center gap-1">
                            <Keyboard className="w-3 h-3" /> ? pour raccourcis
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground/40 tracking-wider">
                            V1.8.2
                        </span>
                    </div>
                </motion.footer>
            </div>

            {/* ═══════════ QR CODE MODAL ═══════════ */}
            <AnimatePresence>
                {showQrModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowQrModal(false)}
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", duration: 0.4 }}
                            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-card border border-border shadow-2xl flex flex-col z-10 p-6 space-y-5"
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg">
                                        <Smartphone className="w-4.5 h-4.5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground">Connexion Mobile App</h3>
                                        <p className="text-xs text-muted-foreground mt-0.5">Scannez le QR Code pour installer l&apos;app</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setShowQrModal(false)} className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex p-0.5 rounded-xl bg-muted border border-border">
                                <button
                                    type="button"
                                    onClick={() => setActiveQrTab("gerant")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        activeQrTab === "gerant"
                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm"
                                            : "text-muted-foreground hover:text-foreground border border-transparent"
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${activeQrTab === "gerant" ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/30"}`} />
                                    App Gérant
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveQrTab("tournee")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        activeQrTab === "tournee"
                                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-sm"
                                            : "text-muted-foreground hover:text-foreground border border-transparent"
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${activeQrTab === "tournee" ? "bg-blue-400 animate-pulse" : "bg-muted-foreground/30"}`} />
                                    App Tournée
                                </button>
                            </div>

                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="flex flex-col items-center shrink-0">
                                    <div className="p-3 bg-white rounded-2xl shadow-lg" style={{ border: `3px solid ${activeQrTab === "gerant" ? "#10b981" : "#3b82f6"}` }}>
                                        <QRCodeSVG value={getAppDownloadUrl(activeQrTab)} size={130} level="H" includeMargin={false} />
                                    </div>
                                    <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground mt-2">Scan to install</span>
                                </div>
                                <div className="flex-1 space-y-3">
                                    <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                                        <Wifi className="w-3.5 h-3.5" /> Instructions :
                                    </h4>
                                    {["Scannez le QR code avec votre appareil.", "Téléchargez et installez le fichier APK.", "Connectez-vous avec vos identifiants SynCloud."].map((step, i) => (
                                        <div key={i} className="flex gap-2 text-xs text-muted-foreground">
                                            <div className="w-5 h-5 rounded bg-muted flex items-center justify-center shrink-0 text-[10px] font-bold border border-border">{i + 1}</div>
                                            <p className="flex-1 text-xs font-medium leading-relaxed">{step}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-muted border border-border space-y-1.5">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                    <Download className="w-3.5 h-3.5" /> Lien direct :
                                </span>
                                <div className="bg-background px-3 py-2 rounded-lg border border-border flex items-center justify-between">
                                    <code className="text-[10px] text-muted-foreground break-all select-all font-mono">
                                        {getAppDownloadUrl(activeQrTab)}
                                    </code>
                                    <button
                                        onClick={() => { if (typeof navigator !== "undefined") navigator.clipboard.writeText(getAppDownloadUrl(activeQrTab)); }}
                                        className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 ml-2 shrink-0 cursor-pointer"
                                    >
                                        Copier
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══════════ QUICK ACCESS PICKER MODAL ═══════════ */}
            <AnimatePresence>
                {showQuickAccessPicker && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowQuickAccessPicker(false)}
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", duration: 0.4 }}
                            className="relative w-full max-w-md max-h-[80vh] overflow-hidden rounded-2xl bg-card border border-border shadow-2xl flex flex-col z-10"
                        >
                            <div className="flex items-center justify-between p-4 pb-3 border-b border-border">
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">
                                        {t("customizeQuickAccess") || "Personnaliser l'accès rapide"}
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {t("customizeQuickAccessDesc") || "Ajoutez ou retirez des raccourcis (max 12)"}
                                    </p>
                                </div>
                                <button onClick={() => setShowQuickAccessPicker(false)} className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="overflow-y-auto flex-1 p-3 space-y-1">
                                {allQuickActions.map((action) => {
                                    const isActive = (settings.quickAccessOrder.length > 0
                                        ? settings.quickAccessOrder
                                        : DEFAULT_QUICK_HREFS
                                    ).includes(action.href);
                                    return (
                                        <button
                                            key={action.href}
                                            onClick={() => {
                                                if (isActive) {
                                                    removeQuickAccess(action.href);
                                                } else {
                                                    addQuickAccess(action.href);
                                                }
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                                                isActive
                                                    ? "bg-primary/5 border-primary/20 text-foreground"
                                                    : "bg-transparent border-border/50 text-muted-foreground hover:bg-muted/50"
                                            }`}
                                        >
                                            <div
                                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                                style={{ background: `linear-gradient(135deg, ${action.color}, ${action.colorEnd})` }}
                                            >
                                                <action.icon className="w-4 h-4 text-white" />
                                            </div>
                                            <span className="text-xs font-bold flex-1 text-left">{action.label}</span>
                                            {isActive ? (
                                                <Minus className="w-4 h-4 text-red-400" />
                                            ) : (
                                                <Plus className="w-4 h-4 text-emerald-400" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══════════ TAB MANAGER MODAL ═══════════ */}
            <AnimatePresence>
                {showTabManager && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowTabManager(false)}
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", duration: 0.4 }}
                            className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-card border border-border shadow-2xl flex flex-col z-10"
                        >
                            <div className="flex items-center justify-between p-4 pb-3 border-b border-border">
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">
                                        {t("manageTabs") || "Gérer les onglets"}
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {t("manageTabsDesc") || "Afficher ou masquer des onglets"}
                                    </p>
                                </div>
                                <button onClick={() => setShowTabManager(false)} className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="p-3 space-y-1.5">
                                {allTabs.map((tab) => {
                                    const hidden = isTabHidden(tab.id);
                                    const visibleCount = allTabs.filter(t => !isTabHidden(t.id)).length;
                                    const canHide = visibleCount > 1 || hidden;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => { if (canHide) toggleTabVisibility(tab.id); }}
                                            disabled={!canHide}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                                                hidden
                                                    ? "bg-transparent border-border/30 text-muted-foreground/50 opacity-60"
                                                    : "bg-card border-border text-foreground hover:bg-muted/50"
                                            } ${!canHide ? "cursor-not-allowed" : ""}`}
                                        >
                                            <div
                                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                                style={{ background: hidden ? undefined : `${tab.accentColor}15` }}
                                            >
                                                <tab.icon className="w-4 h-4" style={{ color: hidden ? undefined : tab.accentColor }} />
                                            </div>
                                            <span className="text-xs font-bold flex-1 text-left">{tab.label}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground mr-1">{tab.links.length}</span>
                                            {hidden ? (
                                                <EyeOff className="w-4 h-4 text-muted-foreground/40" />
                                            ) : (
                                                <Eye className="w-4 h-4 text-emerald-500" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══════════ KEYBOARD SHORTCUTS MODAL ═══════════ */}
            <AnimatePresence>
                {showKeyboardHelp && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowKeyboardHelp(false)}
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", duration: 0.4 }}
                            className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-card border border-border shadow-2xl z-10 p-5"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Keyboard className="w-4 h-4 text-primary" />
                                    <h3 className="text-sm font-bold text-foreground">
                                        {t("keyboardShortcuts") || "Raccourcis Clavier"}
                                    </h3>
                                </div>
                                <button onClick={() => setShowKeyboardHelp(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors cursor-pointer">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="space-y-2">
                                {[
                                    { keys: ["Ctrl", "K"], desc: t("shortcutSearch") || "Ouvrir la recherche" },
                                    { keys: ["/"], desc: t("shortcutSearchAlt") || "Recherche rapide" },
                                    { keys: ["Esc"], desc: t("shortcutEscape") || "Fermer / Effacer" },
                                    { keys: ["1", "—", "5"], desc: t("shortcutTabs") || "Changer d'onglet" },
                                    { keys: ["?"], desc: t("shortcutHelp") || "Afficher l'aide" },
                                ].map((shortcut, i) => (
                                    <div key={i} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                                        <span className="text-xs text-muted-foreground font-medium">{shortcut.desc}</span>
                                        <div className="flex items-center gap-1">
                                            {shortcut.keys.map((key, j) => (
                                                <kbd
                                                    key={j}
                                                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border shadow-sm ${
                                                        key === "—"
                                                            ? "border-transparent shadow-none bg-transparent text-muted-foreground"
                                                            : "bg-muted border-border text-foreground"
                                                    }`}
                                                >
                                                    {key}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══════════ TAB LINKS CUSTOMIZER MODAL ═══════════ */}
            <AnimatePresence>
                {showTabLinksPicker && activeTab && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowTabLinksPicker(false)}
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", duration: 0.4 }}
                            className="relative w-full max-w-md max-h-[85vh] overflow-hidden rounded-2xl bg-card border border-border shadow-2xl flex flex-col z-10"
                        >
                            <div className="flex items-center justify-between p-4 pb-3 border-b border-border">
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">
                                        Personnaliser les boutons
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Gérer les boutons affichés dans l'onglet &quot;{activeTab.label}&quot;
                                    </p>
                                </div>
                                <button onClick={() => setShowTabLinksPicker(false)} className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="overflow-y-auto flex-1 p-4 space-y-5">
                                {/* Active Buttons inside this tab */}
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                        Boutons actifs dans cet onglet ({activeTab.links.length})
                                    </span>
                                    {activeTab.links.length === 0 ? (
                                        <div className="p-3 text-center rounded-xl border border-dashed border-border text-[11px] text-muted-foreground">
                                            Aucun bouton n'est actif dans cet onglet. Ajoutez-en ci-dessous.
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {activeTab.links.map((link) => (
                                                <div
                                                    key={link.href}
                                                    className="flex items-center justify-between p-2 rounded-xl border border-border bg-muted/20"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div
                                                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-border"
                                                            style={{ background: `${link.color}10` }}
                                                        >
                                                            <link.icon className="w-3.5 h-3.5" style={{ color: link.color }} />
                                                        </div>
                                                        <span className="text-xs font-bold text-foreground truncate">{link.label}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveLinkFromTab(activeTab.id, link.href)}
                                                        className="p-1 rounded-lg hover:bg-muted text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                                                        title="Retirer de cet onglet"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Available Buttons to add */}
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                        Ajouter d'autres boutons du projet
                                    </span>
                                    {(() => {
                                        const allLinks = allTabs.flatMap(t => t.links);
                                        const uniqueLinks = Array.from(new Map(allLinks.map(l => [l.href, l])).values());
                                        const availableLinks = uniqueLinks.filter(
                                            link => !activeTab.links.some(active => active.href === link.href)
                                        );

                                        if (availableLinks.length === 0) {
                                            return (
                                                <div className="p-3 text-center rounded-xl border border-dashed border-border text-[11px] text-muted-foreground">
                                                    Tous les boutons disponibles sont déjà dans cet onglet.
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="space-y-1">
                                                {availableLinks.map((link) => (
                                                    <div
                                                        key={link.href}
                                                        className="flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-border transition-all hover:bg-muted/10"
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div
                                                                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-border"
                                                                style={{ background: `${link.color}10` }}
                                                            >
                                                                <link.icon className="w-3.5 h-3.5" style={{ color: link.color }} />
                                                            </div>
                                                            <span className="text-xs font-bold text-foreground truncate">{link.label}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleAddLinkToTab(activeTab.id, link.href)}
                                                            className="p-1 rounded-lg hover:bg-muted text-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer"
                                                            title="Ajouter à cet onglet"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════
   QUICK ACCESS BUTTON
   ═══════════════════════════════════════════════════════ */

function QuickAccessButton({ action, index }: { action: QuickAction; index: number }) {
    const content = (
        <>
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"
                style={{
                    background: `linear-gradient(145deg, ${action.color}18, ${action.colorEnd}10)`,
                    boxShadow: `0 8px 30px -8px ${action.shadowColor}`,
                }}
            />
            <div
                className="relative z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                style={{ background: `linear-gradient(135deg, ${action.color}, ${action.colorEnd})` }}
            >
                <action.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="relative z-10 text-[9px] sm:text-[10px] md:text-xs font-bold text-foreground/80 group-hover:text-foreground transition-colors text-center leading-tight">
                {action.label}
            </span>
        </>
    );

    const className = "group relative flex flex-col items-center justify-center gap-1.5 sm:gap-2.5 py-2.5 sm:py-4 px-1.5 sm:px-3 rounded-lg sm:rounded-xl border border-transparent transition-all duration-300 hover:-translate-y-1 active:scale-[0.97] cursor-pointer overflow-hidden";
    const style = {
        background: `linear-gradient(145deg, ${action.color}12, ${action.colorEnd}08)`,
        borderColor: `${action.color}20`,
    };

    if (action.external) {
        return (
            <a href={action.href} target="_blank" rel="noopener noreferrer" className={className} style={style}>
                {content}
            </a>
        );
    }

    return (
        <Link href={action.href} className={className} style={style}>
            {content}
        </Link>
    );
}

/* ═══════════════════════════════════════════════════════
   HUB CARD — Individual link card
   ═══════════════════════════════════════════════════════ */

function HubCard({
    link,
    layoutMode,
    cardSize,
    cardSizeClass,
    isFav,
    onToggleFav,
    onClick,
    onMobileConnect,
}: {
    link: TabLink;
    layoutMode: HubLayoutMode;
    cardSize: HubCardSize;
    cardSizeClass: string;
    isFav: boolean;
    onToggleFav: () => void;
    onClick: () => void;
    onMobileConnect: () => void;
}) {
    const isMobileConnect = link.href === "/mobile-connect";

    /* ═══ COMPACT MODE ═══ */
    if (layoutMode === "compact") {
        const wrapper = (children: React.ReactNode) => {
            const cls = `group relative flex flex-col items-center justify-center gap-1 ${cardSizeClass} rounded-lg sm:rounded-xl bg-card/60 border border-border hover:border-border/80 hover:bg-card/90 shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-300 cursor-pointer overflow-hidden text-center`;
            if (isMobileConnect) return <div onClick={() => { onClick(); onMobileConnect(); }} className={cls}>{children}</div>;
            if (link.href.startsWith("http")) return <a href={link.href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={cls}>{children}</a>;
            return <Link href={link.href} onClick={onClick} className={cls}>{children}</Link>;
        };

        return wrapper(
            <>
                <div className="relative">
                    <div
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-110"
                        style={{ background: `${link.color}12`, borderColor: `${link.color}20` }}
                    >
                        <link.icon className="w-4 h-4" style={{ color: link.color }} />
                    </div>
                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFav(); }}
                        className="absolute -top-1 -right-1 p-0.5 rounded-full transition-all cursor-pointer"
                    >
                        <Star className={`w-2.5 h-2.5 ${isFav ? "text-amber-500 fill-amber-500" : "text-transparent"}`} />
                    </button>
                </div>
                <span className="text-[8px] sm:text-[9px] font-bold text-foreground/80 leading-tight truncate w-full">
                    {link.label.split(' ')[0]}
                </span>
            </>
        );
    }

    /* ═══ LIST MODE ═══ */
    if (layoutMode === "list") {
        const wrapper = (children: React.ReactNode) => {
            const cls = `group relative flex items-center gap-3 ${cardSizeClass} rounded-lg sm:rounded-xl bg-card/60 border border-border hover:border-border/80 hover:bg-card/90 shadow-sm hover:shadow-md active:scale-[0.99] transition-all duration-300 cursor-pointer overflow-hidden`;
            if (isMobileConnect) return <div onClick={() => { onClick(); onMobileConnect(); }} className={cls}>{children}</div>;
            if (link.href.startsWith("http")) return <a href={link.href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={cls}>{children}</a>;
            return <Link href={link.href} onClick={onClick} className={cls}>{children}</Link>;
        };

        return wrapper(
            <>
                <div
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-105"
                    style={{ background: `${link.color}12`, borderColor: `${link.color}20` }}
                >
                    <link.icon className="w-4 h-4" style={{ color: link.color }} />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-[11px] sm:text-[13px] font-bold text-foreground truncate">{link.label}</h4>
                    {link.description && (
                        <p className="text-[9px] sm:text-[11px] text-muted-foreground truncate">{link.description}</p>
                    )}
                </div>
                {link.badge && (
                    <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 border"
                        style={{ backgroundColor: `${link.badgeColor || '#10b981'}12`, color: link.badgeColor || '#10b981', borderColor: `${link.badgeColor || '#10b981'}25` }}
                    >
                        {link.badge}
                    </span>
                )}
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFav(); }}
                    className="p-1 rounded-md hover:bg-muted transition-colors cursor-pointer shrink-0"
                >
                    <Star className={`w-3.5 h-3.5 transition-colors ${isFav ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30 hover:text-amber-400"}`} />
                </button>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground/60 group-hover:translate-x-1 transition-all duration-300 shrink-0" />
            </>
        );
    }

    /* ═══ GRID MODE (default) ═══ */
    const content = (
        <>
            <div
                className="absolute top-0 left-3 right-3 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
                style={{ background: link.color }}
            />
            <div className="flex items-start gap-2.5 sm:gap-3">
                <div
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg"
                    style={{ background: `${link.color}12`, borderColor: `${link.color}20` }}
                >
                    <link.icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: link.color }} />
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="text-[11px] sm:text-[13px] font-bold text-foreground group-hover:text-foreground/90 leading-tight truncate">
                        {link.label}
                    </h4>
                    {link.description && (
                        <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">{link.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {link.badge && (
                        <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border"
                            style={{ backgroundColor: `${link.badgeColor || '#10b981'}12`, color: link.badgeColor || '#10b981', borderColor: `${link.badgeColor || '#10b981'}25` }}
                        >
                            {link.badge}
                        </span>
                    )}
                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFav(); }}
                        className="p-0.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
                    >
                        <Star className={`w-3 h-3 transition-colors ${isFav ? "text-amber-500 fill-amber-500" : "text-muted-foreground/20 hover:text-amber-400"}`} />
                    </button>
                </div>
            </div>
            <div className="flex items-center justify-end mt-2 pt-2 border-t border-border/50">
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground/60 group-hover:translate-x-1 transition-all duration-300" />
            </div>
        </>
    );

    const cardClassName = `group relative flex flex-col ${cardSizeClass} rounded-lg sm:rounded-xl bg-card/60 border border-border hover:border-border/80 hover:bg-card/90 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-300 cursor-pointer overflow-hidden text-left`;

    if (isMobileConnect) {
        return <div onClick={() => { onClick(); onMobileConnect(); }} className={cardClassName}>{content}</div>;
    }
    if (link.href.startsWith("http")) {
        return <a href={link.href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={cardClassName}>{content}</a>;
    }
    return <Link href={link.href} onClick={onClick} className={cardClassName}>{content}</Link>;
}
