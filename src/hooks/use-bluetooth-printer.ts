"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
    isBluetoothSupported,
    isMobileDevice,
    isConnected as btIsConnected,
    connectPrinter,
    disconnectPrinter,
    sendData,
    printTestPage,
    getStoredDeviceName,
    getStoredPaperWidth,
    setPaperWidth as btSetPaperWidth,
} from "@/lib/bluetooth-printer"
import {
    encodeReceipt,
    encodeBonLivraison,
    encodeBonGarantie,
    type ReceiptData,
    type BLData,
    type WarrantyData,
} from "@/lib/receipt-encoder"

export interface UseBluetoothPrinterReturn {
    /** Whether Web Bluetooth is available */
    isSupported: boolean
    /** Whether user is on a mobile device */
    isMobile: boolean
    /** Whether a printer is currently connected */
    isConnected: boolean
    /** Name of the paired device */
    deviceName: string | null
    /** Connection in progress */
    connecting: boolean
    /** Printing in progress */
    printing: boolean
    /** Last error message */
    error: string | null
    /** Paper width setting */
    paperWidth: "58mm" | "80mm"
    /** Connect to a BLE printer (must be user-initiated) */
    connect: () => Promise<boolean>
    /** Disconnect from the printer */
    disconnect: () => void
    /** Print a receipt via Bluetooth */
    printReceipt: (data: ReceiptData) => Promise<boolean>
    /** Print a Bon de Livraison via Bluetooth */
    printBL: (data: BLData) => Promise<boolean>
    /** Print a Bon de Garantie via Bluetooth */
    printWarranty: (data: WarrantyData) => Promise<boolean>
    /** Print a test page */
    printTest: () => Promise<boolean>
    /** Set paper width */
    setPaperWidth: (width: "58mm" | "80mm") => void
    /** Clear any error */
    clearError: () => void
}

/**
 * React hook for managing Bluetooth thermal printer connections and printing.
 */
export function useBluetoothPrinter(): UseBluetoothPrinterReturn {
    const [supported] = useState(() => isBluetoothSupported())
    const [mobile] = useState(() => isMobileDevice())
    const [connected, setConnected] = useState(false)
    const [deviceName, setDeviceName] = useState<string | null>(null)
    const [connecting, setConnecting] = useState(false)
    const [printing, setPrinting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [paperWidth, setPaperWidthState] = useState<"58mm" | "80mm">("80mm")

    // Poll connection status periodically
    const pollRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        // Initialize from stored values
        setDeviceName(getStoredDeviceName())
        setPaperWidthState(getStoredPaperWidth())
        setConnected(btIsConnected())

        // Poll connection status every 2s
        pollRef.current = setInterval(() => {
            const nowConnected = btIsConnected()
            setConnected(prev => {
                if (prev !== nowConnected) return nowConnected
                return prev
            })
        }, 2000)

        return () => {
            if (pollRef.current) clearInterval(pollRef.current)
        }
    }, [])

    const connect = useCallback(async (): Promise<boolean> => {
        setConnecting(true)
        setError(null)
        try {
            const result = await connectPrinter()
            setDeviceName(result.deviceName)
            setConnected(true)
            return true
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Erreur de connexion"
            // Don't show error for user-cancelled dialog
            if (!message.includes("cancelled") && !message.includes("canceled")) {
                setError(message)
            }
            return false
        } finally {
            setConnecting(false)
        }
    }, [])

    const disconnect = useCallback(() => {
        disconnectPrinter()
        setConnected(false)
        setDeviceName(null)
        setError(null)
    }, [])

    const printReceipt = useCallback(async (data: ReceiptData): Promise<boolean> => {
        setPrinting(true)
        setError(null)
        try {
            const bytes = encodeReceipt({ ...data, paperWidth })
            await sendData(bytes)
            return true
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Erreur d'impression"
            setError(message)
            return false
        } finally {
            setPrinting(false)
        }
    }, [paperWidth])

    const printBL = useCallback(async (data: BLData): Promise<boolean> => {
        setPrinting(true)
        setError(null)
        try {
            const bytes = encodeBonLivraison({ ...data, paperWidth })
            await sendData(bytes)
            return true
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Erreur d'impression"
            setError(message)
            return false
        } finally {
            setPrinting(false)
        }
    }, [paperWidth])

    const printWarranty = useCallback(async (data: WarrantyData): Promise<boolean> => {
        setPrinting(true)
        setError(null)
        try {
            const bytes = encodeBonGarantie({ ...data, paperWidth })
            await sendData(bytes)
            return true
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Erreur d'impression"
            setError(message)
            return false
        } finally {
            setPrinting(false)
        }
    }, [paperWidth])

    const printTest = useCallback(async (): Promise<boolean> => {
        setPrinting(true)
        setError(null)
        try {
            await printTestPage()
            return true
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Erreur d'impression"
            setError(message)
            return false
        } finally {
            setPrinting(false)
        }
    }, [])

    const setPaperWidth = useCallback((width: "58mm" | "80mm") => {
        setPaperWidthState(width)
        btSetPaperWidth(width)
    }, [])

    const clearError = useCallback(() => setError(null), [])

    return {
        isSupported: supported,
        isMobile: mobile,
        isConnected: connected,
        deviceName,
        connecting,
        printing,
        error,
        paperWidth,
        connect,
        disconnect,
        printReceipt,
        printBL,
        printWarranty,
        printTest,
        setPaperWidth,
        clearError,
    }
}
