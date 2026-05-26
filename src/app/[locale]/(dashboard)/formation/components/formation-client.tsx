"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import {
    BookOpen, Monitor, ShoppingCart, Package, Users, Truck, Wallet, BarChart3,
    Sparkles, Receipt, FileText, Zap, ArrowRight, CheckCircle, Shield, Database,
    CreditCard, TrendingUp
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─────── Reusable sub-components ───────────────────────────────

const FeatureCard = ({ icon: Icon, title, text, iconColor = "text-slate-700", bgAccent = "bg-slate-50" }: {
    icon: React.FC<any>; title: string; text: string; iconColor?: string; bgAccent?: string
}) => (
    <div className="group flex flex-col gap-3 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110", bgAccent, iconColor)}>
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">{title}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{text}</p>
        </div>
    </div>
)

const Step = ({ n, title, text, bgColor = "bg-blue-100 dark:bg-blue-900/30", textColor = "text-blue-700 dark:text-blue-400" }: {
    n: string; title: string; text: string; bgColor?: string; textColor?: string
}) => (
    <div className="flex gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
        <div
            className={cn("w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0 text-sm shadow-inner", bgColor, textColor)}
        >{n}</div>
        <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{text}</p>
        </div>
    </div>
)

const SectionHeader = ({ icon: Icon, title, subtitle, color, bg }: {
    icon: React.FC<any>; title: string; subtitle: string; color: string; bg: string
}) => (
    <div className="flex items-start gap-5 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", bg, color)}>
            <Icon className="w-7 h-7" />
        </div>
        <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg leading-relaxed">{subtitle}</p>
        </div>
    </div>
)

