"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

function ThemeSyncHelper() {
    React.useEffect(() => {
        if (typeof window === "undefined") return

        const syncDarkClass = () => {
            const list = document.documentElement.classList
            const storedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null
            
            const darkThemes = ["dark", "ghardaia-dark", "riviera-dark", "atlas-dark", "horizon-dark"]
            const lightThemes = ["light", "ghardaia", "riviera", "atlas", "horizon"]
            
            const isDarkActive = darkThemes.some(t => list.contains(t) || storedTheme === t)

            if (isDarkActive) {
                if (!list.contains("dark")) list.add("dark")
            } else {
                const isLightActive = lightThemes.some(t => list.contains(t) || storedTheme === t)
                if (isLightActive) {
                    if (list.contains("dark")) list.remove("dark")
                }
            }
        }

        const observer = new MutationObserver(() => {
            setTimeout(() => {
                try {
                    observer.disconnect()
                    syncDarkClass()
                } finally {
                    observer.observe(document.documentElement, {
                        attributes: true,
                        attributeFilter: ["class"]
                    })
                }
            }, 0)
        })

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"]
        })

        // Initial sync
        syncDarkClass()

        return () => {
            observer.disconnect()
        }
    }, [])

    return null
}

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    return (
        <NextThemesProvider {...props}>
            <ThemeSyncHelper />
            {children}
        </NextThemesProvider>
    )
}
