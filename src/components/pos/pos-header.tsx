"use client"

import { Link } from "@/i18n/routing"
import { Home } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"

export const PosHeader = ({ storeName = "SYNCLOUDPOS" }: { storeName?: string }) => {
    const t = useTranslations("PosHeader")
    return (
        <div className="flex items-center justify-between px-6 py-3 bg-[#131418] text-white shadow-sm h-14">
            <div className="flex items-center gap-4">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-8 w-8">
                        <Home className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="flex items-center gap-2">
                    <h1 className="text-base font-semibold tracking-wide text-white">{storeName}</h1>
                </div>
            </div>
            <div className="flex items-center gap-4">
                {/* Clock, Status, User Profile could go here */}
                <div className="text-[11px] font-bold text-green-400 bg-green-400/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {t("online")}
                </div>
            </div>
        </div>
    )
}
