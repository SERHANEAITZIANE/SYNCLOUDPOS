"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

export interface SearchableSelectOption {
    label: string
    value: string
}

interface SearchableSelectProps {
    options: SearchableSelectOption[]
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    placeholder?: string
    searchPlaceholder?: string
    emptyMessage?: string
    className?: string
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    disabled = false,
    placeholder = "Sélectionner...",
    searchPlaceholder = "Rechercher...",
    emptyMessage = "Aucun résultat trouvé.",
    className
}) => {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const inputRef = React.useRef<HTMLInputElement>(null)

    const selectedOption = options.find(o => o.value === value)

    const filtered = React.useMemo(() => {
        if (!query.trim()) return options.slice(0, 50)
        const q = query.toLowerCase()
        return options.filter(o => o.label.toLowerCase().includes(q)).slice(0, 50)
    }, [options, query])

    const handleSelect = (val: string) => {
        onChange(val)
        setOpen(false)
        setQuery("")
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        onChange("")
        setQuery("")
    }

    React.useEffect(() => {
        if (open && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [open])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn("w-full justify-between font-normal", className, !value && "text-muted-foreground")}
                >
                    <span className="truncate flex-1 text-left">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <span className="flex items-center gap-1 ml-2 shrink-0">
                        {selectedOption && !disabled && (
                            <span
                                role="button"
                                tabIndex={0}
                                onClick={handleClear}
                                className="rounded p-0.5 hover:bg-muted"
                            >
                                <X className="h-3 w-3" />
                            </span>
                        )}
                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </span>
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[9999]" align="start">
                <div className="flex items-center gap-2 p-2 border-b">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                        ref={inputRef}
                        placeholder={searchPlaceholder}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="border-0 h-8 p-0 focus-visible:ring-0 shadow-none text-sm"
                    />
                    {query && (
                        <button onClick={() => setQuery("")} className="shrink-0">
                            <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                    )}
                </div>

                <div className="max-h-[250px] overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            {emptyMessage}
                        </div>
                    ) : (
                        <div className="p-1">
                            {filtered.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => handleSelect(option.value)}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors",
                                        value === option.value && "bg-accent text-accent-foreground"
                                    )}
                                >
                                    <Check className={cn("h-4 w-4 shrink-0 text-primary", value !== option.value && "opacity-0")} />
                                    <span className="truncate">{option.label}</span>
                                </button>
                            ))}
                            {filtered.length === 50 && (
                                <p className="text-xs text-center text-muted-foreground py-2 border-t mt-1">
                                    50+ résultats. Affinez la recherche.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
