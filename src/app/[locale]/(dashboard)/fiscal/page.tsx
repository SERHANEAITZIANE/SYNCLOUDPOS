"use client"

import { useState } from "react"
import { G50Client } from "./g50-client"
import { G12Client } from "./g12-client"
import { cn } from "@/lib/utils"
import { FileText, TrendingUp } from "lucide-react"

const TABS = [
    {
        id: "g50",
        icon: FileText,
        title: "G50 — TVA",
        subtitle: "Régime du Réel · Mensuelle",
        color: "text-blue-600",
        bg: "bg-blue-50 dark:bg-blue-950/30",
        border: "border-blue-200 dark:border-blue-800",
        activeBg: "bg-blue-600 text-white",
    },
    {
        id: "g12",
        icon: TrendingUp,
        title: "G12 — IFU",
        subtitle: "Régime Forfaitaire · Annuelle",
        color: "text-indigo-600",
        bg: "bg-indigo-50 dark:bg-indigo-950/30",
        border: "border-indigo-200 dark:border-indigo-800",
        activeBg: "bg-indigo-600 text-white",
    },
]

export default function FiscalPage() {
    const [activeTab, setActiveTab] = useState("g50")

    return (
        <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-black tracking-tight">Déclarations Fiscales</h1>
                <p className="text-muted-foreground mt-1.5">
                    G50 pour les assujettis à la TVA · G12 / G12 Bis pour le régime IFU
                </p>
            </div>

            {/* Tab Selector */}
            <div className="grid grid-cols-2 gap-4 no-print">
                {TABS.map(tab => {
                    const isActive = activeTab === tab.id
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all",
                                isActive
                                    ? `border-transparent ${tab.bg} shadow-md scale-[1.02]`
                                    : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 bg-white dark:bg-gray-900"
                            )}
                        >
                            <div className={cn(
                                "p-3 rounded-xl",
                                isActive ? tab.bg : "bg-gray-50 dark:bg-gray-800"
                            )}>
                                <Icon className={cn("h-6 w-6", isActive ? tab.color : "text-muted-foreground")} />
                            </div>
                            <div>
                                <p className={cn("text-lg font-black", isActive ? tab.color : "text-foreground")}>
                                    {tab.title}
                                </p>
                                <p className="text-xs text-muted-foreground font-medium">{tab.subtitle}</p>
                            </div>
                            {isActive && (
                                <span className={cn("ml-auto text-xs font-bold px-2.5 py-1 rounded-full", tab.activeBg)}>
                                    Actif
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === "g50" && <G50Client />}
                {activeTab === "g12" && <G12Client />}
            </div>
        </div>
    )
}
