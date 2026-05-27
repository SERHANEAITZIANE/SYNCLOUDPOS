"use client"

import { useState, useEffect } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
    BookOpen, Search, X, CheckCircle2, ChevronDown, ChevronUp,
    Sparkles, Zap, Award, Check
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FORMATION_TOPICS, FormationTopic } from "./formation-data"

export const FormationClient = () => {
    const locale = useLocale() as "fr" | "ar"
    const isAr = locale === "ar"
    const t = useTranslations("Formation")

    // UI States
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string>("all")
    const [expandedTopicId, setExpandedTopicId] = useState<string | null>("dashboard")
    const [masteredIds, setMasteredIds] = useState<string[]>([])

    // Load mastered list from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem("syncloudpos_mastered_training")
            if (saved) {
                setMasteredIds(JSON.parse(saved))
            }
        } catch (e) {
            console.error("Failed to load mastered topics:", e)
        }
    }, [])

    const toggleMastered = (id: string) => {
        let updated: string[]
        if (masteredIds.includes(id)) {
            updated = masteredIds.filter(item => item !== id)
        } else {
            updated = [...masteredIds, id]
        }
        setMasteredIds(updated)
        try {
            localStorage.setItem("syncloudpos_mastered_training", JSON.stringify(updated))
        } catch (e) {
            console.error("Failed to save mastered topics:", e)
        }
    }

    // Category lists
    const categories = [
        { id: "all", label: isAr ? "الكل" : "Tous" },
        { id: "dashboard", label: isAr ? "لوحة التحكم" : "Tableau de Bord" },
        { id: "pos", label: isAr ? "الصندوق" : "Caisse POS" },
        { id: "stocks", label: isAr ? "المخزن" : "Stocks" },
        { id: "sales", label: isAr ? "الفواتير" : "Ventes (BL)" },
        { id: "purchases", label: isAr ? "المشتريات" : "Achats & IA" },
        { id: "treasury", label: isAr ? "الخزينة" : "Trésorerie" },
        { id: "contacts", label: isAr ? "الديون" : "Clients & Dettes" },
        { id: "delivery", label: isAr ? "الشحن" : "Logistique B2B" },
        { id: "analytics", label: isAr ? "التقارير" : "الضرائب & Marges" },
    ]

    // Search and category filtering logic
    const filteredTopics = FORMATION_TOPICS.filter(topic => {
        const activeData = isAr ? topic.ar : topic.fr
        const matchesCategory = selectedCategory === "all" || topic.category === selectedCategory

        if (!matchesCategory) return false

        if (!searchQuery.trim()) return true

        const query = searchQuery.toLowerCase()
        const titleMatch = activeData.title.toLowerCase().includes(query)
        const subtitleMatch = activeData.subtitle.toLowerCase().includes(query)
        const descMatch = activeData.description.toLowerCase().includes(query)
        const scenarioMatch = activeData.scenarioText.toLowerCase().includes(query) || activeData.scenarioTitle.toLowerCase().includes(query)
        const tagsMatch = topic.searchTags.some(tag => tag.toLowerCase().includes(query))

        return titleMatch || subtitleMatch || descMatch || scenarioMatch || tagsMatch
    })

    // Compute progress
    const totalCount = FORMATION_TOPICS.length
    const masteredCount = masteredIds.length
    const progressPercent = Math.round((masteredCount / totalCount) * 100)

    const locLabels = {
        searchPlaceholder: isAr ? "ابحث عن أي ميزة، طريقة استخدام أو سيناريو..." : "Rechercher une fonctionnalité, un guide, un scénario algérien...",
        allTopics: isAr ? "قائمة الدروس والميزات" : "Liste des Modules & Mises en Pratique",
        proTipsTitle: isAr ? "💡 نصيحة احترافية :" : "💡 ASTUCE DE PRO :",
        markAsMastered: isAr ? "تميز كـ متقن للدرس" : "Marquer comme maîtrisé",
        alreadyMastered: isAr ? "✅ تم إتقان هذا الدرس" : "✅ Module maîtrisé !",
        progressTitle: isAr ? "مستوى إتقان النظام" : "Score de Maîtrise de l'ERP",
        progressSub: isAr ? `${masteredCount} من ${totalCount} دروس مكتملة` : `${masteredCount} sur ${totalCount} thématiques maîtrisées`,
        noResults: isAr ? "لم نجد أي نتيجة مطابقة لبحثك. حاول بكلمة أخرى مثل 'يالدين' أو 'سليمان'." : "Aucun résultat trouvé pour votre recherche. Essayez avec un autre mot-clé (ex: Yalidine, Caisse, Crédit).",
        clearSearch: isAr ? "مسح البحث" : "Effacer la recherche"
    }

    return (
        <div 
            className={cn(
                "min-h-screen pb-16 animate-in fade-in slide-in-from-bottom-4 duration-500",
                isAr ? "text-right" : "text-left"
            )}
            dir={isAr ? "rtl" : "ltr"}
        >
            {/* Hero Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-8 md:p-14 mb-8 text-white relative overflow-hidden shadow-xl border border-slate-700/50">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: isAr ? 'radial-gradient(circle at 20% 20%, #818cf8 0%, transparent 50%)' : 'radial-gradient(circle at 80% 20%, #818cf8 0%, transparent 50%)' }} />
                <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                
                <div className="relative z-10 max-w-4xl">
                    <div className={cn(
                        "inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 text-sm font-semibold mb-6 uppercase tracking-wider text-indigo-100",
                        isAr && "flex-row-reverse"
                    )}>
                        <BookOpen className="w-4 h-4 text-emerald-400" />
                        {t("hero.badge")}
                    </div>
                    
                    <h1 className="text-3xl md:text-6xl font-extrabold mb-4 tracking-tight leading-tight">
                        {isAr ? (
                            <>
                                دليل تدريب <span className="text-indigo-400">SynCloudPOS</span> المطور
                            </>
                        ) : (
                            <>
                                Portail de Formation <span className="text-indigo-400">SynCloudPOS</span>
                            </>
                        )}
                    </h1>
                    
                    <p className="text-slate-300 text-base md:text-xl leading-relaxed mb-8 font-medium max-w-3xl">
                        {isAr 
                          ? "دليلك الشامل لتعلم كل صغيرة وكبيرة في النظام. هذا الدليل مبني بسيناريوهات واقعية مستوحاة من المحلات والأنشطة التجارية الجزائرية لمساعدتك ومساعدة عمالك على التميز."
                          : "Explorez notre base de connaissances exhaustive. Chaque module comprend des explications détaillées, des guides numérotés pas-à-pas, et des scénarios inspirés du quotidien commercial algérien."
                        }
                    </p>
                    
                    <div className={cn("flex flex-wrap gap-3", isAr && "justify-start flex-row-reverse")}>
                        {(isAr 
                            ? ["نقاط البيع", "الجرد السنوي", "توصيل يالدين", "إدارة الديون", "الفاتورة ج50"]
                            : ["Caisse POS", "Stocks & Inventaire", "Yalidine API", "Ligne de Crédit", "Impôts G50"]
                        ).map((tag: string) => (
                            <span key={tag} className={cn("flex items-center gap-2 text-sm font-medium bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2 hover:bg-white/10 transition-colors", isAr && "flex-row-reverse")}>
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mastery Score Progress Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-md relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-5">
                    <Award className="w-48 h-48 text-indigo-400" />
                </div>
                <div className={cn("flex items-center gap-4 relative z-10", isAr && "flex-row-reverse")}>
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner">
                        <Award className="w-7 h-7 text-indigo-400 animate-pulse" />
                    </div>
                    <div className={cn("flex flex-col", isAr && "items-start")}>
                        <h3 className="font-bold text-slate-100 text-lg">{locLabels.progressTitle}</h3>
                        <p className="text-sm text-slate-400 mt-1">{locLabels.progressSub}</p>
                    </div>
                </div>

                <div className="w-full md:w-80 flex flex-col gap-2 relative z-10">
                    <div className={cn("flex justify-between text-sm font-bold text-slate-300", isAr && "flex-row-reverse")}>
                        <span>{progressPercent}%</span>
                        <span>{isAr ? "معدل الإكمال" : "Progression"}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700/50">
                        <div 
                            className="bg-gradient-to-r from-emerald-500 to-indigo-500 h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Search Engine Input Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mb-8 shadow-sm">
                <div className="relative">
                    <Search className={cn("absolute top-3.5 w-5 h-5 text-slate-400", isAr ? "right-4" : "left-4")} />
                    <TextInput
                        value={searchQuery}
                        onChange={(e: any) => setSearchQuery(e.target.value)}
                        placeholder={locLabels.searchPlaceholder}
                        className={cn(
                            "w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-12 text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all",
                            isAr ? "text-right" : "text-left"
                        )}
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery("")}
                            className={cn("absolute top-3.5 hover:text-slate-600 dark:hover:text-slate-200 text-slate-400", isAr ? "left-4" : "right-4")}
                            title={locLabels.clearSearch}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Categories Filter Chips */}
                <div className={cn("flex flex-wrap gap-2 mt-4 overflow-x-auto pb-2", isAr && "justify-start flex-row-reverse")}>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={cn(
                                "text-xs font-semibold px-4 py-2 rounded-xl transition-all border shrink-0",
                                selectedCategory === cat.id
                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10"
                                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                            )}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List Header */}
            <h2 className={cn("text-xl font-bold text-slate-900 dark:text-slate-100 mb-6", isAr && "text-right pr-2")}>
                {locLabels.allTopics} ({filteredTopics.length})
            </h2>

            {/* Empty search results state */}
            {filteredTopics.length === 0 && (
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center max-w-2xl mx-auto shadow-inner">
                    <Search className="w-12 h-12 text-slate-400 mx-auto mb-4 animate-bounce" />
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg mb-2">
                        {isAr ? "لا توجد نتائج" : "Aucun résultat"}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                        {locLabels.noResults}
                    </p>
                    <button 
                        onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
                        className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md transition-colors"
                    >
                        {isAr ? "إعادة تعيين الفلاتر" : "Réinitialiser les filtres"}
                    </button>
                </div>
            )}

            {/* Topics accordion stack */}
            <div className="space-y-4">
                {filteredTopics.map((topic) => {
                    const isExpanded = expandedTopicId === topic.id
                    const isTopicMastered = masteredIds.includes(topic.id)
                    const activeContent = isAr ? topic.ar : topic.fr
                    const IconComponent = topic.icon

                    // Dynamic category color schema
                    const themeColors = {
                        dashboard: { icon: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
                        pos: { icon: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                        stocks: { icon: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
                        sales: { icon: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
                        purchases: { icon: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
                        treasury: { icon: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
                        contacts: { icon: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
                        delivery: { icon: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/20" },
                        analytics: { icon: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20" },
                    }[topic.category]

                    return (
                        <div 
                            key={topic.id}
                            className={cn(
                                "border rounded-3xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-all duration-300",
                                isExpanded 
                                  ? "border-slate-300 dark:border-slate-700 shadow-md translate-y-[-2px]" 
                                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                            )}
                        >
                            {/* Accordion header */}
                            <button
                                onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                                className={cn(
                                    "w-full flex items-center justify-between p-5 md:p-6 text-left",
                                    isAr && "flex-row-reverse text-right"
                                )}
                            >
                                <div className={cn("flex items-center gap-4 flex-1 min-w-0", isAr && "flex-row-reverse")}>
                                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border", themeColors.bg, themeColors.border)}>
                                        <IconComponent className={cn("w-6 h-6", themeColors.icon)} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={cn("flex items-center gap-2 flex-wrap", isAr && "flex-row-reverse")}>
                                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg truncate">
                                                {activeContent.title}
                                            </h3>
                                            {isTopicMastered && (
                                                <span className={cn(
                                                    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0",
                                                    isAr && "flex-row-reverse"
                                                )}>
                                                    <Check className="w-3 h-3" />
                                                    {isAr ? "مكتمل" : "Maîtrisé"}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-1 font-medium">
                                            {activeContent.subtitle}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="shrink-0 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 ml-4 mr-4">
                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                                </div>
                            </button>

                            {/* Accordion content */}
                            {isExpanded && (
                                <div className="px-5 pb-6 md:px-8 md:pb-8 border-t border-slate-100 dark:border-slate-800/50 pt-6 animate-in slide-in-from-top-2 duration-300">
                                    {/* Description */}
                                    <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed mb-6 font-medium">
                                        {activeContent.description}
                                    </p>

                                    {/* Step-by-Step Chronology */}
                                    <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-2xl p-5 md:p-6 mb-6">
                                        <h4 className={cn("font-bold text-slate-900 dark:text-slate-100 text-base mb-6 flex items-center gap-2", isAr && "flex-row-reverse")}>
                                            <BookOpen className="w-5 h-5 text-indigo-500 shrink-0" />
                                            {activeContent.stepsTitle}
                                        </h4>
                                        <div className="relative">
                                            {/* Vertical connector line */}
                                            <div className={cn("absolute top-5 bottom-5 w-0.5 bg-slate-200 dark:bg-slate-800", isAr ? "right-5" : "left-5")} />

                                            <div className="space-y-6">
                                                {activeContent.steps.map((step) => (
                                                    <div 
                                                        key={step.n} 
                                                        className={cn("flex gap-4 relative items-start", isAr && "flex-row-reverse")}
                                                    >
                                                        <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold text-sm shadow-inner z-10 shrink-0">
                                                            {step.n}
                                                        </div>
                                                        <div className={cn("flex-1 pt-1", isAr ? "text-right" : "text-left")}>
                                                            <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                                                {step.title}
                                                            </h5>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                                                {step.desc}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Algerian Real-World Business Scenario Card */}
                                    <div className="bg-gradient-to-br from-indigo-500/5 to-emerald-500/5 border border-indigo-500/10 dark:border-indigo-400/5 rounded-3xl p-6 mb-6 shadow-inner relative overflow-hidden">
                                        <div className={cn("absolute top-0 opacity-10", isAr ? "left-0" : "right-0")}>
                                            <Sparkles className="w-32 h-32 text-indigo-500/20" />
                                        </div>
                                        <div className="relative z-10">
                                            <div className={cn("flex items-center gap-2 mb-3", isAr && "flex-row-reverse")}>
                                                <Sparkles className="w-5 h-5 text-emerald-500 shrink-0" />
                                                <h5 className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm tracking-wide uppercase">
                                                    {activeContent.scenarioTitle}
                                                </h5>
                                            </div>
                                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-semibold italic">
                                                {activeContent.scenarioText}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Pro Tip Card */}
                                    <div className={cn("flex items-start gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6", isAr && "flex-row-reverse")}>
                                        <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                                        <div className={cn("flex-1", isAr ? "text-right" : "text-left")}>
                                            <h6 className="font-extrabold text-amber-600 dark:text-amber-400 text-xs tracking-wider uppercase mb-1">
                                                {locLabels.proTipsTitle}
                                            </h6>
                                            <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold leading-relaxed">
                                                {activeContent.proTips}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Mark as Mastered button */}
                                    <div className={cn("flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800/40", isAr && "justify-start")}>
                                        <button
                                            onClick={() => toggleMastered(topic.id)}
                                            className={cn(
                                                "px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm border",
                                                isTopicMastered
                                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                                    : "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md"
                                            )}
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            {isTopicMastered ? locLabels.alreadyMastered : locLabels.markAsMastered}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// Stub interface to bypass compilation issue on custom browser text inputs
interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
const TextInput = (props: TextInputProps) => {
    return <input {...props} />
}
