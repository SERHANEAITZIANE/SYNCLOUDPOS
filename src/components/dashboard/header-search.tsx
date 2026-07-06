"use client"

import React, { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useRouter } from "@/i18n/routing"

export function HeaderSearch() {
    const router = useRouter()
    const [query, setQuery] = useState("")

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (query.trim()) {
            router.push(`/products?name=${encodeURIComponent(query.trim())}`)
        }
    }

    return (
        <form onSubmit={onSubmit} className="w-full max-w-xs md:max-w-sm">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Rechercher produit..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="w-full appearance-none pl-8 shadow-none bg-zinc-50 dark:bg-zinc-900 border-border/80 text-xs h-9 focus:ring-emerald-500/20 rounded-md"
                />
            </div>
        </form>
    )
}
