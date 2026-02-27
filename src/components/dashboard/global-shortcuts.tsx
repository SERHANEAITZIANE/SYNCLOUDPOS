"use client"

import { useEffect } from "react"
import { useRouter } from "@/i18n/routing"
import { usePathname } from "next/navigation"

export const GlobalShortcuts = () => {
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName
            const isInput = activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT"

            // Escape: blur inputs
            if (e.key === "Escape") {
                if (isInput) {
                    (document.activeElement as HTMLElement).blur()
                }
                return
            }

            // F2 or Ctrl+F: Focus Search
            if (e.key === "F2" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f")) {
                e.preventDefault()
                const searchInput = document.getElementById("global-search-input")
                if (searchInput) {
                    searchInput.focus()
                }
            }

            // F3 or Alt+N: Add New / Add Row
            if (e.key === "F3" || (e.altKey && e.key.toLowerCase() === "n")) {
                // If typing, Alt+N might be a special character on some keyboards, so be careful.
                if (isInput && e.key !== "F3") return

                e.preventDefault()

                // Try to find an explicit "Add New" button
                const addNewBtn = document.getElementById("global-add-new")
                if (addNewBtn) {
                    addNewBtn.click()
                } else {
                    // Fallback to route navigation if it's a list page
                    const parts = pathname.split('/')
                    const lastPart = parts[parts.length - 1]
                    // If we're on a list page (e.g. /fr/products) and not editing/creating
                    if (lastPart !== "new" && lastPart !== "edit" && parts.length <= 3) {
                        router.push(`${pathname}/new` as any)
                    }
                }
            }

            // F4: Go to POS
            if (e.key === "F4") {
                e.preventDefault()
                router.push("/pos")
            }

            // F8 or Ctrl+S: Save Form
            if (e.key === "F8" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s")) {
                e.preventDefault()

                // Find primary submit button in a form
                const submitBtn = document.querySelector('form button[type="submit"]') as HTMLButtonElement
                if (submitBtn && !submitBtn.disabled) {
                    submitBtn.click()
                } else {
                    const explicitSave = document.getElementById("global-save-button") as HTMLButtonElement
                    if (explicitSave && !explicitSave.disabled) {
                        explicitSave.click()
                    }
                }
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [pathname, router])

    return null
}
