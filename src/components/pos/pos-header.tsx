"use client"

import { Link } from "@/i18n/routing"
import { Home, Users, Package, CreditCard, Landmark } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"

export const PosHeader = ({ storeName = "SYNCLOUDPOS" }: { storeName?: string }) => {
    const t = useTranslations("PosHeader")
    const navT = useTranslations("Navigation")
    return (
        <div className="flex items-center justify-between px-2 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3 bg-card border-b border-border text-foreground shadow-sm h-11 sm:h-12 lg:h-14">
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0 min-w-0">
                <Link href="/hub">
                    <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted rounded-full h-7 w-7 sm:h-8 sm:w-8">
                        <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                </Link>
                <h1 className="text-xs sm:text-sm lg:text-base font-semibold tracking-wide text-foreground truncate max-w-[80px] sm:max-w-[120px] lg:max-w-none">{storeName}</h1>
            </div>
            
            {/* Quick Actions for Cashier / POS user */}
            <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 overflow-x-auto scrollbar-none flex-1 justify-end px-1 sm:px-2">
                <Link href="/customers">
                    <Button variant="outline" className="h-7 sm:h-8 border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/15 text-orange-600 dark:text-orange-300 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider rounded-lg sm:rounded-xl gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 transition-all duration-200 shrink-0">
                        <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span className="hidden lg:inline">{navT("customers")}</span>
                    </Button>
                </Link>
                <Link href="/products">
                    <Button variant="outline" className="h-7 sm:h-8 border-pink-500/20 bg-pink-500/5 hover:bg-pink-500/15 text-pink-600 dark:text-pink-300 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider rounded-lg sm:rounded-xl gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 transition-all duration-200 shrink-0">
                        <Package className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span className="hidden lg:inline">{navT("products")}</span>
                    </Button>
                </Link>
                <Link href="/payments" className="hidden sm:block">
                    <Button variant="outline" className="h-7 sm:h-8 border-green-500/20 bg-green-500/5 hover:bg-green-500/15 text-green-600 dark:text-green-300 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider rounded-lg sm:rounded-xl gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 transition-all duration-200 shrink-0">
                        <CreditCard className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span className="hidden lg:inline">{navT("payments")}</span>
                    </Button>
                </Link>
                <Link href="/emprunt" className="hidden md:block">
                    <Button variant="outline" className="h-7 sm:h-8 border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-600 dark:text-red-300 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider rounded-lg sm:rounded-xl gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 transition-all duration-200 shrink-0">
                        <Landmark className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span className="hidden lg:inline">{navT("customerLoan").split(" ")[0]}</span>
                    </Button>
                </Link>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                <div className="hidden sm:block text-[10px] sm:text-[11px] font-bold text-green-600 dark:text-green-400 bg-green-500/10 px-2 sm:px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                    {t("online")}
                </div>
            </div>
        </div>
    )
}
