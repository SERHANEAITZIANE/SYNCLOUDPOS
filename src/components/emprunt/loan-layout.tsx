"use client"

import { usePathname } from "next/navigation"
import { Link } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { Users, Truck } from "lucide-react"

export default function LoanLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const isSupplier = pathname.includes("/emprunt-fournisseur")

    const tabs = [
        {
            label: "Emprunts Clients",
            href: "/emprunt" as const,
            icon: Users,
            active: !isSupplier,
        },
        {
            label: "Emprunts Fournisseurs",
            href: "/emprunt-fournisseur" as const,
            icon: Truck,
            active: isSupplier,
        },
    ]

    return (
        <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="border-b px-8 pt-6">
                <nav className="flex gap-1">
                    {tabs.map((tab) => {
                        const isFournisseur = tab.href.includes("fournisseur")
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border border-b-0 transition-colors",
                                    tab.active
                                        ? isFournisseur
                                            ? "bg-rose-50 text-rose-700 border-rose-200 shadow-sm dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/50"
                                            : "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50"
                                        : isFournisseur
                                            ? "bg-transparent text-muted-foreground border-transparent hover:text-rose-600 hover:bg-rose-50/50 dark:hover:text-rose-400 dark:hover:bg-rose-950/10"
                                            : "bg-transparent text-muted-foreground border-transparent hover:text-emerald-600 hover:bg-emerald-50/50 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/10"
                                )}
                            >
                                <tab.icon className={cn("h-4 w-4", tab.active ? (isFournisseur ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400") : "")} />
                                {tab.label}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* Content */}
            <div className="flex-1">
                {children}
            </div>
        </div>
    )
}
