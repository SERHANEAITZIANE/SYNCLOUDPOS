"use client"

import * as React from "react"
import { usePathname } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Languages } from "lucide-react"

export function LanguageSwitcher() {
    const pathname = usePathname()

    const onSelectChange = (nextLocale: "en" | "fr" | "ar") => {
        // Construct the new path manually to ensure a full reload/redirect
        // This is more reliable for language switching than client-side routing in some cases
        let newPath = `/${nextLocale}${pathname}`

        // Handle root path specifically if needed, but usually pathname is '/'
        if (pathname === '/') {
            newPath = `/${nextLocale}`
        }

        // Force a hard navigation to ensure all server components rehydrate with new locale
        window.location.href = newPath
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Languages className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
                    <span className="sr-only">Toggle language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onSelectChange("en")}>
                    English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSelectChange("fr")}>
                    Français
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSelectChange("ar")}>
                    العربية
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
