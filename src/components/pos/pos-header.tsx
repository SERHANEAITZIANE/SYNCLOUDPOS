"use client"

import { Link } from "@/i18n/routing"
import { Home, Users, Package, CreditCard, Landmark, Bluetooth, LogOut } from "lucide-react"
import { useTranslations } from "next-intl"
import { signOut } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { useBluetoothPrinter } from "@/hooks/use-bluetooth-printer"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "react-hot-toast"

export const PosHeader = ({ storeName = "SYNCLOUDPOS" }: { storeName?: string }) => {
    const t = useTranslations("PosHeader")
    const navT = useTranslations("Navigation")
    const bluetooth = useBluetoothPrinter()

    const handleBluetoothToggle = async () => {
        if (bluetooth.isConnected) {
            bluetooth.disconnect()
            toast.success("Imprimante Bluetooth déconnectée")
        } else {
            const success = await bluetooth.connect()
            if (success) {
                toast.success(`Connecté à ${bluetooth.deviceName || "imprimante BT"}`)
            }
        }
    }

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
                {bluetooth.isSupported && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={`h-7 sm:h-8 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider rounded-lg sm:rounded-xl gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 transition-all duration-200 shrink-0 ${
                                    bluetooth.isConnected
                                        ? "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-300"
                                        : "border-gray-500/20 bg-gray-500/5 hover:bg-gray-500/10 text-gray-500 dark:text-gray-400"
                                }`}
                            >
                                <div className="relative">
                                    <Bluetooth className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                    {bluetooth.isConnected && (
                                        <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
                                    )}
                                </div>
                                <span className="hidden lg:inline">BT</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" align="end">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Bluetooth className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm font-semibold">Imprimante Bluetooth</span>
                                </div>
                                {bluetooth.isConnected ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 bg-green-500 rounded-full" />
                                            <span className="text-xs text-muted-foreground">{bluetooth.deviceName || "Connecté"}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 text-xs h-7"
                                                onClick={() => bluetooth.printTest()}
                                                disabled={bluetooth.printing}
                                            >
                                                {bluetooth.printing ? "..." : "Test"}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="flex-1 text-xs h-7"
                                                onClick={handleBluetoothToggle}
                                            >
                                                Déconnecter
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground">Aucune imprimante connectée</p>
                                        <Button
                                            size="sm"
                                            className="w-full text-xs h-7 bg-blue-600 hover:bg-blue-700"
                                            onClick={handleBluetoothToggle}
                                            disabled={bluetooth.connecting}
                                        >
                                            {bluetooth.connecting ? "Recherche..." : "Connecter"}
                                        </Button>
                                    </div>
                                )}
                                {bluetooth.error && (
                                    <p className="text-xs text-red-500">{bluetooth.error}</p>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                )}
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
                <Button
                    variant="outline"
                    onClick={async () => {
                        try {
                            await signOut({ callbackUrl: "/login", redirect: false })
                        } catch {
                            // ignore
                        }
                        window.location.href = "/login"
                    }}
                    className="h-7 sm:h-8 border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg sm:rounded-xl gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 transition-all duration-200 shrink-0 cursor-pointer shadow-sm"
                    title="Déconnexion"
                >
                    <LogOut className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline">Déconnexion</span>
                </Button>
            </div>
        </div>
    )
}
