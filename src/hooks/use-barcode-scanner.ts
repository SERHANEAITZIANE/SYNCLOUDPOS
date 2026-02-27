import { useEffect, useState } from "react"

export const useBarcodeScanner = (onScan: (code: string) => void) => {
    const [buffer, setBuffer] = useState("")

    useEffect(() => {
        let timeout: NodeJS.Timeout

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if focus is on an input field (to allow manual searching/typing)
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
                return
            }

            if (e.key === 'Enter') {
                if (buffer.length > 0) {
                    onScan(buffer)
                    setBuffer("")
                }
                return
            }

            // Provide a small timeout to clear buffer if keys aren't coming in fast (like human typing vs scanner)
            // Scanners are usually very fast (<50ms between keys)
            clearTimeout(timeout)
            timeout = setTimeout(() => setBuffer(""), 100)

            if (e.key.length === 1) {
                setBuffer((prev) => prev + e.key)
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => {
            window.removeEventListener("keydown", handleKeyDown)
            clearTimeout(timeout)
        }
    }, [buffer, onScan])

    return buffer
}
