"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { Printer, Search, Plus, Minus, Tag, X, CheckCircle2, LayoutGrid } from "lucide-react";
import { printWithDefaultPrinter } from "@/lib/print-helper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { BarcodeLabel, type BarcodeLabelModel } from "@/components/products/barcode-label";

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

const modelDimensions: Record<BarcodeLabelModel, { w: string; h: string; labelSize: "4x2" | "4.5x3.5" }> = {
    simple_40x20: { w: "40mm", h: "20mm", labelSize: "4x2" },
    side_store_45x35: { w: "45mm", h: "35mm", labelSize: "4.5x3.5" },
    store_40x20: { w: "40mm", h: "20mm", labelSize: "4x2" },
};

export function BarcodeLabelClient({ 
    products,
    tenantName = "",
    tenantPhone = ""
}: { 
    products: Product[];
    tenantName?: string;
    tenantPhone?: string;
}) {
    const [search, setSearch] = useState("");
    const [labels, setLabels] = useState<LabelItem[]>([]);
    const printRef = useRef<HTMLDivElement>(null);
    const [printerBarcode, setPrinterBarcode] = useState("default");
    const [barcodeModel, setBarcodeModel] = useState<BarcodeLabelModel>("simple_40x20");

    useEffect(() => {
        try {
            const stored = localStorage.getItem("pos_printing_prefs");
            if (stored) {
                const prefs = JSON.parse(stored);
                if (prefs.printerBarcode) setPrinterBarcode(prefs.printerBarcode);
                if (prefs.barcodeModel && ["simple_40x20", "side_store_45x35", "store_40x20"].includes(prefs.barcodeModel)) {
                    setBarcodeModel(prefs.barcodeModel);
                }
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

    const dim = modelDimensions[barcodeModel];

    const handlePrint = () => {
        if (!printRef.current) return;
        
        printWithDefaultPrinter(printerBarcode, () => {
            const printWindow = window.open("", "_blank");
            if (!printWindow) return;

            const printTitle = printerBarcode !== "default" ? printerBarcode : "Étiquettes Code-barres - SYNCLOUDPOS";

            const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
                .map(style => style.outerHTML)
                .join('\n');

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${printTitle}</title>
                    <meta name="printer" content="${printerBarcode}" />
                    <meta name="printer-name" content="${printerBarcode}" />
                    <meta name="selected-printer" content="${printerBarcode}" />
                    ${styles}
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
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        .label-grid {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                        }
                        .barcode-print-item {
                            page-break-after: always !important;
                            break-after: page !important;
                            page-break-inside: avoid !important;
                            break-inside: avoid !important;
                            width: ${dim.w} !important;
                            height: ${dim.h} !important;
                            box-sizing: border-box !important;
                            overflow: hidden !important;
                        }
                        .barcode-print-item:last-child {
                            page-break-after: avoid !important;
                            break-after: avoid !important;
                        }
                    </style>
                </head>
                <body data-printer="${printerBarcode}" data-printer-name="${printerBarcode}" data-selected-printer="${printerBarcode}">
                    <script>
                        window.printerName = "${printerBarcode}";
                        window.selectedPrinter = "${printerBarcode}";
                    </script>
                    <div class="label-grid">
                        ${printRef.current!.innerHTML}
                    </div>
                    <script>window.onload = () => { window.print(); window.close(); }<\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
        });
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
                    <div className="bg-white dark:bg-[#1a1a2e] rounded-xl border border-gray-100 dark:border-gray-800 p-5 space-y-5">
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800/80 pb-2">Modèle d'impression</h3>
                        
                        {/* Model Selection */}
                        <div className="space-y-2.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                                <LayoutGrid className="h-3.5 w-3.5" /> Modèle visuel
                            </span>
                            <div className="grid grid-cols-1 gap-2.5">
                                {([
                                    { id: "simple_40x20", name: "Simple (40×20 mm)", desc: "Nom + Code-barres + Prix" },
                                    { id: "side_store_45x35", name: "Bandeau Gauche (45×35 mm)", desc: "Infos magasin + Nom multiline + Grand Code-barres" },
                                    { id: "store_40x20", name: "Bandeau Magasin (40×20 mm)", desc: "Magasin + Nom + Code-barres + Prix" }
                                ] as const).map((m) => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => {
                                            setBarcodeModel(m.id);
                                            try {
                                                const existing = JSON.parse(localStorage.getItem("pos_printing_prefs") || "{}");
                                                localStorage.setItem("pos_printing_prefs", JSON.stringify({ ...existing, barcodeModel: m.id }));
                                            } catch {}
                                        }}
                                        className={cn(
                                            "p-3 rounded-xl border flex flex-col items-start text-left transition-all duration-200 gap-0.5 relative overflow-hidden group",
                                            barcodeModel === m.id
                                                ? "border-pink-500 bg-pink-500/5 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400 ring-1 ring-pink-500"
                                                : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-[#121220]"
                                        )}
                                    >
                                        <span className="font-bold text-xs">{m.name}</span>
                                        <span className="text-[9px] text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400">
                                            {m.desc}
                                        </span>
                                        {barcodeModel === m.id && (
                                            <div className="absolute top-2 right-3">
                                                <div className="h-2 w-2 rounded-full bg-pink-500" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Live Preview Card */}
                    <div className="bg-white dark:bg-[#1a1a2e] rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white font-black tracking-tight">Aperçu en temps réel</h3>
                        <div className="w-full bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 border-2 border-dashed border-gray-200 dark:border-gray-800/80 flex items-center justify-center min-h-[140px] select-none">
                            <div className="shadow-lg bg-white rounded-md overflow-hidden border border-gray-100 text-black">
                                <BarcodeLabel
                                    productName={labels.length > 0 ? labels[0].product.name : "EXEMPLE PRODUIT LAPTOP"}
                                    price={labels.length > 0 ? labels[0].product.price : 65000}
                                    barcodeValue={labels.length > 0 ? labels[0].barcode : "7770911000019"}
                                    model={barcodeModel}
                                    tenantName={tenantName}
                                    tenantPhone={tenantPhone}
                                />
                            </div>
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
                    {expandedLabels.map((label) => (
                        <BarcodeLabel
                            key={label.key}
                            productName={label.product.name}
                            price={label.product.price}
                            barcodeValue={label.barcode}
                            model={barcodeModel}
                            tenantName={tenantName}
                            tenantPhone={tenantPhone}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
