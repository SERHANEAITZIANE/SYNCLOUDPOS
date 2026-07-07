/**
 * Web Bluetooth API wrapper for BLE thermal printers.
 * Manages connection lifecycle, device caching, and data transmission.
 */

// ─── Common BLE Printer Service & Characteristic UUIDs ──────────────
const PRINTER_SERVICE_UUIDS = [
    "000018f0-0000-1000-8000-00805f9b34fb", // Generic printer service
    "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // Common Chinese BLE printers
    "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC (many thermal printers)
]

const PRINTER_CHAR_UUIDS = [
    "00002af1-0000-1000-8000-00805f9b34fb", // Generic write
    "bef8d6c9-9c21-4c9e-b632-bd58c1009f9f", // Common Chinese BLE printers
    "49535343-8841-43f4-a8d4-ecbe34729bb3", // ISSC write
]

// ─── Constants ───────────────────────────────────────────────────────
const CHUNK_SIZE = 512       // BLE MTU safe chunk size
const CHUNK_DELAY_MS = 20    // Delay between chunks to avoid buffer overflow
const STORAGE_KEY_DEVICE = "bt_printer_device_name"
const STORAGE_KEY_PAPER = "bt_printer_paper_width"

// ─── Module State ────────────────────────────────────────────────────
let cachedDevice: BluetoothDevice | null = null
let cachedServer: BluetoothRemoteGATTServer | null = null
let cachedCharacteristic: BluetoothRemoteGATTCharacteristic | null = null
let connectionListenerAttached = false

// ─── Types ───────────────────────────────────────────────────────────
export interface BluetoothPrinterState {
    isSupported: boolean
    isConnected: boolean
    deviceName: string | null
    paperWidth: "58mm" | "80mm"
}

// ─── Detection Helpers ───────────────────────────────────────────────

/** Check if the Web Bluetooth API is available in this browser */
export function isBluetoothSupported(): boolean {
    return typeof navigator !== "undefined" && "bluetooth" in navigator
}

/** Detect if the user is on a mobile device */
export function isMobileDevice(): boolean {
    if (typeof navigator === "undefined") return false
    const ua = navigator.userAgent || ""
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
        || (typeof navigator !== "undefined" && "maxTouchPoints" in navigator && navigator.maxTouchPoints > 1)
}

// ─── Connection Management ───────────────────────────────────────────

/** Get the currently connected device (if any) */
export function getConnectedDevice(): BluetoothDevice | null {
    if (cachedDevice && cachedServer?.connected) {
        return cachedDevice
    }
    return null
}

/** Get the stored device name from localStorage */
export function getStoredDeviceName(): string | null {
    if (typeof localStorage === "undefined") return null
    return localStorage.getItem(STORAGE_KEY_DEVICE)
}

/** Get the stored paper width from localStorage */
export function getStoredPaperWidth(): "58mm" | "80mm" {
    if (typeof localStorage === "undefined") return "80mm"
    const stored = localStorage.getItem(STORAGE_KEY_PAPER)
    return stored === "58mm" ? "58mm" : "80mm"
}

/** Set the paper width */
export function setPaperWidth(width: "58mm" | "80mm") {
    if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY_PAPER, width)
    }
}

/**
 * Request and connect to a BLE thermal printer.
 * Must be called from a user gesture (button click).
 */
