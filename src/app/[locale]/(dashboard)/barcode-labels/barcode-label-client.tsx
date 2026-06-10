"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { Printer, Search, Plus, Minus, Tag, X, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import Barcode from "react-barcode";

interface Product {
    id: string;
    name: string;
    price: number;
    category: string;
    barcodes: string[];
}

interface LabelItem {
    product: Product;
    barcode: string;
    quantity: number;
}

export function BarcodeLabelClient({ products }: { products: Product[] }) {
    const [search, setSearch] = useState("");
    const [labels, setLabels] = useState<LabelItem[]>([]);
    const [labelSize, setLabelSize] = useState<"small" | "medium" | "large">("small");
    const [showPrice, setShowPrice] = useState(true);
    const printRef = useRef<HTMLDivElement>(null);
    const [printerBarcode, setPrinterBarcode] = useState("default");

    useEffect(() => {
        try {
            const stored = localStorage.getItem("pos_printing_prefs");
            if (stored) {
                const prefs = JSON.parse(stored);
                if (prefs.printerBarcode) setPrinterBarcode(prefs.printerBarcode);
            }
        } catch { /* noop */ }
    }, []);

    const filteredProducts = useMemo(() => {
        if (!search) return products.slice(0, 50);
        return products.filter(
            (p) =>
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.barcodes.some((b) => b.includes(search))
        );
    }, [products, search]);

    const addLabel = (product: Product) => {
        const barcode = product.barcodes[0];
        if (!barcode) return;

        setLabels((prev) => {
            const existing = prev.find((l) => l.barcode === barcode);
            if (existing) {
                return prev.map((l) =>
                    l.barcode === barcode ? { ...l, quantity: l.quantity + 1 } : l
                );
            }
            return [...prev, { product, barcode, quantity: 1 }];
        });
    };

    const updateQty = (barcode: string, delta: number) => {
        setLabels((prev) =>
            prev
                .map((l) =>
                    l.barcode === barcode
                        ? { ...l, quantity: Math.max(0, l.quantity + delta) }
                        : l
                )
                .filter((l) => l.quantity > 0)
        );
    };

    const removeLabel = (barcode: string) => {
        setLabels((prev) => prev.filter((l) => l.barcode !== barcode));
    };

    const totalLabels = labels.reduce((sum, l) => sum + l.quantity, 0);

    const labelDimensions = {
        small: { w: "40mm", h: "20mm", cols: 5, fontSize: "9px", priceFontSize: "17px", barcodeH: 38, barcodeW: 1.2, barcodeWidthCss: "36mm" },
        medium: { w: "52mm", h: "30mm", cols: 4, fontSize: "11px", priceFontSize: "22px", barcodeH: 55, barcodeW: 1.5, barcodeWidthCss: "46mm" },
        large: { w: "70mm", h: "37mm", cols: 3, fontSize: "13px", priceFontSize: "26px", barcodeH: 70, barcodeW: 1.8, barcodeWidthCss: "64mm" },
    };

    const dim = labelDimensions[labelSize];

    const handlePrint = () => {
        if (!printRef.current) return;
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        const printTitle = printerBarcode !== "default" ? printerBarcode : "Étiquettes Code-barres - SYNCLOUDPOS";

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${printTitle}</title>
                <meta name="printer" content="${printerBarcode}" />
                <meta name="printer-name" content="${printerBarcode}" />
                <meta name="selected-printer" content="${printerBarcode}" />
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    @page { 
                        size: ${dim.w} ${dim.h}; 
                        margin: 0; 
                    }
                    body { 
                        font-family: Arial, Helvetica, sans-serif; 
                        margin: 0;
                        padding: 0;
                        background: white;
                    }
                    .label-grid {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    .label {
                        width: ${dim.w};
                        height: ${dim.h};
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 1mm;
                        page-break-inside: avoid;
                        page-break-after: always;
                        break-after: page;
                        overflow: hidden;
                        box-sizing: border-box;
                        border: none;
                    }
                    .label:last-child {
                        page-break-after: avoid;
                        break-after: avoid;
                    }
                    .label-name {
                        font-size: ${dim.fontSize};
                        font-weight: bold;
                        text-align: center;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        max-width: 100%;
                        line-height: 1.2;
                    }
                    .label-barcode { display: flex; justify-content: center; margin: 0.5mm 0 0 0; }
                    .label-barcode svg { width: ${dim.barcodeWidthCss}; height: ${dim.barcodeH}px; }
                    .label-price {
                        font-size: ${dim.priceFontSize};
                        font-weight: 900;
                        letter-spacing: -0.5px;
                        margin-top: -0.5mm;
                    }
                </style>
            </head>
            <body data-printer="${printerBarcode}" data-printer-name="${printerBarcode}" data-selected-printer="${printerBarcode}">
                <script>
                    window.printerName = "${printerBarcode}";
                    window.selectedPrinter = "${printerBarcode}";
                </script>
                ${printRef.current.innerHTML}
                <script>window.onload = () => { window.print(); window.close(); }<\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // Generate expanded labels array for preview
    const expandedLabels = useMemo(() => {
        return labels.flatMap((label) =>
            Array.from({ length: label.quantity }, (_, i) => ({
                ...label,
                key: `${label.barcode}-${i}`,
            }))
        );
    }, [labels]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg shadow-pink-500/20">
                        <Tag className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                            Étiquettes Code-barres
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Sélectionnez des produits et imprimez des planches d&apos;étiquettes
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-sm font-semibold px-4 py-1.5 rounded-full">
                        {totalLabels} étiquette{totalLabels !== 1 ? "s" : ""}
                    </Badge>
                    <Button
                        onClick={handlePrint}
                        disabled={totalLabels === 0}
                        className="rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 gap-2 font-bold"
                    >
                        <Printer className="h-4 w-4" />
                        Imprimer
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Product Selection */}
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher un produit ou code-barres..."
                            className="pl-10 h-11 rounded-xl"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <ScrollArea className="h-[calc(100vh-320px)]">
                        <div className="space-y-1.5 pr-4">
                            {filteredProducts.map((product) => {
                                const isAdded = labels.some((l) => l.barcode === product.barcodes[0]);
                                return (
                                    <div
                                        key={product.id}
                                        onClick={() => addLabel(product)}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                                            isAdded
                                                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/40"
                                                : "bg-white dark:bg-[#1a1a2e] border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                                        )}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                                                {product.name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                    {product.barcodes[0] || "Pas de code-barres"}
                                                </span>
                                                {product.category && (
                                                    <span className="text-[9px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 font-semibold">
                                                        {product.category}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-sm font-black text-gray-700 dark:text-gray-300">
                                                {new Intl.NumberFormat("fr-FR").format(product.price)} DA
                                            </span>
                                            {isAdded ? (
                                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                            ) : (
                                                <Plus className="h-5 w-5 text-gray-400" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredProducts.length === 0 && (
                                <div className="py-16 text-center text-muted-foreground">
                                    <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                    <p className="font-medium">Aucun produit trouvé</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Right: Label Queue + Settings */}
                <div className="space-y-4">
                    {/* Settings */}
                    <div className="bg-white dark:bg-[#1a1a2e] rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white">Paramètres</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium w-16 shrink-0">Taille</span>
                            <div className="flex gap-1">
                                {(["small", "medium", "large"] as const).map((size) => (
                                    <Button
                                        key={size}
                                        variant={labelSize === size ? "default" : "outline"}
                                        size="sm"
                                        className="rounded-lg text-xs"
                                        onClick={() => setLabelSize(size)}
                                    >
                                        {size === "small" ? "40×20mm" : size === "medium" ? "52×30mm" : "70×37mm"}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium w-16 shrink-0">Prix</span>
                            <Button
                                variant={showPrice ? "default" : "outline"}
                                size="sm"
                                className="rounded-lg text-xs"
                                onClick={() => setShowPrice(!showPrice)}
                            >
                                {showPrice ? "Avec prix" : "Sans prix"}
                            </Button>
                        </div>
                    </div>

                    {/* Label Queue */}
                    <div className="bg-white dark:bg-[#1a1a2e] rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-3">
                            File d&apos;impression ({totalLabels})
                        </h3>
                        {labels.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                <p className="text-sm">Cliquez sur un produit pour ajouter des étiquettes</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {labels.map((label) => (
                                    <div
                                        key={label.barcode}
                                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                {label.product.name}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground font-mono">
                                                {label.barcode}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => updateQty(label.barcode, -1)}
                                                className="w-7 h-7 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                            >
                                                <Minus className="h-3 w-3" />
                                            </button>
                                            <span className="text-sm font-black w-6 text-center">
                                                {label.quantity}
                                            </span>
                                            <button
                                                onClick={() => updateQty(label.barcode, 1)}
                                                className="w-7 h-7 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </button>
                                            <button
                                                onClick={() => removeLabel(label.barcode)}
                                                className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full rounded-lg mt-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() => setLabels([])}
                                >
                                    Tout supprimer
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Hidden print area with actual barcodes */}
            <div className="hidden">
                <div ref={printRef}>
                    <div className="label-grid">
                        {expandedLabels.map((label) => (
                            <div key={label.key} className="label">
                                <div className="label-name">{label.product.name}</div>
                                <div className="label-barcode">
                                    <Barcode
                                        value={label.barcode}
                                        height={dim.barcodeH}
                                        width={dim.barcodeW}
                                        fontSize={10}
                                        margin={2}
                                        displayValue={false}
                                    />
                                </div>
                                {showPrice && (
                                    <div className="label-price">
                                        {new Intl.NumberFormat("fr-FR").format(label.product.price)} DA
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
