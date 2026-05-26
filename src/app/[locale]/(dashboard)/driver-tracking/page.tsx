"use client"

import { useState, useEffect, useCallback, lazy, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "react-hot-toast"
import {
    MapPin, Navigation, Truck, Clock, Phone, RefreshCw,
    TrendingUp, Users, Activity, ChevronRight, Eye, Map
} from "lucide-react"
import { cn } from "@/lib/utils"

// Lazy-load the map to avoid SSR issues
const LeafletMap = lazy(() =>
    import("@/components/maps/leaflet-map").then(mod => ({ default: mod.LeafletMap }))
)

interface DriverData {
    driver: { id: string; name: string; phone: string; role: string }
    location: {
        latitude: number; longitude: number
        speed: number | null; heading: number | null
        source: string; timestamp: string; isRecent: boolean
    } | null
    tour: {
        id: string; name: string; status: string
        totalStops: number; visitedStops: number; progress: number
        totalCollected: number; totalReturns: number
    } | null
    salesCount: number
}

export default function DriverTrackingPage() {
    const [drivers, setDrivers] = useState<DriverData[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDriver, setSelectedDriver] = useState<string | null>(null)
    const [driverRoute, setDriverRoute] = useState<any>(null)
    const [autoRefresh, setAutoRefresh] = useState(true)
    const [showMap, setShowMap] = useState(true)

    const fetchDrivers = useCallback(async () => {
        try {
            const res = await fetch("/api/mobile/admin/drivers", {
                headers: { "Authorization": `Bearer ${localStorage.getItem("admin_mobile_token") || ""}` }
            })
            if (!res.ok) throw new Error("Failed to fetch drivers")
            const data = await res.json()
            setDrivers(data.drivers)
        } catch (e: any) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchDrivers() }, [fetchDrivers])

    // Auto-refresh every 30 seconds
    useEffect(() => {
        if (!autoRefresh) return
        const interval = setInterval(fetchDrivers, 30000)
        return () => clearInterval(interval)
    }, [autoRefresh, fetchDrivers])

    const fetchDriverRoute = async (driverId: string) => {
        try {
            const res = await fetch(`/api/mobile/admin/drivers/${driverId}/route`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("admin_mobile_token") || ""}` }
            })
            if (!res.ok) throw new Error("Failed")
            const data = await res.json()
            setDriverRoute(data)
            setSelectedDriver(driverId)
        } catch (e: any) {
            toast.error("Erreur: " + e.message)
        }
    }

    const activeDrivers = drivers.filter(d => d.location?.isRecent)
    const totalSales = drivers.reduce((s, d) => s + d.salesCount, 0)
    const totalCollected = drivers.reduce((s, d) => s + (d.tour?.totalCollected || 0), 0)

    const getStatusColor = (driver: DriverData) => {
        if (driver.location?.isRecent) return "bg-green-500"
        if (driver.location) return "bg-yellow-500"
        return "bg-gray-500"
    }

    const getMarkerColor = (driver: DriverData): "green" | "yellow" | "gray" => {
        if (driver.location?.isRecent) return "green"
        if (driver.location) return "yellow"
        return "gray"
    }

    const getStatusLabel = (driver: DriverData) => {
        if (driver.location?.isRecent) return "En ligne"
        if (driver.location) return "Dernière position"
        return "Hors ligne"
    }

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMin = Math.round((now.getTime() - date.getTime()) / 60000)
        if (diffMin < 1) return "à l'instant"
        if (diffMin < 60) return `il y a ${diffMin}min`
        return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    }

    // Build map markers from driver data
    const mapMarkers = drivers
        .filter(d => d.location)
        .map(d => ({
            id: d.driver.id,
            lat: d.location!.latitude,
            lng: d.location!.longitude,
            label: d.driver.name,
            color: getMarkerColor(d),
            speed: d.location!.speed,
            popup: `${getStatusLabel(d)} — ${d.tour ? `${d.tour.visitedStops}/${d.tour.totalStops} clients` : "Pas de tournée"}`
        }))

    // Build route points if a specific driver is selected
    const routePoints = driverRoute?.locations?.map((l: any) => ({
        lat: l.latitude,
        lng: l.longitude,
    })) || []

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Truck className="h-7 w-7 text-blue-500" />
                        Suivi des Livreurs
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Tracking GPS temps réel de vos livreurs en tournée
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMap(!showMap)}
                        className={cn(showMap && "border-blue-500 text-blue-600")}
                    >
                        <Map className="h-4 w-4 mr-1" />
                        {showMap ? "Masquer carte" : "Afficher carte"}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={cn(autoRefresh && "border-green-500 text-green-600")}
                    >
                        <Activity className={cn("h-4 w-4 mr-1", autoRefresh && "animate-pulse")} />
                        {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetchDrivers() }}>
                        <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
                        Actualiser
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2.5">
                            <Users className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{activeDrivers.length}<span className="text-muted-foreground text-sm font-normal">/{drivers.length}</span></p>
                            <p className="text-xs text-muted-foreground">Livreurs actifs</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2.5">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{totalSales}</p>
                            <p className="text-xs text-muted-foreground">BLs créés aujourd&apos;hui</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/30 p-2.5">
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{totalCollected.toLocaleString("fr-FR")}</p>
                            <p className="text-xs text-muted-foreground">Encaissé (DA)</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-2.5">
                            <MapPin className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">
                                {drivers.reduce((s, d) => s + (d.tour?.visitedStops || 0), 0)}
                                <span className="text-muted-foreground text-sm font-normal">
                                    /{drivers.reduce((s, d) => s + (d.tour?.totalStops || 0), 0)}
                                </span>
                            </p>
                            <p className="text-xs text-muted-foreground">Clients visités</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* EMBEDDED MAP */}
            {showMap && (
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="p-4 border-b flex items-center justify-between">
                        <h2 className="font-semibold flex items-center gap-2">
                            <Map className="h-5 w-5 text-blue-500" />
                            Carte en temps réel
                            {mapMarkers.length > 0 && (
                                <span className="text-xs text-muted-foreground font-normal">
                                    — {mapMarkers.length} livreur(s) localisé(s)
                                </span>
                            )}
                        </h2>
                    </div>
                    <Suspense fallback={
                        <div className="flex items-center justify-center h-[400px] bg-muted/30">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                Chargement de la carte...
                            </div>
                        </div>
                    }>
                        <LeafletMap
                            markers={mapMarkers}
                            routePoints={routePoints.length > 1 ? routePoints : undefined}
                            height="420px"
                        />
                    </Suspense>
                </div>
            )}

            {/* Drivers List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {drivers.map((d) => (
                    <div
                        key={d.driver.id}
                        className={cn(
                            "rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md cursor-pointer",
                            selectedDriver === d.driver.id && "ring-2 ring-blue-500"
                        )}
                        onClick={() => fetchDriverRoute(d.driver.id)}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                                        <span className="text-lg font-bold text-muted-foreground">
                                            {d.driver.name.charAt(0)}
                                        </span>
                                    </div>
                                    <div className={cn(
                                        "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card",
                                        getStatusColor(d)
                                    )} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">{d.driver.name}</h3>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className={cn(
                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                                            d.location?.isRecent
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                : d.location
                                                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                        )}>
                                            {getStatusLabel(d)}
                                        </span>
                                        {d.location && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatTime(d.location.timestamp)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {d.driver.phone && (
                                    <a href={`tel:${d.driver.phone}`} className="p-2 hover:bg-muted rounded-lg">
                                        <Phone className="h-4 w-4 text-blue-500" />
                                    </a>
                                )}
                                {d.location && (
                                    <a
                                        href={`https://www.google.com/maps?q=${d.location.latitude},${d.location.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 hover:bg-muted rounded-lg"
                                    >
                                        <Navigation className="h-4 w-4 text-emerald-500" />
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Tour progress */}
                        {d.tour ? (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{d.tour.name}</span>
                                    <span className="font-semibold">{d.tour.progress}%</span>
                                </div>
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                                        style={{ width: `${d.tour.progress}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{d.tour.visitedStops}/{d.tour.totalStops} clients</span>
                                    <span>{d.tour.totalCollected.toLocaleString("fr-FR")} DA encaissé</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground italic">
                                Aucune tournée active
                            </div>
                        )}

                        {/* GPS info */}
                        {d.location && (
                            <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {d.location.latitude.toFixed(4)}, {d.location.longitude.toFixed(4)}
                                </span>
                                {d.location.speed != null && (
                                    <span className="flex items-center gap-1">
                                        🏎️ {Math.round(d.location.speed)} km/h
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    📡 {d.location.source === "PHONE" ? "GPS Téléphone" : "Tracker Camion"}
                                </span>
                            </div>
                        )}
                    </div>
                ))}

                {drivers.length === 0 && !loading && (
                    <div className="col-span-2 text-center py-16 text-muted-foreground">
                        <Truck className="h-12 w-12 mx-auto mb-3 opacity-40" />
                        <p className="text-lg font-medium">Aucun livreur trouvé</p>
                        <p className="text-sm">Les livreurs apparaîtront ici dès qu&apos;ils se connectent à l&apos;app mobile</p>
                    </div>
                )}
            </div>

            {/* Route detail panel */}
            {selectedDriver && driverRoute && (
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Eye className="h-5 w-5 text-blue-500" />
                            Parcours de {driverRoute.driver?.name}
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                                {driverRoute.date}
                            </span>
                        </h2>
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedDriver(null); setDriverRoute(null) }}>
                            Fermer
                        </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="rounded-lg bg-muted p-3 text-center">
                            <p className="text-2xl font-bold">{driverRoute.totalPoints}</p>
                            <p className="text-xs text-muted-foreground">Points GPS</p>
                        </div>
                        <div className="rounded-lg bg-muted p-3 text-center">
                            <p className="text-2xl font-bold">{driverRoute.totalKm} km</p>
                            <p className="text-xs text-muted-foreground">Distance totale</p>
                        </div>
                        <div className="rounded-lg bg-muted p-3 text-center">
                            <p className="text-2xl font-bold">
                                {driverRoute.locations.length > 0
                                    ? new Date(driverRoute.locations[0].createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                                    : "-"
                                }
                            </p>
                            <p className="text-xs text-muted-foreground">Début</p>
                        </div>
                    </div>

                    {/* Mini map link */}
                    {driverRoute.locations.length > 0 && (
                        <a
                            href={`https://www.google.com/maps/dir/${driverRoute.locations.map((l: any) => `${l.latitude},${l.longitude}`).slice(0, 20).join("/")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            <Navigation className="h-4 w-4" />
                            Voir le parcours sur Google Maps
                            <ChevronRight className="h-4 w-4" />
                        </a>
                    )}
                </div>
            )}
        </div>
    )
}