export async function connectPrinter(): Promise<{ device: BluetoothDevice; deviceName: string }> {
    if (!isBluetoothSupported()) {
        throw new Error("Web Bluetooth n'est pas supporté par ce navigateur")
    }

    // Request device with common printer service UUIDs
    const device = await navigator.bluetooth.requestDevice({
        filters: PRINTER_SERVICE_UUIDS.map(uuid => ({ services: [uuid] })),
        optionalServices: PRINTER_SERVICE_UUIDS,
    }).catch(() => {
        // If specific filters fail, try accepting any device
        return navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: PRINTER_SERVICE_UUIDS,
        })
    })

    if (!device) {
        throw new Error("Aucune imprimante sélectionnée")
    }

    // Connect to GATT server
    const server = await device.gatt!.connect()

    // Find a writable characteristic
    let writeChar: BluetoothRemoteGATTCharacteristic | null = null

    for (const serviceUuid of PRINTER_SERVICE_UUIDS) {
        try {
            const service = await server.getPrimaryService(serviceUuid)
            for (const charUuid of PRINTER_CHAR_UUIDS) {
                try {
                    const char = await service.getCharacteristic(charUuid)
                    if (char.properties.write || char.properties.writeWithoutResponse) {
                        writeChar = char
                        break
                    }
                } catch {
                    // This characteristic doesn't exist on this service, try next
                }
            }
            if (writeChar) break

            // If known UUIDs didn't work, try all characteristics on this service
            if (!writeChar) {
                try {
                    const chars = await service.getCharacteristics()
                    for (const char of chars) {
                        if (char.properties.write || char.properties.writeWithoutResponse) {
                            writeChar = char
                            break
                        }
                    }
                } catch {
                    // Service enumeration failed
                }
            }
            if (writeChar) break
        } catch {
            // This service doesn't exist on this device, try next
        }
    }

    if (!writeChar) {
        server.disconnect()
        throw new Error("Impossible de trouver la caractéristique d'écriture de l'imprimante. Vérifiez que l'imprimante est compatible BLE.")
    }

    // Cache the connection
    cachedDevice = device
    cachedServer = server
    cachedCharacteristic = writeChar

    // Store device name for UI persistence
    const deviceName = device.name || "Imprimante BT"
    if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY_DEVICE, deviceName)
    }

    // Listen for disconnection
    if (!connectionListenerAttached) {
        device.addEventListener("gattserverdisconnected", () => {
            console.log("[BT] Printer disconnected")
            cachedServer = null
            cachedCharacteristic = null
        })
        connectionListenerAttached = true
    }

    return { device, deviceName }
}

/**
 * Disconnect from the current printer.
 */
export function disconnectPrinter() {
    if (cachedServer?.connected) {
        cachedServer.disconnect()
    }
    cachedDevice = null
    cachedServer = null
    cachedCharacteristic = null
    connectionListenerAttached = false
    if (typeof localStorage !== "undefined") {
        localStorage.removeItem(STORAGE_KEY_DEVICE)
    }
}

/**
 * Check if currently connected to a printer.
 */
export function isConnected(): boolean {
    return !!(cachedServer?.connected && cachedCharacteristic)
}

/**
 * Send raw bytes to the connected printer, chunked for BLE MTU limits.
 */
export async function sendData(data: Uint8Array): Promise<void> {
    if (!cachedCharacteristic || !cachedServer?.connected) {
        throw new Error("Imprimante non connectée")
    }

    const useWriteWithoutResponse = cachedCharacteristic.properties.writeWithoutResponse

    for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
        const chunk = data.slice(offset, offset + CHUNK_SIZE)

        if (useWriteWithoutResponse) {
            await cachedCharacteristic.writeValueWithoutResponse(chunk)
        } else {
            await cachedCharacteristic.writeValueWithResponse(chunk)
        }

        // Small delay between chunks to prevent buffer overflow
        if (offset + CHUNK_SIZE < data.length) {
            await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY_MS))
        }
    }
}

/**
 * Print a test page to verify connection.
 */
export async function printTestPage(): Promise<void> {
    const encoder = new TextEncoder()
    const commands = new Uint8Array([
        // ESC @ — Initialize printer
        0x1B, 0x40,
        // ESC a 1 — Center alignment
        0x1B, 0x61, 0x01,
        // ESC E 1 — Bold on
        0x1B, 0x45, 0x01,
        // GS ! 0x11 — Double width + double height
        0x1D, 0x21, 0x11,
        ...encoder.encode("SYNCLOUDPOS"),
        0x0A,
        // GS ! 0x00 — Normal size
        0x1D, 0x21, 0x00,
        // ESC E 0 — Bold off
        0x1B, 0x45, 0x00,
        0x0A,
        ...encoder.encode("--- Test Impression ---"),
        0x0A,
        ...encoder.encode("Bluetooth OK!"),
        0x0A,
        ...encoder.encode(new Date().toLocaleString("fr-FR")),
        0x0A, 0x0A, 0x0A,
        // GS V 66 3 — Partial cut
        0x1D, 0x56, 0x42, 0x03,
    ])

    await sendData(commands)
}

/**
 * Get the current state summary for the React hook.
 */
export function getState(): BluetoothPrinterState {
    return {
        isSupported: isBluetoothSupported(),
        isConnected: isConnected(),
        deviceName: getConnectedDevice()?.name || getStoredDeviceName(),
        paperWidth: getStoredPaperWidth(),
    }
}
