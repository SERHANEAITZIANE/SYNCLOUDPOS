"use client"

import { Bell, AlertTriangle, AlertCircle, Info, Package, Users, Truck, ShoppingBag, X } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { getAlerts, Alert, AlertType } from "@/actions/alerts"
import { useRouter } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const ALERT_ICONS: Record<AlertType, React.ElementType> = {
    STOCK_RUPTURE: Package,
    LOW_STOCK: Package,
    UNPAID_CUSTOMER: Users,
    UNPAID_SUPPLIER: Truck,
    PENDING_PURCHASE: ShoppingBag,
}

const SEVERITY_STYLES = {
    critical: {
        bg: "bg-red-50 dark:bg-red-950/35",
        border: "border-red-200 dark:border-red-900/50",
        icon: "text-red-500 dark:text-red-400",
        badge: "bg-red-500",
        indicator: "bg-red-500 dark:bg-red-600",
        text: "text-red-950 dark:text-red-100",
        desc: "text-red-800/80 dark:text-red-300/80",
    },
    warning: {
        bg: "bg-amber-50 dark:bg-amber-950/35",
        border: "border-amber-200 dark:border-amber-900/50",
        icon: "text-amber-500 dark:text-amber-400",
        badge: "bg-amber-500",
        indicator: "bg-amber-500 dark:bg-amber-600",
        text: "text-amber-950 dark:text-amber-100",
        desc: "text-amber-800/80 dark:text-amber-300/80",
    },
    info: {
        bg: "bg-blue-50 dark:bg-blue-950/35",
        border: "border-blue-200 dark:border-blue-900/50",
        icon: "text-blue-500 dark:text-blue-400",
        badge: "bg-blue-500",
        indicator: "bg-blue-500 dark:bg-blue-600",
        text: "text-blue-950 dark:text-blue-100",
        desc: "text-blue-800/80 dark:text-blue-300/80",
    },
}

export function NotificationBell() {
    const [alerts, setAlerts] = useState<Alert[]>([])
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const [dismissed, setDismissed] = useState<Set<string>>(new Set())
    const router = useRouter()

    const fetchAlerts = useCallback(async () => {
        try {
            const data = await getAlerts()
            setAlerts(data)
        } catch (e) {
            console.error("Failed to fetch alerts", e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchAlerts()
        // Re-fetch every 2 minutes
        const interval = setInterval(fetchAlerts, 120_000)
        return () => clearInterval(interval)
    }, [fetchAlerts])

    const visibleAlerts = alerts.filter(a => !dismissed.has(a.id))
    const criticalCount = visibleAlerts.filter(a => a.severity === "critical").length
    const totalCount = visibleAlerts.length
    const badgeCount = totalCount

    const handleDismiss = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setDismissed(prev => new Set(prev).add(id))
    }

    const handleAlertClick = (href: string) => {
        setOpen(false)
        router.push(href as any)
    }

    return (
        <div className="relative">
            {/* Bell Button */}
            <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9"
                onClick={() => setOpen(prev => !prev)}
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5" />
                {badgeCount > 0 && (
                    <span
                        className={cn(
                            "absolute -top-1 -right-1 h-5 w-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center",
                            criticalCount > 0 ? "bg-red-500" : "bg-amber-500"
                        )}
                    >
                        {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                )}
            </Button>

            {/* Dropdown Panel */}
            {open && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-all duration-200 animate-in fade-in"
                        onClick={() => setOpen(false)}
                    />
                    <div className="fixed md:absolute right-4 md:right-0 top-16 md:top-12 z-50 w-[calc(100vw-2rem)] sm:w-96 max-h-[80vh] overflow-hidden rounded-xl border bg-background/95 backdrop-blur-md shadow-2xl flex flex-col animate-in slide-in-from-top-2 fade-in duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                            <div className="flex items-center gap-2">
                                <Bell className="h-4 w-4 text-muted-foreground" />
                                <h3 className="font-semibold text-sm">Alertes & Notifications</h3>
                                {totalCount > 0 && (
                                    <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                                        {totalCount}
                                    </span>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-muted-foreground"
                                onClick={() => setDismissed(new Set(alerts.map(a => a.id)))}
                                disabled={totalCount === 0}
                            >
                                Tout ignorer
                            </Button>
                        </div>

                        {/* Alerts list */}
                        <div className="overflow-y-auto flex-1">
                            {loading ? (
                                <div className="flex flex-col gap-2 p-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                                    ))}
                                </div>
                            ) : visibleAlerts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                    <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
                                        <Bell className="h-6 w-6 text-green-500" />
                                    </div>
                                    <p className="font-medium text-sm">Tout est en ordre !</p>
                                    <p className="text-xs text-muted-foreground mt-1">Aucune alerte en cours</p>
                                </div>
                            ) : (
                                <div className="p-3 flex flex-col gap-2">
                                    {visibleAlerts.map(alert => {
                                        const style = SEVERITY_STYLES[alert.severity]
                                        const Icon = ALERT_ICONS[alert.type]
                                        const SeverityIcon =
                                            alert.severity === "critical"
                                                ? AlertCircle
                                                : alert.severity === "warning"
                                                    ? AlertTriangle
                                                    : Info

                                        return (
                                            <div
                                                key={alert.id}
                                                className={cn(
                                                    "group relative flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all hover:shadow-sm",
                                                    style.bg,
                                                    style.border
                                                )}
                                                onClick={() => handleAlertClick(alert.href)}
                                            >
                                                {/* Severity indicator bar */}
                                                <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-lg", style.indicator)} />

                                                <div className={cn("mt-0.5 shrink-0", style.icon)}>
                                                    <Icon className="h-4 w-4" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <SeverityIcon className={cn("h-3 w-3 shrink-0", style.icon)} />
                                                        <p className={cn("text-xs font-semibold truncate", style.text)}>{alert.title}</p>
                                                    </div>
                                                    <p className={cn("text-xs leading-snug", style.desc)}>{alert.description}</p>
                                                </div>

                                                {/* Dismiss button */}
                                                <button
                                                    className="shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                                                    onClick={(e) => handleDismiss(alert.id, e)}
                                                    aria-label="Ignorer"
                                                >
                                                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {visibleAlerts.length > 0 && (
                            <div className="border-t px-4 py-2 text-center">
                                <p className="text-[11px] text-muted-foreground">
                                    Mis à jour automatiquement toutes les 2 minutes · Cliquer pour naviguer
                                </p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
