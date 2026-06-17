"use client"

import * as React from "react"
import { Moon, Sun, Palette, Check } from "lucide-react"
import { useTheme } from "next-themes"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const themeOptions = [
    {
        group: "Standard",
        themes: [
            { id: "light", icon: "☀️", colors: ["#f8fafc", "#e2e8f0", "#64748b"] },
            { id: "dark", icon: "🌙", colors: ["#0f172a", "#1e293b", "#6366f1"] },
            { id: "system", icon: "💻", colors: ["#f8fafc", "#0f172a", "#6366f1"] },
        ]
    },
    {
        group: "Riviera",
        themes: [
            { id: "riviera", icon: "🌊", colors: ["#FDFBF7", "#3578B2", "#8B7EC8"] },
            { id: "riviera-dark", icon: "🌊", colors: ["#0E1A25", "#5ABED6", "#A899E0"] },
        ]
    },
    {
        group: "Atlas",
        themes: [
            { id: "atlas", icon: "🌿", colors: ["#FAF8F3", "#2D6A4F", "#4361B2"] },
            { id: "atlas-dark", icon: "🌿", colors: ["#0D1210", "#4AAF75", "#6B8ADB"] },
        ]
    },
    {
        group: "Horizon",
        themes: [
            { id: "horizon", icon: "🌅", colors: ["#F5F7FA", "#3B82C4", "#7C6FAA"] },
            { id: "horizon-dark", icon: "🌅", colors: ["#0F1117", "#5BA3E0", "#9B8FCC"] },
        ]
    },
    {
        group: "M'zab Valley",
        themes: [
            { id: "ghardaia", icon: "🏜️", colors: ["#FBF7F0", "#C4593A", "#1B5E7B"] },
            { id: "ghardaia-dark", icon: "🏜️", colors: ["#0F0D0B", "#E8724A", "#5BA4C0"] },
        ]
    }
]

export function ModeToggle() {
    const { setTheme, theme } = useTheme()
    const t = useTranslations("ModeToggle")

    const darkThemes = ["dark", "ghardaia-dark", "riviera-dark", "atlas-dark", "horizon-dark"]
    const lightThemes = ["light", "ghardaia", "riviera", "atlas", "horizon"]

    React.useEffect(() => {
        if (typeof window === "undefined") return
        const list = document.documentElement.classList
        if (theme && darkThemes.includes(theme)) {
            if (!list.contains("dark")) list.add("dark")
        } else if (theme && lightThemes.includes(theme)) {
            if (list.contains("dark")) list.remove("dark")
        }
    }, [theme])

    const labelMap: Record<string, string> = {
        light: t("light"),
        dark: t("dark"),
        system: t("system"),
        riviera: "Riviera ☀️",
        "riviera-dark": "Riviera 🌙",
        atlas: "Atlas ☀️",
        "atlas-dark": "Atlas 🌙",
        horizon: "Horizon ☀️",
        "horizon-dark": "Horizon 🌙",
        ghardaia: t("ghardaia"),
        "ghardaia-dark": t("ghardaiaDark"),
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative overflow-hidden">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">{t("toggleTheme")}</span>
                </Button>
            </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-2 max-h-[70vh] overflow-y-auto">
                {themeOptions.map((group, gi) => (
                    <React.Fragment key={group.group}>
                        {gi > 0 && <div className="my-2 border-t border-border" />}
                        <div className="px-2.5 py-1.5 flex items-center gap-2">
                            {gi > 0 && <Palette className="w-3 h-3" style={{ color: group.themes[0]?.colors[1] }} />}
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                                {group.group}
                            </span>
                        </div>
                        {group.themes.map((t) => (
                            <DropdownMenuItem
                                key={t.id}
                                onClick={() => setTheme(t.id)}
                                className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg cursor-pointer group/item transition-all ${theme === t.id ? "bg-accent ring-1 ring-primary/20" : ""}`}
                            >
                                {/* Color swatch pills */}
                                <div className="flex items-center -space-x-1.5">
                                    {t.colors.map((color, ci) => (
                                        <div
                                            key={ci}
                                            className="w-5 h-5 rounded-full border-2 border-background shadow-sm transition-transform group-hover/item:scale-110"
                                            style={{ backgroundColor: color, zIndex: 3 - ci }}
                                        />
                                    ))}
                                </div>
                                <span className="text-xs font-semibold flex-1">
                                    {labelMap[t.id] || t.id}
                                </span>
                                {theme === t.id && (
                                    <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: t.colors[1] }} />
                                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                                    </div>
                                )}
                            </DropdownMenuItem>
                        ))}
                    </React.Fragment>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
