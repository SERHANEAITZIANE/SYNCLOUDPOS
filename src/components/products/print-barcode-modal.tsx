"use client"

import { useState, useRef, useEffect } from "react"
import { useReactToPrint } from "react-to-print"
import { Printer, Sparkles, Tag, Plus, Minus, LayoutGrid } from "lucide-react"
import { printWithDefaultPrinter } from "@/lib/print-helper"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { BarcodeLabel } from "./barcode-label"
import type { BarcodeLabelModel } from "./barcode-label"
import { cn } from "@/lib/utils"

interface PrintBarcodeModalProps {
    productName: string
    price: number
    barcodes: { value: string; label?: string | null }[]
    children?: React.ReactNode
    tenantName?: string
    tenantPhone?: string
}

export const PrintBarcodeModal = ({ 
    productName, 
    price, 
    barcodes, 
    children,
    tenantName = "",
    tenantPhone = ""
}: PrintBarcodeModalProps) => {
    const [copies, setCopies] = useState<Record<string, number>>({})
    const [selectedBarcodeIndex, setSelectedBarcodeIndex] = useState(0)
    const [barcodeModel, setBarcodeModel] = useState<BarcodeLabelModel>("simple_40x20")
    const [isPrinting, setIsPrinting] = useState(false)
    const [printerBarcode, setPrinterBarcode] = useState("default")

    const getCopies = (barcode: string) => copies[barcode] ?? 1
    const setBarcodeCopies = (barcode: string, num: number) => {
        setCopies(prev => ({ ...prev, [barcode]: Math.max(0, Math.min(500, num)) }))
    }

    useEffect(() => {
        try {
            const stored = localStorage.getItem("pos_printing_prefs")
            if (stored) {
                const prefs = JSON.parse(stored)
                if (prefs.barcodeModel && ["simple_40x20", "side_store_45x35", "store_40x20", "name_only_40x20"].includes(prefs.barcodeModel)) {
                    setBarcodeModel(prefs.barcodeModel)
                }
                if (prefs.printerBarcode) setPrinterBarcode(prefs.printerBarcode)
            }
        } catch { /* noop */ }
    }, [])

    const printRef = useRef<HTMLDivElement>(null)

    const dim = {
        simple_40x20: { w: "40mm", h: "20mm", labelSize: "4x2" as const },
        side_store_45x35: { w: "45mm", h: "35mm", labelSize: "4.5x3.5" as const },
        store_40x20: { w: "40mm", h: "20mm", labelSize: "4x2" as const },
        name_only_40x20: { w: "40mm", h: "20mm", labelSize: "4x2" as const },
    }[barcodeModel] || { w: "40mm", h: "20mm", labelSize: "4x2" as const };

    const handlePrint = useReactToPrint({
        documentTitle: printerBarcode !== "default" ? printerBarcode : (productName || "Barcode Label"),
        pageStyle: `
            @page {
                size: ${dim.w} ${dim.h};
                margin: 0;
            }
            @media print {
                html, body {
                    width: ${dim.w};
                    height: ${dim.h};
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .barcode-print-item {
                    page-break-after: always !important;
                    break-after: page !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                    width: 100% !important;
                    height: 100% !important;
                    box-sizing: border-box !important;
                    overflow: hidden !important;
                }
                .barcode-print-item:last-child {
                    page-break-after: avoid !important;
                    break-after: avoid !important;
                }
            }
        `
    })

    const onPrintClick = () => {
        setIsPrinting(true)
    }

    useEffect(() => {
        if (isPrinting && printRef.current) {
            const originalTitle = document.title
            if (printerBarcode !== "default") {
                document.title = printerBarcode
            }
            
            printWithDefaultPrinter(printerBarcode, () => {
                handlePrint(() => printRef.current!)
            }).finally(() => {
                setIsPrinting(false)
                setTimeout(() => {
                    document.title = originalTitle
                }, 1000)
            })
        }
    }, [isPrinting, handlePrint, printerBarcode])

    const validBarcodes = (barcodes || []).filter(b => b && b.value && b.value.trim() !== "");
    const hasBarcodes = validBarcodes.length > 0;
    const finalBarcodes = hasBarcodes ? validBarcodes : [{ value: `NO_BARCODE_${productName.replace(/\s+/g, '_')}` }];
    const activeIndex = selectedBarcodeIndex < finalBarcodes.length ? selectedBarcodeIndex : 0;
    const activeBarcode = finalBarcodes[activeIndex].value;
    
    const totalCopiesToPrint = finalBarcodes.reduce((sum, b) => sum + getCopies(b.value), 0)

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" size="sm" type="button" className="rounded-xl border-gray-200 hover:border-gray-300 dark:border-gray-800 transition-colors gap-2 font-semibold">
                        <Printer className="h-4 w-4" />
                        Imprimer Code Barre
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-2xl bg-white dark:bg-[#0c0c14] md:max-h-[90vh] flex flex-col">
                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-150 dark:divide-gray-800/60 overflow-hidden flex-1">
                    {/* Left Column: Settings */}
                    <div className="flex-1 p-6 md:p-8 flex flex-col justify-between bg-gray-50/50 dark:bg-[#09090f] overflow-y-auto">
                        <div className="space-y-6">
                            <DialogHeader className="p-0 text-left">
                                <div className="flex items-center gap-2.5 mb-1.5">
                                    <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/30 text-pink-500">
                                        <Tag className="h-5 w-5" />
                                    </div>
                                    <DialogTitle className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                                        Étiquettes Code-barres
                                    </DialogTitle>
                                </div>
                                <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
                                    Personnalisez le style d'étiquette de <span className="font-semibold text-gray-700 dark:text-gray-200">{productName}</span>.
                                </DialogDescription>
                            </DialogHeader>

                            {finalBarcodes.length > 0 && (
                                <div className="space-y-5 py-2">
                                    {/* 1. Barcode Selection & Quantity */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                            Code-barres à imprimer
                                        </Label>
                                        <div className="flex flex-col gap-2">
                                            {finalBarcodes.map((b, i) => (
                                                <div key={i} className={cn(
                                                    "flex items-center justify-between p-2 rounded-xl border transition-all duration-200 cursor-pointer",
                                                    activeIndex === i
                                                        ? "border-gray-900 bg-gray-50 dark:border-white dark:bg-gray-800 shadow-sm"
                                                        : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                                )} onClick={() => setSelectedBarcodeIndex(i)}>
                                                    <span className="font-semibold text-sm px-2 text-gray-900 dark:text-gray-100">
                                                        {b.value.startsWith("NO_BARCODE") ? "Sans code-barres" : b.value}
                                                    </span>
                                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setBarcodeCopies(b.value, getCopies(b.value) - 1)}
                                                            className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-bold text-gray-700 dark:text-gray-200"
                                                        ><Minus className="h-3 w-3" /></button>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={500}
                                                            value={getCopies(b.value)}
                                                            onChange={(e) => setBarcodeCopies(b.value, parseInt(e.target.value) || 0)}
                                                            className="w-10 text-center font-bold bg-transparent border-none focus:outline-none text-sm p-0 text-gray-900 dark:text-gray-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setBarcodeCopies(b.value, getCopies(b.value) + 1)}
                                                            className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-bold text-gray-700 dark:text-gray-200"
                                                        ><Plus className="h-3 w-3" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 2. Style Selection */}
                                    <div className="space-y-2.5">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                                            <LayoutGrid className="h-3.5 w-3.5" /> Modèle visuel
                                        </Label>
                                        <div className="grid grid-cols-1 gap-2.5">
                                            {([
                                                { id: "simple_40x20", name: "Simple (40×20 mm)", desc: "Nom + Code-barres + Prix" },
                                                { id: "side_store_45x35", name: "Bandeau Gauche (45×35 mm)", desc: "Infos magasin + Nom multiline + Grand Code-barres" },
                                                { id: "store_40x20", name: "Bandeau Magasin (40×20 mm)", desc: "Magasin + Nom + Code-barres + Prix" },
                                                { id: "name_only_40x20", name: "Nom Seulement (40×20 mm)", desc: "Nom de produit uniquement centré en gros sans prix ni code-barres" }
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
                            )}
                        </div>
                    </div>

                    {/* Right Column: Interactive Canvas & Action */}
                    <div className="w-full md:w-[350px] p-6 md:p-8 flex flex-col justify-between items-center bg-white dark:bg-[#0c0c14] select-none">
                        <div className="w-full flex flex-col items-center flex-1 justify-center">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-6 flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3 text-pink-500 animate-pulse" /> Aperçu en temps réel
                            </span>

                            {/* Label Wrapper (canvas style) */}
                            <div className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800/80 flex items-center justify-center p-4 relative overflow-hidden shadow-inner bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f1f33_1px,transparent_1px)] [background-size:16px_16px]">
                                <div className="shadow-2xl bg-white rounded-md overflow-hidden transform hover:scale-105 transition-transform duration-300 border border-gray-100">
                                    <BarcodeLabel
                                        productName={productName}
                                        price={price}
                                        barcodeValue={activeBarcode}
                                        size={dim.labelSize}
                                        model={barcodeModel}
                                        tenantName={tenantName}
                                        tenantPhone={tenantPhone}
                                    />
                                </div>
                            </div>

                            <div className="mt-6 text-center max-w-[280px]">
                                <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold">
                                    Format d'impression : {dim.w.replace("mm", "")} x {dim.h}
                                </p>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed">
                                    L'affichage est optimisé pour votre rouleau d'imprimante thermique sans marges ni débordements.
                                </p>
                            </div>
                                           {/* Print Button */}
                        <div className="w-full mt-8">
                            <Button
                                type="button"
                                onClick={onPrintClick}
                                disabled={totalCopiesToPrint === 0}
                                className="w-full h-12 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30 transition-all duration-200 flex items-center justify-center gap-2 text-sm border-none"
                            >
                                <Printer className="h-4 w-4" />
                                Imprimer {totalCopiesToPrint} étiquette{totalCopiesToPrint > 1 ? "s" : ""}
                            </Button>
                        </div>
                    </div>
                </div>
 
                {/* Hidden container specifically for printing multiple copies */}
                <div className="hidden">
                    <div ref={printRef} className="print-container" data-printer={printerBarcode} data-printer-name={printerBarcode} data-selected-printer={printerBarcode}>
                        {isPrinting && finalBarcodes.flatMap(b => 
                            Array.from({ length: getCopies(b.value) }).map((_, i) => (
                                <BarcodeLabel
                                    key={`${b.value}-${i}`}
                                    productName={productName}
                                    price={price}
                                    barcodeValue={b.value}
                                    size={dim.labelSize}
                                    model={barcodeModel}
                                    tenantName={tenantName}
                                    tenantPhone={tenantPhone}
                                />
                            ))
                        )}
                    </div>
                </div>        </div>
            </DialogContent>
        </Dialog>
    )
}
