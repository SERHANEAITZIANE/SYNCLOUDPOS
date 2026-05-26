"use client"

import { useEffect, useRef, useState } from "react"
import "leaflet/dist/leaflet.css"
import * as L from "leaflet"

interface MarkerData {
    id: string
    lat: number
    lng: number
    label: string
    color?: "green" | "yellow" | "red" | "blue" | "gray"
    popup?: string
    speed?: number | null
}

interface LeafletMapProps {
    markers: MarkerData[]
    routePoints?: { lat: number; lng: number }[]
    center?: { lat: number; lng: number }
    zoom?: number
    height?: string
    className?: string
}

const COLOR_MAP: Record<string, string> = {
    green: "#22c55e",
    yellow: "#eab308",
    red: "#ef4444",
    blue: "#3b82f6",
    gray: "#6b7280",
}

export function LeafletMap({
    markers,
    routePoints,
    center,
    zoom = 6,
    height = "400px",
    className = "",
}: LeafletMapProps) {
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstanceRef = useRef<L.Map | null>(null)

    // Initialize / update map
    useEffect(() => {
        if (typeof window === "undefined" || !mapRef.current) return

        // Destroy previous instance
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove()
            mapInstanceRef.current = null
        }

        // Default center: Algeria (Algiers)
        const defaultCenter = center || { lat: 36.7538, lng: 3.0588 }
        const map = L.map(mapRef.current).setView([defaultCenter.lat, defaultCenter.lng], zoom)
        mapInstanceRef.current = map

        // OpenStreetMap tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
            maxZoom: 19,
        }).addTo(map)

        // Add markers
        const bounds: L.LatLngTuple[] = []
        markers.forEach((m) => {
            const color = COLOR_MAP[m.color || "blue"]
            const icon = L.divIcon({
                className: "custom-div-icon",
                html: `<div style="
                    background:${color};
                    width:32px;height:32px;
                    border-radius:50%;
                    border:3px solid white;
                    box-shadow:0 2px 8px rgba(0,0,0,0.3);
                    display:flex;align-items:center;justify-content:center;
                    color:white;font-weight:800;font-size:12px;
                    font-family:system-ui;
                ">${m.label.charAt(0).toUpperCase()}</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
            })

            const marker = L.marker([m.lat, m.lng], { icon }).addTo(map)
            if (m.popup) {
                marker.bindPopup(`<div style="min-width:150px">
                    <strong>${m.label}</strong><br/>
                    ${m.speed != null ? `🏎️ ${Math.round(m.speed)} km/h<br/>` : ""}
                    📍 ${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}
                    ${m.popup ? `<br/>${m.popup}` : ""}
                </div>`)
            }
            bounds.push([m.lat, m.lng])
        })

        // Draw route polyline
        if (routePoints && routePoints.length > 1) {
            const latlngs: L.LatLngTuple[] = routePoints.map((p) => [p.lat, p.lng])
            L.polyline(latlngs, {
                color: "#3b82f6",
                weight: 3,
                opacity: 0.7,
                dashArray: "8, 4",
            }).addTo(map)
            latlngs.forEach((ll) => bounds.push(ll))
        }

        // Fit to bounds if we have markers
        if (bounds.length > 0) {
            if (bounds.length === 1) {
                map.setView(bounds[0], 14)
            } else {
                map.fitBounds(bounds, { padding: [40, 40] })
            }
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove()
                mapInstanceRef.current = null
            }
        }
    }, [markers, routePoints, center, zoom])

    return (
        <div
            ref={mapRef}
            className={`rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 ${className}`}
            style={{ height, width: "100%" }}
        />
    )
}
