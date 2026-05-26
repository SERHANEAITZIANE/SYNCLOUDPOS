"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, X, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface Product {
    id: string
    name: string
    stock?: number
    price?: number
    cost?: number
    barcodes?: { value: string }[]
}

interface ProductSearchComboboxProps {
    products: Product[]
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    placeholder?: string
    priceField?: "price" | "cost" | "auto"  // which price to auto-fill
    onPriceSelect?: (price: number) => void
}

export const ProductSearchCombobox: React.FC<ProductSearchComboboxProps> = ({
    products,
    value,
    onChange,
    disabled = false,
    placeholder = "Rechercher un produit...",
    priceField = "auto",
    onPriceSelect,
}) => {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const inputRef = React.useRef<HTMLInputElement>(null)

    const selectedProduct = products.find(p => p.id === value)

    const filtered = React.useMemo(() => {
        if (!query.trim()) return products.slice(0, 50)
        const q = query.toLowerCase()
        return products.filter(p => {
            const nameMatch = p.name.toLowerCase().includes(q)
            const barcodeMatch = p.barcodes?.some(b => b.value.toLowerCase().includes(q))
            return nameMatch || barcodeMatch
        }).slice(0, 50)
    }, [products, query])

    const handleSelect = (productId: string) => {
        onChange(productId)
        const product = products.find(p => p.id === productId)
        if (product && onPriceSelect) {
            let price = 0
            if (priceField === "cost") price = Number(product.cost ?? 0)
            else if (priceField === "price") price = Number(product.price ?? 0)
            else price = Number(product.price ?? product.cost ?? 0)
            onPriceSelect(price)
        }
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
                    className="w-full justify-between h-9 text-left font-normal overflow-hidden"
                >
                    {selectedProduct ? (
                        <span className="flex items-center gap-2 flex-1 min-w-0">
                            <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{selectedProduct.name}</span>
                            {selectedProduct.stock !== undefined && (
                                <Badge variant="outline" className="text-xs shrink-0">
                                    Stock: {selectedProduct.stock}
                                </Badge>
                            )}
                        </span>
                    ) : (
                        <span className="text-muted-foreground flex items-center gap-2">
                            <Search className="h-3.5 w-3.5" />
                            {placeholder}
                        </span>
                    )}
                    <span className="flex items-center gap-1 ml-2 shrink-0">
                        {selectedProduct && (
                            <span
                                role="button"
                                tabIndex={0}
                                onClick={handleClear}
                                className="rounded p-0.5 hover:bg-muted"
                            >
                                <X className="h-3 w-3" />
                            </span>
                        )}
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                    </span>
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[400px] p-0" align="start">
                {/* Search input */}
                <div className="flex items-center gap-2 p-2 border-b">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                        ref={inputRef}
                        placeholder="Nom ou code-barre..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="border-0 h-8 p-0 focus-visible:ring-0 shadow-none"
                    />
                    {query && (
                        <button onClick={() => setQuery("")} className="shrink-0">
                            <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                    )}
                </div>

                {/* Results */}
                <div className="max-h-[280px] overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            Aucun produit trouvé
                        </div>
                    ) : (
                        <div className="p-1">
                            {filtered.map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => handleSelect(product.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-accent transition-colors",
                                        value === product.id && "bg-accent"
                                    )}
                                >
                                    <Check className={cn("h-4 w-4 shrink-0 text-primary", value !== product.id && "opacity-0")} />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{product.name}</div>
                                        {product.barcodes && product.barcodes.length > 0 && (
                                            <div className="text-xs text-muted-foreground font-mono">{product.barcodes[0].value}</div>
                                        )}
                                    </div>
                                    <div className="shrink-0 text-right">
                                        {product.stock !== undefined && (
                                            <div className={cn("text-xs font-semibold", product.stock > 0 ? "text-emerald-600" : "text-red-500")}>
                                                Stock: {product.stock}
                                            </div>
                                        )}
                                        {(product.price !== undefined || product.cost !== undefined) && (
                                            <div className="text-xs text-muted-foreground">
                                                {Number(product.price ?? product.cost ?? 0).toLocaleString()} DA
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                            {filtered.length === 50 && (
                                <p className="text-xs text-center text-muted-foreground py-2">
                                    50 résultats affichés — affinez la recherche
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
