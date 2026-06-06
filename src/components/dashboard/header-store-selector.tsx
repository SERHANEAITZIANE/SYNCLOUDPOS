"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Store as StoreIcon, ChevronDown, Check, MapPin } from "lucide-react"
import { setDefaultStore } from "@/actions/stores"
import { cn } from "@/lib/utils"

interface HeaderStoreSelectorProps {
    stores: { id: string, name: string }[]
    currentStoreId?: string | null
}

export function HeaderStoreSelector({ stores, currentStoreId }: HeaderStoreSelectorProps) {
    const router = useRouter()
    const [isPending, startTransition] = React.useTransition()

    // Determine the active store UI
    const activeStore = stores.find(s => s.id === currentStoreId) || stores[0]

    if (!stores.length) return null

    if (stores.length === 1) {
        return (
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground bg-muted/50 px-0 sm:px-3 py-2 rounded-md justify-center w-10 sm:w-auto">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline truncate">{stores[0].name}</span>
            </div>
        )
    }

    const onStoreSelect = (storeId: string) => {
        startTransition(async () => {
            await setDefaultStore(storeId)
            router.refresh()
        })
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-10 sm:w-[180px] lg:w-[200px] justify-center sm:justify-between px-0 sm:px-4" disabled={isPending}>
                    <div className="flex items-center gap-2 truncate justify-center">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span className="hidden sm:inline truncate">{activeStore?.name || "Select Location"}</span>
                    </div>
                    <ChevronDown className="hidden sm:inline h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[180px] lg:w-[200px]">
                {stores.map(store => (
                    <DropdownMenuItem
                        key={store.id}
                        onClick={() => onStoreSelect(store.id)}
                        className="flex items-center justify-between cursor-pointer"
                    >
                        <span className="truncate">{store.name}</span>
                        {store.id === activeStore?.id && <Check className="w-4 h-4 text-primary" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
