"use client"

import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Wallet, CreditCard, Receipt, LayoutGrid } from "lucide-react"
import { useTranslations } from "next-intl"

const STORAGE_KEY = "pos_defaults_prefs"

export interface PosDefaultPrefs {
    defaultAccountId: string
    defaultPaymentMethod: "CASH" | "CARD" | "TRANSFER" | "CHECK" | "TERM"
    showTvaOnReceipt: boolean
    showHtPricesOnReceipt: boolean
    showFavoritesOnly: boolean
    posUiSize?: "sm" | "md" | "lg"
}

const defaults: PosDefaultPrefs = {
    defaultAccountId: "none",
    defaultPaymentMethod: "CASH",
    showTvaOnReceipt: false,
    showHtPricesOnReceipt: false,
    showFavoritesOnly: false,
    posUiSize: "md",
}

interface Account {
    id: string
    name: string
    type: string
    balance: number
}

interface PosDefaultsFormProps {
    accounts: Account[]
}

export const PosDefaultsForm = ({ accounts }: PosDefaultsFormProps) => {
    const t = useTranslations("Settings.PosDefaultsForm")
    const [prefs, setPrefs] = useState<PosDefaultPrefs>(defaults)

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) setPrefs(prev => ({ ...prev, ...JSON.parse(stored) }))
        } catch { /* noop */ }
    }, [])

    const handleSave = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
        toast.success(t("success"))
    }

    const cashAccounts = accounts.filter(a => a.type === "CAISSE")
    const bankAccounts = accounts.filter(a => a.type === "BANK")

    return (
        <div className="space-y-8">
            {/* Default Account */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Wallet className="w-5 h-5 text-green-500" />
                    <h3 className="text-base font-semibold">{t("accountSection.title")}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-lg">
                    <div className="space-y-2">
                        <Label>{t("accountSection.label")}</Label>
                        <Select
                            value={prefs.defaultAccountId}
                            onValueChange={(v) => setPrefs(p => ({ ...p, defaultAccountId: v }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t("accountSection.placeholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{t("accountSection.none")}</SelectItem>
                                {cashAccounts.length > 0 && (
                                    <>
                                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">{t("accountSection.cash")}</div>
                                        {cashAccounts.map(a => (
                                            <SelectItem key={a.id} value={a.id}>
                                                💰 {a.name}
                                            </SelectItem>
                                        ))}
                                    </>
                                )}
                                {bankAccounts.length > 0 && (
                                    <>
                                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">{t("accountSection.banks")}</div>
                                        {bankAccounts.map(a => (
                                            <SelectItem key={a.id} value={a.id}>
                                                🏦 {a.name}
                                            </SelectItem>
                                        ))}
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {t("accountSection.hint")}
                        </p>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Default Payment Method */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-blue-500" />
                    <h3 className="text-base font-semibold">{t("paymentSection.title")}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-lg">
                    <div className="space-y-2">
                        <Label>{t("paymentSection.label")}</Label>
                        <Select
                            value={prefs.defaultPaymentMethod}
                            onValueChange={(v) => setPrefs(p => ({ ...p, defaultPaymentMethod: v as PosDefaultPrefs["defaultPaymentMethod"] }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CASH">{t("paymentSection.methods.cash")}</SelectItem>
                                <SelectItem value="CARD">{t("paymentSection.methods.card")}</SelectItem>
                                <SelectItem value="TRANSFER">{t("paymentSection.methods.transfer")}</SelectItem>
                                <SelectItem value="CHECK">{t("paymentSection.methods.check")}</SelectItem>
                                <SelectItem value="TERM">{t("paymentSection.methods.term")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Receipt Display Options */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Receipt className="w-5 h-5 text-orange-500" />
                    <h3 className="text-base font-semibold">{t("receiptDisplay.title")}</h3>
                </div>
                <div className="space-y-4 bg-muted/40 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>{t("receiptDisplay.tva.label")}</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t("receiptDisplay.tva.hint")}
                            </p>
                        </div>
                        <Switch
                            checked={prefs.showTvaOnReceipt}
                            onCheckedChange={(v) => setPrefs(p => ({ ...p, showTvaOnReceipt: v }))}
                        />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>{t("receiptDisplay.ht.label")}</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t("receiptDisplay.ht.hint")}
                            </p>
                        </div>
                        <Switch
                            checked={prefs.showHtPricesOnReceipt}
                            onCheckedChange={(v) => setPrefs(p => ({ ...p, showHtPricesOnReceipt: v }))}
                        />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>{t("receiptDisplay.featuredOnly.label")}</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t("receiptDisplay.featuredOnly.hint")}
                            </p>
                        </div>
                        <Switch
                            checked={prefs.showFavoritesOnly}
                            onCheckedChange={(v) => setPrefs(p => ({ ...p, showFavoritesOnly: v }))}
                        />
                    </div>
                </div>
            </div>



            <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2">
                {t.rich("warning", { strong: (chunks) => <strong>{chunks}</strong> })}
            </p>

            <div className="flex justify-end pt-2">
                <Button onClick={handleSave} className="min-w-36">
                    {t("submit")}
                </Button>
            </div>
        </div>
    )
}
