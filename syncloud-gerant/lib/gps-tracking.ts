import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "./api";

let locationSubscription: Location.LocationSubscription | null = null;
let trackingInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start GPS tracking in background.
 * Sends location updates every 30 seconds to the server.
 */
export async function startGPSTracking(tourId?: string): Promise<boolean> {
    try {
        // Request permissions
        const { status: foreground } = await Location.requestForegroundPermissionsAsync();
        if (foreground !== "granted") {
            console.warn("[GPS] Foreground permission denied");
            return false;
        }

        const { status: background } = await Location.requestBackgroundPermissionsAsync();
        if (background !== "granted") {
            console.warn("[GPS] Background permission denied, using foreground only");
        }

        // Get GPS source from settings
        const gpsSource = (await AsyncStorage.getItem("setting_gpsSource")) || "PHONE";

        // Start watching position
        locationSubscription = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.High,
                timeInterval: 30000,     // 30 seconds
                distanceInterval: 50,    // or every 50 meters
            },
            async (location) => {
                try {
                    await apiFetch("/location", {
                        method: "POST",
                        body: JSON.stringify({
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            speed: location.coords.speed ? location.coords.speed * 3.6 : null, // m/s to km/h
                            heading: location.coords.heading,
                            accuracy: location.coords.accuracy,
                            source: gpsSource,
                            tourId,
                        }),
                    });
                } catch (error) {
                    // Queue for later sync if offline
                    const queue = JSON.parse((await AsyncStorage.getItem("location_queue")) || "[]");
                    queue.push({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        speed: location.coords.speed ? location.coords.speed * 3.6 : null,
                        heading: location.coords.heading,
                        accuracy: location.coords.accuracy,
                        source: gpsSource,
                        tourId,
                        timestamp: new Date().toISOString(),
                    });
                    // Keep max 500 queued locations
                    if (queue.length > 500) queue.splice(0, queue.length - 500);
                    await AsyncStorage.setItem("location_queue", JSON.stringify(queue));
                }
            }
        );

        return true;
    } catch (error) {
        console.error("[GPS] Error starting tracking:", error);
        return false;
    }
}

/**
 * Stop GPS tracking
 */
export async function stopGPSTracking() {
    if (locationSubscription) {
        locationSubscription.remove();
        locationSubscription = null;
    }
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
    }
}

/**
 * Get current position once
 */
export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return null;

        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
        });

        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        };
    } catch {
        return null;
    }
}

/**
 * Flush queued locations to server (when coming back online)
 */
export async function flushLocationQueue() {
    try {
        const queue = JSON.parse((await AsyncStorage.getItem("location_queue")) || "[]");
        if (queue.length === 0) return;

        // Send in batches of 20
        for (let i = 0; i < queue.length; i += 20) {
            const batch = queue.slice(i, i + 20);
            for (const loc of batch) {
                try {
                    await apiFetch("/location", {
                        method: "POST",
                        body: JSON.stringify(loc),
                    });
                } catch { break; }
            }
        }

        await AsyncStorage.removeItem("location_queue");
    } catch { /* silent */ }
}

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
