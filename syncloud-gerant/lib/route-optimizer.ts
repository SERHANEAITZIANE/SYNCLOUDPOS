/**
 * Calculate distance between two GPS points (Haversine formula)
 */
export function calculateDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

interface Stop {
    id: string;
    latitude?: number | null;
    longitude?: number | null;
    customer: { name: string; address?: string };
}

/**
 * Nearest-Neighbor TSP heuristic for route optimization.
 * Given a starting position and a list of stops with GPS coordinates,
 * returns the stops sorted in the optimal visiting order.
 */
export function optimizeRoute(
    startLat: number,
    startLon: number,
    stops: Stop[]
): Stop[] {
    // Filter stops with valid GPS coordinates
    const withCoords = stops.filter(s => s.latitude != null && s.longitude != null);
    const withoutCoords = stops.filter(s => s.latitude == null || s.longitude == null);

    if (withCoords.length <= 1) {
        return [...withCoords, ...withoutCoords];
    }

    // Nearest-neighbor algorithm
    const visited = new Set<string>();
    const result: Stop[] = [];
    let currentLat = startLat;
    let currentLon = startLon;

    while (visited.size < withCoords.length) {
        let nearestStop: Stop | null = null;
        let nearestDist = Infinity;

        for (const stop of withCoords) {
            if (visited.has(stop.id)) continue;

            const dist = calculateDistance(
                currentLat, currentLon,
                stop.latitude!, stop.longitude!
            );

            if (dist < nearestDist) {
                nearestDist = dist;
                nearestStop = stop;
            }
        }

        if (nearestStop) {
            visited.add(nearestStop.id);
            result.push(nearestStop);
            currentLat = nearestStop.latitude!;
            currentLon = nearestStop.longitude!;
        }
    }

    // Append stops without coordinates at the end
    return [...result, ...withoutCoords];
}

/**
 * Calculate total route distance in km
 */
export function calculateTotalDistance(
    startLat: number,
    startLon: number,
    stops: Stop[]
): number {
    let total = 0;
    let prevLat = startLat;
    let prevLon = startLon;

    for (const stop of stops) {
        if (stop.latitude != null && stop.longitude != null) {
            total += calculateDistance(prevLat, prevLon, stop.latitude, stop.longitude);
            prevLat = stop.latitude;
            prevLon = stop.longitude;
        }
    }

    return Math.round(total * 10) / 10;
}

/**
 * Estimate travel time based on average speed.
 * Returns estimated minutes.
 */
export function estimateTravelTime(
    distanceKm: number,
    avgSpeedKmh: number = 30 // city average
): number {
    return Math.round((distanceKm / avgSpeedKmh) * 60);
}

/**
 * Get navigation URL based on user preference
 */
export function getNavigationUrl(
    lat: number,
    lon: number,
    provider: "google" | "waze" | "osm" = "google"
): string {
    switch (provider) {
        case "waze":
            return `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
        case "osm":
            return `https://www.openstreetmap.org/directions?from=&to=${lat},${lon}`;
        case "google":
        default:
            return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
    }
}