// ─────── Main Component ──────────────────────────────────────────
export const FormationClient = () => {
    const [activeTab, setActiveTab] = useState("dashboard")
    const t = useTranslations("Formation")

    const tabs = [
        { value: "dashboard", label: t("tabs.dashboard"), icon: Monitor, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10", activeBg: "bg-blue-600 text-white" },
        { value: "delivery", label: "Livraison & Tournées", icon: Truck, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-500/10", activeBg: "bg-sky-600 text-white" },
        { value: "pos", label: t("tabs.pos"), icon: ShoppingCart, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", activeBg: "bg-emerald-600 text-white" },
        { value: "stocks", label: t("tabs.stocks"), icon: Package, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-500/10", activeBg: "bg-orange-600 text-white" },
        { value: "sales", label: t("tabs.sales"), icon: Receipt, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10", activeBg: "bg-indigo-600 text-white" },
        { value: "purchases", label: t("tabs.purchases"), icon: Truck, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10", activeBg: "bg-rose-600 text-white" },
        { value: "treasury", label: t("tabs.treasury"), icon: Wallet, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-500/10", activeBg: "bg-cyan-600 text-white" },
        { value: "contacts", label: t("tabs.contacts"), icon: Users, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10", activeBg: "bg-purple-600 text-white" },
        { value: "analytics", label: t("tabs.analytics"), icon: BarChart3, color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-800", activeBg: "bg-slate-800 dark:bg-slate-200 dark:text-slate-900 text-white" },
        { value: "ai", label: t("tabs.ai"), icon: Sparkles, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10", activeBg: "bg-violet-600 text-white" },
    ]

    return (
        <div className="min-h-screen pb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Hero Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-8 md:p-14 mb-10 text-white relative overflow-hidden shadow-xl border border-slate-700/50">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #818cf8 0%, transparent 50%)' }} />
                <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                <div className="relative z-10 max-w-3xl">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 text-sm font-semibold mb-6 uppercase tracking-wider text-indigo-100">
                        <BookOpen className="w-4 h-4" />
                        {t("hero.badge")}
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight">
                        {t("hero.title").split(" ")[0]}<span className="text-indigo-400"> {t("hero.title").split(" ")[1]}</span>
                    </h1>
                    <p className="text-slate-300 text-lg md:text-xl leading-relaxed mb-8 font-medium">
                        {t("hero.desc")}
                    </p>
                    <div className="flex flex-wrap gap-3">
                        {t.raw("hero.tags").map((tag: string) => (
                            <span key={tag} className="flex items-center gap-2 text-sm font-medium bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2 hover:bg-white/10 transition-colors">
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Layout: Sidebar + Content */}
            <div className="flex flex-col md:flex-row gap-8">

                {/* ── Sidebar nav ── */}
                <div className="md:w-64 shrink-0 md:sticky md:top-24 md:h-min">
                    <nav className="flex flex-row md:flex-col p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm gap-1.5 overflow-x-auto w-full">
                        {tabs.map(tab => {
                            const isActive = activeTab === tab.value
                            return (
                                <button
                                    key={tab.value}
                                    type="button"
                                    onClick={() => setActiveTab(tab.value)}
                                    className={cn(
                                        "flex items-center gap-3 rounded-xl text-sm font-semibold px-4 py-3 transition-all whitespace-nowrap w-full text-left shrink-0",
                                        isActive ? tab.activeBg + " shadow-md" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    )}
                                >
                                    <tab.icon className={cn("h-5 w-5 shrink-0 transition-transform", isActive ? "scale-110" : "opacity-70")} />
                                    <span className="truncate">{tab.label}</span>
                                </button>
                            )
                        })}
                    </nav>
                </div>

                {/* ── Content panels ── */}
                <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-10">
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 fill-mode-forwards">

                        {/* DASHBOARD */}
                        {activeTab === "dashboard" && (
                            <div className="space-y-8">
                                <SectionHeader icon={Monitor} title={t("dashboard.title")} subtitle={t("dashboard.subtitle")} color="text-blue-600 dark:text-blue-400" bg="bg-blue-100 dark:bg-blue-900/30" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FeatureCard icon={BarChart3} title={t("dashboard.kpiTitle")} text={t("dashboard.kpiDesc")} iconColor="text-blue-600 dark:text-blue-400" bgAccent="bg-blue-50 dark:bg-blue-900/20" />
                                    <FeatureCard icon={Package} title={t("dashboard.stockAlertsTitle")} text={t("dashboard.stockAlertsDesc")} iconColor="text-orange-600 dark:text-orange-400" bgAccent="bg-orange-50 dark:bg-orange-900/20" />
                                    <FeatureCard icon={Users} title={t("dashboard.debtorsTitle")} text={t("dashboard.debtorsDesc")} iconColor="text-rose-600 dark:text-rose-400" bgAccent="bg-rose-50 dark:bg-rose-900/20" />
                                    <FeatureCard icon={Zap} title={t("dashboard.shortcutsTitle")} text={t("dashboard.shortcutsDesc")} iconColor="text-amber-600 dark:text-amber-400" bgAccent="bg-amber-50 dark:bg-amber-900/20" />
                                </div>
                            </div>
                        )}

                        {/* POS */}
                        {activeTab === "pos" && (
                            <div className="space-y-8">
                                <SectionHeader icon={ShoppingCart} title={t("pos.title")} subtitle={t("pos.subtitle")} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-100 dark:bg-emerald-900/30" />

                                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-6 mb-8">
                                    <h3 className="font-bold text-xl text-emerald-900 dark:text-emerald-400 mb-6 flex items-center gap-2">
                                        <ShoppingCart className="w-6 h-6" /> {t("pos.stepsTitle")}
                                    </h3>
                                    <div className="space-y-2">
                                        <Step n="1" title={t("pos.step1Title")} text={t("pos.step1Desc")} bgColor="bg-emerald-100 dark:bg-emerald-900/40" textColor="text-emerald-700 dark:text-emerald-400" />
                                        <Step n="2" title={t("pos.step2Title")} text={t("pos.step2Desc")} bgColor="bg-emerald-100 dark:bg-emerald-900/40" textColor="text-emerald-700 dark:text-emerald-400" />
                                        <Step n="3" title={t("pos.step3Title")} text={t("pos.step3Desc")} bgColor="bg-emerald-100 dark:bg-emerald-900/40" textColor="text-emerald-700 dark:text-emerald-400" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FeatureCard icon={Users} title={t("pos.multiSessionTitle")} text={t("pos.multiSessionDesc")} iconColor="text-teal-600 dark:text-teal-400" bgAccent="bg-teal-50 dark:bg-teal-900/20" />
                                    <FeatureCard icon={Shield} title={t("pos.wholesaleTitle")} text={t("pos.wholesaleDesc")} iconColor="text-indigo-600 dark:text-indigo-400" bgAccent="bg-indigo-50 dark:bg-indigo-900/20" />
                                    <FeatureCard icon={Receipt} title={t("pos.scannableTicketTitle")} text={t("pos.scannableTicketDesc")} iconColor="text-purple-600 dark:text-purple-400" bgAccent="bg-purple-50 dark:bg-purple-900/20" />
                                </div>
                            </div>
                        )}

                        {/* STOCKS */}
                        {activeTab === "stocks" && (
                            <div className="space-y-8">
                                <SectionHeader icon={Package} title={t("stocks.title")} subtitle={t("stocks.subtitle")} color="text-orange-600 dark:text-orange-400" bg="bg-orange-100 dark:bg-orange-900/30" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FeatureCard icon={Database} title={t("stocks.productCardTitle")} text={t("stocks.productCardDesc")} iconColor="text-orange-600 dark:text-orange-400" bgAccent="bg-orange-50 dark:bg-orange-900/20" />
                                    <FeatureCard icon={FileText} title={t("stocks.catalogTitle")} text={t("stocks.catalogDesc")} iconColor="text-red-500 dark:text-red-400" bgAccent="bg-red-50 dark:bg-red-900/20" />
                                    <FeatureCard icon={Sparkles} title={t("stocks.labelsTitle")} text={t("stocks.labelsDesc")} iconColor="text-amber-500 dark:text-amber-400" bgAccent="bg-amber-50 dark:bg-amber-900/20" />
                                    <FeatureCard icon={Zap} title={t("stocks.modelsTitle")} text={t("stocks.modelsDesc")} iconColor="text-rose-500 dark:text-rose-400" bgAccent="bg-rose-50 dark:bg-rose-900/20" />
                                </div>
                            </div>
                        )}

                        {/* SALES */}
                        {activeTab === "sales" && (
                            <div className="space-y-8">
                                <SectionHeader icon={Receipt} title={t("sales.title")} subtitle={t("sales.subtitle")} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-100 dark:bg-indigo-900/30" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FeatureCard icon={FileText} title={t("sales.blTitle")} text={t("sales.blDesc")} iconColor="text-indigo-600 dark:text-indigo-400" bgAccent="bg-indigo-50 dark:bg-indigo-900/20" />
                                    <FeatureCard icon={ArrowRight} title={t("sales.proformaTitle")} text={t("sales.proformaDesc")} iconColor="text-blue-500 dark:text-blue-400" bgAccent="bg-blue-50 dark:bg-blue-900/20" />
                                    <FeatureCard icon={Shield} title={t("sales.taxStampTitle")} text={t("sales.taxStampDesc")} iconColor="text-violet-600 dark:text-violet-400" bgAccent="bg-violet-50 dark:bg-violet-900/20" />
                                    <FeatureCard icon={Users} title={t("sales.creditTrackingTitle")} text={t("sales.creditTrackingDesc")} iconColor="text-purple-600 dark:text-purple-400" bgAccent="bg-purple-50 dark:bg-purple-900/20" />
                                </div>
                            </div>
                        )}

                        {/* PURCHASES */}
                        {activeTab === "purchases" && (
                            <div className="space-y-8">
                                <SectionHeader icon={Truck} title={t("purchases.title")} subtitle={t("purchases.subtitle")} color="text-rose-600 dark:text-rose-400" bg="bg-rose-100 dark:bg-rose-900/30" />

                                <div className="bg-gradient-to-br from-rose-600 to-pink-600 rounded-3xl p-8 text-white shadow-lg overflow-hidden relative">
                                    <div className="absolute right-0 top-0 opacity-10 blur-2xl transform translate-x-1/3 -translate-y-1/3">
                                        <Sparkles className="w-64 h-64" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                                <Sparkles className="w-6 h-6 text-pink-100" />
                                            </div>
                                            <h3 className="text-2xl font-bold tracking-tight">{t("purchases.ocrTitle")}</h3>
                                        </div>
                                        <p className="text-rose-50 text-lg mb-6 leading-relaxed max-w-2xl">
                                            {t("purchases.ocrDesc")}
                                        </p>
                                        <div className="flex flex-wrap gap-3">
                                            {t.raw("purchases.ocrTags").map((f: string) => (
                                                <span key={f} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-sm font-medium px-4 py-2 flex items-center gap-2">
                                                    <CheckCircle className="w-4 h-4 text-pink-200" /> {f}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FeatureCard icon={Package} title={t("purchases.stockEntryTitle")} text={t("purchases.stockEntryDesc")} iconColor="text-rose-600 dark:text-rose-400" bgAccent="bg-rose-50 dark:bg-rose-900/20" />
                                    <FeatureCard icon={Wallet} title={t("purchases.expensesTitle")} text={t("purchases.expensesDesc")} iconColor="text-pink-500 dark:text-pink-400" bgAccent="bg-pink-50 dark:bg-pink-900/20" />
                                </div>
                            </div>
                        )}

                        {/* TREASURY */}
                        {activeTab === "treasury" && (
                            <div className="space-y-8">
                                <SectionHeader icon={Wallet} title={t("treasury.title")} subtitle={t("treasury.subtitle")} color="text-cyan-600 dark:text-cyan-400" bg="bg-cyan-100 dark:bg-cyan-900/30" />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FeatureCard icon={Wallet} title={t("treasury.multiAccountTitle")} text={t("treasury.multiAccountDesc")} iconColor="text-cyan-600 dark:text-cyan-400" bgAccent="bg-cyan-50 dark:bg-cyan-900/20" />
                                    <FeatureCard icon={ArrowRight} title={t("treasury.transferTitle")} text={t("treasury.transferDesc")} iconColor="text-sky-500 dark:text-sky-400" bgAccent="bg-sky-50 dark:bg-sky-900/20" />
                                    <FeatureCard icon={BarChart3} title={t("treasury.historyTitle")} text={t("treasury.historyDesc")} iconColor="text-teal-600 dark:text-teal-400" bgAccent="bg-teal-50 dark:bg-teal-900/20" />
                                </div>
                            </div>
                        )}

                        {/* CONTACTS */}
                        {activeTab === "contacts" && (
                            <div className="space-y-8">
                                <SectionHeader icon={Users} title={t("contacts.title")} subtitle={t("contacts.subtitle")} color="text-purple-600 dark:text-purple-400" bg="bg-purple-100 dark:bg-purple-900/30" />

                                <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-3xl p-8">
                                    <h3 className="font-bold text-purple-900 dark:text-purple-400 text-xl mb-6 flex items-center gap-3">
                                        <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg"><Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" /></div>
                                        {t("contacts.balanceTitle")}
                                    </h3>
                                    <div className="space-y-3">
                                        <Step n="1" title={t("contacts.step1Title")} text={t("contacts.step1Desc")} bgColor="bg-purple-200 dark:bg-purple-900/50" textColor="text-purple-800 dark:text-purple-300" />
                                        <Step n="2" title={t("contacts.step2Title")} text={t("contacts.step2Desc")} bgColor="bg-purple-200 dark:bg-purple-900/50" textColor="text-purple-800 dark:text-purple-300" />
                                        <Step n="3" title={t("contacts.step3Title")} text={t("contacts.step3Desc")} bgColor="bg-purple-200 dark:bg-purple-900/50" textColor="text-purple-800 dark:text-purple-300" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ANALYTICS */}
                        {activeTab === "analytics" && (
                            <div className="space-y-8">
                                <SectionHeader icon={BarChart3} title={t("analytics.title")} subtitle={t("analytics.subtitle")} color="text-slate-800 dark:text-slate-200" bg="bg-slate-200 dark:bg-slate-800" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <FeatureCard icon={Package} title={t("analytics.stockValueTitle")} text={t("analytics.stockValueDesc")} iconColor="text-slate-600 dark:text-slate-400" bgAccent="bg-slate-100 dark:bg-slate-800" />
                                    <FeatureCard icon={TrendingUp} title={t("analytics.grossProfitTitle")} text={t("analytics.grossProfitDesc")} iconColor="text-emerald-600 dark:text-emerald-400" bgAccent="bg-emerald-50 dark:bg-emerald-900/20" />
                                    <FeatureCard icon={Zap} title={t("analytics.netProfitTitle")} text={t("analytics.netProfitDesc")} iconColor="text-amber-500 dark:text-amber-400" bgAccent="bg-amber-50 dark:bg-amber-900/20" />
                                    <FeatureCard icon={Users} title={t("analytics.topTitle")} text={t("analytics.topDesc")} iconColor="text-blue-600 dark:text-blue-400" bgAccent="bg-blue-50 dark:bg-blue-900/20" />
                                </div>
                            </div>
                        )}

                        {/* AI */}
                        {activeTab === "ai" && (
                            <div className="space-y-8">
                                <SectionHeader icon={Sparkles} title={t("ai.title")} subtitle={t("ai.subtitle")} color="text-violet-600 dark:text-violet-400" bg="bg-violet-100 dark:bg-violet-900/30" />

                                <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/10 border border-violet-100 dark:border-violet-800/30 rounded-3xl p-8 shadow-sm">
                                    <h3 className="font-bold text-violet-900 dark:text-violet-300 text-xl mb-6 flex items-center gap-2">
                                        <Sparkles className="w-5 h-5" /> {t("ai.capabilitiesTitle")}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {t.raw("ai.capabilitiesList").map((item: string, i: number) => (
                                            <div key={i} className="flex items-center gap-3 p-3 bg-white/60 dark:bg-slate-900/40 rounded-xl border border-violet-50 dark:border-violet-800/20 backdrop-blur-sm">
                                                <div className="bg-violet-100 dark:bg-violet-900/50 p-1.5 rounded-lg text-violet-600 dark:text-violet-400">
                                                    <CheckCircle className="w-4 h-4" />
                                                </div>
                                                <span className="font-medium text-violet-900 dark:text-violet-200 text-sm">{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FeatureCard icon={Monitor} title={t("ai.modelsTitle")} text={t("ai.modelsDesc")} iconColor="text-violet-600 dark:text-violet-400" bgAccent="bg-violet-50 dark:bg-violet-900/20" />
                                    <FeatureCard icon={Shield} title={t("ai.privacyTitle")} text={t("ai.privacyDesc")} iconColor="text-fuchsia-500 dark:text-fuchsia-400" bgAccent="bg-fuchsia-50 dark:bg-fuchsia-900/20" />
                                </div>
                            </div>
                        )}

                        {/* DELIVERY */}
                        {activeTab === "delivery" && (
                            <div className="space-y-8">
                                <SectionHeader icon={Truck} title="Système de Livraison & Tournées" subtitle="Gestion des colis E-commerce et de l'application mobile Chauffeur" color="text-sky-600 dark:text-sky-400" bg="bg-sky-100 dark:bg-sky-900/30" />

                                <div className="bg-sky-50/50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-900/30 rounded-2xl p-6 mb-8">
                                    <h3 className="font-bold text-xl text-sky-900 dark:text-sky-400 mb-6 flex items-center gap-2">
                                        <Package className="w-6 h-6" /> Expédition Colis (Yalidine, DHD, HDD)
                                    </h3>
                                    <div className="space-y-2">
                                        <Step n="1" title="Configuration API" text="Dans Paramètres > Paramètres Algériens, insérez vos clés API (ex: Yalidine API ID et Token) pour lier votre compte." bgColor="bg-sky-100 dark:bg-sky-900/40" textColor="text-sky-700 dark:text-sky-400" />
                                        <Step n="2" title="Création de Colis" text="Dans l'onglet Livraison, cliquez sur 'Nouveau Colis'. Le système génère automatiquement l'étiquette et le tracking code via l'API du prestataire." bgColor="bg-sky-100 dark:bg-sky-900/40" textColor="text-sky-700 dark:text-sky-400" />
                                        <Step n="3" title="Synchronisation" text="Les statuts (Livré, Retourné) se mettent à jour automatiquement via Webhooks. Vous pouvez aussi forcer la mise à jour via le bouton 'Sync API'." bgColor="bg-sky-100 dark:bg-sky-900/40" textColor="text-sky-700 dark:text-sky-400" />
                                    </div>
                                </div>

                                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-6 mb-8">
                                    <h3 className="font-bold text-xl text-indigo-900 dark:text-indigo-400 mb-6 flex items-center gap-2">
                                        <Truck className="w-6 h-6" /> Tournées B2B & App Mobile
                                    </h3>
                                    <div className="space-y-2">
                                        <Step n="1" title="Création de la Tournée" text="Dans l'onglet Tournées, créez une tournée, assignez un chauffeur, et ajoutez les clients à visiter." bgColor="bg-indigo-100 dark:bg-indigo-900/40" textColor="text-indigo-700 dark:text-indigo-400" />
                                        <Step n="2" title="Chargement du Camion" text="Cliquez sur 'Charger le Camion'. Les quantités sélectionnées seront automatiquement déduites de votre stock principal." bgColor="bg-indigo-100 dark:bg-indigo-900/40" textColor="text-indigo-700 dark:text-indigo-400" />
                                        <Step n="3" title="Application Chauffeur" text="Le chauffeur utilise l'App Mobile pour valider les arrêts, encaisser les paiements, gérer les retours et effectuer des ventes directes sur le terrain." bgColor="bg-indigo-100 dark:bg-indigo-900/40" textColor="text-indigo-700 dark:text-indigo-400" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FeatureCard icon={Monitor} title="Suivi GPS" text="Suivez la position exacte de vos chauffeurs et leur avancement en temps réel depuis le tableau de bord Admin." iconColor="text-emerald-600 dark:text-emerald-400" bgAccent="bg-emerald-50 dark:bg-emerald-900/20" />
                                    <FeatureCard icon={Receipt} title="Traçabilité" text="Chaque colis expédié est directement lié à sa commande ou facture d'origine dans le système." iconColor="text-violet-600 dark:text-violet-400" bgAccent="bg-violet-50 dark:bg-violet-900/20" />
                                </div>
                            </div>
                        )}

                    </div>
                </div>{/* end content area */}
            </div>{/* end layout */}
        </div>
    )
}
