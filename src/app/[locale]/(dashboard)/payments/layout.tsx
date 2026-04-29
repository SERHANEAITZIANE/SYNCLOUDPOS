"use client"

import { usePathname } from "next/navigation"
import { Link } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { Users, Truck } from "lucide-react"

export default function PaymentsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const isSupplier = pathname.includes("/payments/suppliers")

    const tabs = [
        {
            label: "Paiements Clients",
            href: "/payments" as const,
            icon: Users,
            active: !isSupplier,
        },
        {
            label: "Paiements Fournisseurs",
            href: "/payments/suppliers" as const,
            icon: Truck,
            active: isSupplier,
        },
    ]

    return (
        <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="border-b px-8 pt-6">
                <nav className="flex gap-1">
                    {tabs.map((tab) => (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border border-b-0 transition-colors",
                                tab.active
                                    ? "bg-background text-foreground border-border shadow-sm"
                                    : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Content */}
            {children}
        </div>
    )
}
