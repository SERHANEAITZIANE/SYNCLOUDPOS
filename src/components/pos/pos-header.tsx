"use client"

import { Link } from "@/i18n/routing"
import { Home, Users, Package, CreditCard, Landmark } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"

export const PosHeader = ({ storeName = "SYNCLOUDPOS" }: { storeName?: string }) => {
    const t = useTranslations("PosHeader")
    const navT = useTranslations("Navigation")
    return (
        <div className="flex items-center justify-between px-6 py-3 bg-[#131418] text-white shadow-sm h-14">
            <div className="flex items-center gap-4 shrink-0">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-8 w-8">
                        <Home className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="flex items-center gap-2">
                    <h1 className="text-base font-semibold tracking-wide text-white">{storeName}</h1>
                </div>
            </div>
            
            {/* Quick Actions for Cashier / POS user */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none max-w-[55vw] md:max-w-none px-2">
                <Link href="/customers">
                    <Button variant="outline" className="h-8 border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/15 text-orange-300 hover:text-orange-200 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider rounded-xl gap-1.5 px-3 py-1 transition-all duration-200 shrink-0">
                        <Users className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">{navT("customers")}</span>
                    </Button>
                </Link>
                <Link href="/products">
                    <Button variant="outline" className="h-8 border-pink-500/20 bg-pink-500/5 hover:bg-pink-500/15 text-pink-300 hover:text-pink-200 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider rounded-xl gap-1.5 px-3 py-1 transition-all duration-200 shrink-0">
                        <Package className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">{navT("products")}</span>
                    </Button>
                </Link>
                <Link href="/payments">
                    <Button variant="outline" className="h-8 border-green-500/20 bg-green-500/5 hover:bg-green-500/15 text-green-300 hover:text-green-200 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider rounded-xl gap-1.5 px-3 py-1 transition-all duration-200 shrink-0">
                        <CreditCard className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">{navT("payments")}</span>
                    </Button>
                </Link>
                <Link href="/emprunt">
                    <Button variant="outline" className="h-8 border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-300 hover:text-red-200 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider rounded-xl gap-1.5 px-3 py-1 transition-all duration-200 shrink-0">
                        <Landmark className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">{navT("customerLoan").split(" ")[0]}</span>
                    </Button>
                </Link>
            </div>

            <div className="flex items-center gap-3 shrink-0">
                <div className="text-[11px] font-bold text-green-400 bg-green-400/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                    {t("online")}
                </div>
            </div>
        </div>
    )
}
