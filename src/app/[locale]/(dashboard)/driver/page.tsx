"use client"

import { useState, useEffect, useCallback } from "react"
import { 
    Truck, MapPin, Package, LogIn, LogOut, ChevronRight, 
    Phone, Clock, CheckCircle, XCircle, Navigation, RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"

interface User {
    id: string; name: string; role: string; email: string
    tenant: { name: string; logo?: string }
}

interface TourStop {
    id: string; sortOrder: number; status: string
    customer: { id: string; name: string; phone?: string; address?: string; balance: number }
    arrivedAt?: string; completedAt?: string
    paymentAmount: number; paymentMethod?: string
    notes?: string
}

interface Tour {
    id: string; name: string; status: string; date: string
    stops: TourStop[]
    truckLoad?: { id: string; status: string; items: any[] }
}

export default function DriverPortalPage() {
    const [token, setToken] = useState<string | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [tour, setTour] = useState<Tour | null>(null)
    const [loading, setLoading] = useState(false)
    const [loginForm, setLoginForm] = useState({ email: "", password: "" })
    const [loginError, setLoginError] = useState("")
    const [gpsActive, setGpsActive] = useState(false)

    // Load saved token
    useEffect(() => {
        const saved = localStorage.getItem("driver_token")
        const savedUser = localStorage.getItem("driver_user")
        if (saved && savedUser) {
            setToken(saved)
            setUser(JSON.parse(savedUser))
        }
    }, [])

    // ── GPS Background Reporting ──
    useEffect(() => {
        if (!token || !user) return

        const sendLocation = () => {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    setGpsActive(true)
                    try {
                        await fetch("/api/mobile/location", {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${token}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                latitude: pos.coords.latitude,
                                longitude: pos.coords.longitude,
                                speed: pos.coords.speed ? pos.coords.speed * 3.6 : null, // m/s to km/h
                                heading: pos.coords.heading,
                                accuracy: pos.coords.accuracy,
                                source: "PHONE",
                            }),
                        })
                    } catch (e) {
                        console.error("[GPS]", e)
                    }
                },
                (err) => {
                    setGpsActive(false)
                    console.warn("[GPS] Error:", err.message)
                },
                { enableHighAccuracy: true, timeout: 10000 }
            )
        }

        // Send immediately, then every 60s
        sendLocation()
        const interval = setInterval(sendLocation, 60000)
        return () => clearInterval(interval)
    }, [token, user])

    // ── Auth ──
    const handleLogin = async () => {
        setLoginError("")
        setLoading(true)
        try {
            const res = await fetch("/api/mobile/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: loginForm.email,
                    password: loginForm.password,
                    deviceName: navigator.userAgent.slice(0, 50),
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                setLoginError(data.error || "Connexion échouée")
            } else {
                localStorage.setItem("driver_token", data.accessToken)
                localStorage.setItem("driver_user", JSON.stringify(data.user))
                setToken(data.accessToken)
                setUser(data.user)
            }
        } catch {
            setLoginError("Erreur réseau")
        }
        setLoading(false)
    }

    const handleLogout = () => {
        localStorage.removeItem("driver_token")
        localStorage.removeItem("driver_user")
        setToken(null)
        setUser(null)
        setTour(null)
    }

    // ── Load Today's Tour ──
    const loadTour = useCallback(async () => {
        if (!token) return
        setLoading(true)
        try {
            const res = await fetch("/api/mobile/tours", {
                headers: { "Authorization": `Bearer ${token}` },
            })
            if (res.ok) {
                const data = await res.json()
                // Get the first active tour (today's)
                const activeTour = data.find((t: any) => t.status !== "COMPLETED") || data[0]
                if (activeTour) {
                    // Load tour details
                    const detailRes = await fetch(`/api/mobile/tours/${activeTour.id}`, {
                        headers: { "Authorization": `Bearer ${token}` },
                    })
                    if (detailRes.ok) {
                        setTour(await detailRes.json())
                    }
                }
            }
        } catch (e) {
            console.error("[TOUR]", e)
        }
        setLoading(false)
    }, [token])

    useEffect(() => {
        if (token) loadTour()
    }, [token, loadTour])

    // ── Mark stop visited ──
    const markStopVisited = async (tourId: string, stopId: string) => {
        if (!token) return
        try {
            await fetch(`/api/mobile/tours/${tourId}/stops/${stopId}`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: "VISITED" }),
            })
            loadTour()
        } catch (e) {
            console.error("[STOP]", e)
        }
    }

    // ── Render ──
    if (!token || !user) {
        return (
            <div className="min-h-dvh bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                            <Truck className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">SyncloudPOS</h1>
                        <p className="text-blue-300 text-sm mt-1">Portail Livreur</p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider">Email ou Téléphone</label>
                                <input
                                    type="text"
                                    className="w-full mt-1.5 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="email@example.com"
                                    value={loginForm.email}
                                    onChange={(e) => setLoginForm(f => ({ ...f, email: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider">Mot de passe</label>
                                <input
                                    type="password"
                                    className="w-full mt-1.5 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="••••••••"
                                    value={loginForm.password}
                                    onChange={(e) => setLoginForm(f => ({ ...f, password: e.target.value }))}
                                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                                />
                            </div>
                            {loginError && (
                                <p className="text-red-400 text-sm text-center">{loginError}</p>
                            )}
                            <button
                                onClick={handleLogin}
                                disabled={loading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                    <LogIn className="h-4 w-4" />
                                )}
                                Connexion
                            </button>
                        </div>
                    </div>

                    <p className="text-center text-blue-400/50 text-xs mt-6">
                        Ajoutez cette page à votre écran d&apos;accueil pour un accès rapide
                    </p>
                </div>
            </div>
        )
    }

    // ── Main Dashboard ──
    const pendingStops = tour?.stops.filter(s => s.status === "PENDING") || []
    const visitedStops = tour?.stops.filter(s => s.status === "VISITED" || s.status === "COMPLETED") || []
    const progress = tour ? Math.round((visitedStops.length / Math.max(tour.stops.length, 1)) * 100) : 0

    return (
        <div className="min-h-dvh bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-4 safe-area-inset">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <span className="font-bold text-lg">{user.name.charAt(0)}</span>
                        </div>
                        <div>
                            <p className="font-semibold text-sm">{user.name}</p>
                            <p className="text-blue-200 text-xs">{user.tenant.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                            gpsActive ? "bg-green-500/20 text-green-200" : "bg-red-500/20 text-red-200"
                        )}>
                            <Navigation className="h-3 w-3" />
                            {gpsActive ? "GPS" : "GPS OFF"}
                        </div>
                        <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg">
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Tour progress */}
                {tour && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="font-medium">{tour.name || "Tournée du jour"}</span>
                            <span className="text-blue-200">{visitedStops.length}/{tour.stops.length} clients</span>
                        </div>
                        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 px-4 -mt-3 relative z-10">
                <div className="bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm text-center border">
                    <p className="text-xl font-bold text-foreground">{pendingStops.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Restants</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm text-center border">
                    <p className="text-xl font-bold text-green-600">{visitedStops.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Visités</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm text-center border">
                    <p className="text-xl font-bold text-blue-600">
                        {(tour?.stops.reduce((s, stop) => s + stop.paymentAmount, 0) || 0).toLocaleString("fr-FR")}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Encaissé</p>
                </div>
            </div>

            {/* Content */}
            <div className="px-4 py-4 space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-lg">
                        {tour ? "Arrêts du jour" : "Aucune tournée"}
                    </h2>
                    <button
                        onClick={loadTour}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </button>
                </div>

                {!tour && !loading && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Aucune tournée assignée</p>
                        <p className="text-sm">Contactez votre manager pour planifier une tournée</p>
                    </div>
                )}

                {tour?.stops
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((stop, i) => {
                        const isVisited = stop.status === "VISITED" || stop.status === "COMPLETED"
                        const isPending = stop.status === "PENDING"

                        return (
                            <div
                                key={stop.id}
                                className={cn(
                                    "bg-white dark:bg-gray-900 rounded-xl p-4 border shadow-sm transition-all",
                                    isVisited && "opacity-60 border-green-200 dark:border-green-900"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Stop number */}
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0",
                                        isVisited
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    )}>
                                        {isVisited ? <CheckCircle className="h-4 w-4" /> : i + 1}
                                    </div>

                                    {/* Customer info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className={cn(
                                                "font-semibold text-sm truncate",
                                                isVisited && "line-through"
                                            )}>
                                                {stop.customer.name}
                                            </h3>
                                            {Number(stop.customer.balance) > 0 && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-bold shrink-0">
                                                    {Number(stop.customer.balance).toLocaleString()} DA
                                                </span>
                                            )}
                                        </div>
                                        {stop.customer.address && (
                                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                                <MapPin className="h-3 w-3 inline mr-0.5" />
                                                {stop.customer.address}
                                            </p>
                                        )}

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 mt-2">
                                            {stop.customer.phone && (
                                                <a
                                                    href={`tel:${stop.customer.phone}`}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-lg text-xs font-medium"
                                                >
                                                    <Phone className="h-3 w-3" />
                                                    Appeler
                                                </a>
                                            )}
                                            {stop.customer.address && (
                                                <a
                                                    href={`https://www.google.com/maps/search/${encodeURIComponent(stop.customer.address)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-lg text-xs font-medium"
                                                >
                                                    <Navigation className="h-3 w-3" />
                                                    Itinéraire
                                                </a>
                                            )}
                                            {isPending && tour && (
                                                <button
                                                    onClick={() => markStopVisited(tour.id, stop.id)}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold ml-auto"
                                                >
                                                    <CheckCircle className="h-3 w-3" />
                                                    Arrivé
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Payment badge */}
                                    {stop.paymentAmount > 0 && (
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold text-green-600">
                                                {stop.paymentAmount.toLocaleString()} DA
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {stop.paymentMethod || "CASH"}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
            </div>

            {/* Bottom safe area padding for mobile */}
            <div className="h-8" />
        </div>
    )
}
