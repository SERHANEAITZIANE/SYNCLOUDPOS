"use client"

import { useState, useRef, useEffect } from "react"
import { useReactToPrint } from "react-to-print"
import { Printer, Sparkles, Tag, Plus, Minus, LayoutGrid } from "lucide-react"

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
}

export const PrintBarcodeModal = ({ productName, price, barcodes, children }: PrintBarcodeModalProps) => {
    const [size, setSize] = useState<"4x2" | "4.5x3.5" | "5x3">("4x2")
    const [copies, setCopies] = useState(1)
    const [selectedBarcodeIndex, setSelectedBarcodeIndex] = useState(0)
    const [barcodeModel, setBarcodeModel] = useState<BarcodeLabelModel>("classic")
    const [isPrinting, setIsPrinting] = useState(false)
    const [printerBarcode, setPrinterBarcode] = useState("default")

    useEffect(() => {
        try {
            const stored = localStorage.getItem("pos_printing_prefs")
            if (stored) {
                const prefs = JSON.parse(stored)
                if (prefs.barcodeModel) setBarcodeModel(prefs.barcodeModel)
                if (prefs.printerBarcode) setPrinterBarcode(prefs.printerBarcode)
            }
        } catch { /* noop */ }
    }, [])

    const printRef = useRef<HTMLDivElement>(null)

    const handlePrint = useReactToPrint({
        documentTitle: printerBarcode !== "default" ? printerBarcode : (productName || "Barcode Label"),
        pageStyle: `
            @page {
                size: ${size === "4x2" ? "40mm 20mm" : size === "4.5x3.5" ? "45mm 35mm" : "50mm 30mm"};
                margin: 0;
            }
            @media print {
                html, body {
                    width: ${size === "4x2" ? "40mm" : size === "4.5x3.5" ? "45mm" : "50mm"};
                    height: ${size === "4x2" ? "20mm" : size === "4.5x3.5" ? "35mm" : "30mm"};
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
            const timer = setTimeout(() => {
                handlePrint(() => printRef.current!)
                setIsPrinting(false)
                setTimeout(() => {
                    document.title = originalTitle
                }, 1000)
            }, 150)
            return () => {
                clearTimeout(timer)
            }
        }
    }, [isPrinting, handlePrint, printerBarcode])

    const validBarcodes = (barcodes || []).filter(b => b && b.value && b.value.trim() !== "");
    const hasBarcodes = validBarcodes.length > 0;
    const activeIndex = selectedBarcodeIndex < validBarcodes.length ? selectedBarcodeIndex : 0;
    const activeBarcode = hasBarcodes ? validBarcodes[activeIndex].value : "";

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" size="sm" disabled={!hasBarcodes} type="button" className="rounded-xl border-gray-200 hover:border-gray-300 dark:border-gray-800 transition-colors gap-2 font-semibold">
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
                                    Personnalisez la taille et le style des étiquettes de <span className="font-semibold text-gray-700 dark:text-gray-200">{productName}</span>.
                                </DialogDescription>
                            </DialogHeader>

                            {hasBarcodes && (
                                <div className="space-y-5 py-2">
                                    {/* 1. Barcode Selection */}
                                    {validBarcodes.length > 1 && (
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                                Code-barres actif
                                            </Label>
                                            <div className="flex flex-wrap gap-2">
                                                {validBarcodes.map((b, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => setSelectedBarcodeIndex(i)}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200",
                                                            activeIndex === i
                                                                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-900 dark:border-white shadow-sm"
                                                                : "bg-white dark:bg-[#151525] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                        )}
                                                    >
                                                        {b.value}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 2. Label Dimension Selector */}
                                    <div className="space-y-2.5">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                            Dimension de l'étiquette
                                        </Label>
                                        <div className="grid grid-cols-3 gap-2.5">
                                            {(["4x2", "4.5x3.5", "5x3"] as const).map((s) => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => setSize(s)}
                                                    className={cn(
                                                        "p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all duration-200 gap-1.5 relative overflow-hidden group",
                                                        size === s
                                                            ? "border-pink-500 bg-pink-500/5 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400 ring-1 ring-pink-500"
                                                            : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-[#121220]"
                                                    )}
                                                >
                                                    <span className="font-bold text-xs">
                                                        {s === "4x2" ? "40×20 mm" : s === "4.5x3.5" ? "45×35 mm" : "50×30 mm"}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400">
                                                        {s === "4x2" ? "Compact" : s === "4.5x3.5" ? "Standard" : "Large"}
                                                    </span>
                                                    {size === s && (
                                                        <div className="absolute top-1 right-1">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-pink-500" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 3. Style Selection */}
                                    <div className="space-y-2.5">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                                            <LayoutGrid className="h-3.5 w-3.5" /> Modèle visuel
                                        </Label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                            {([
                                                { id: "classic", name: "Classique", desc: "Minimal simple" },
                                                { id: "modern", name: "Sombre", desc: "Fond noir" },
                                                { id: "elegant", name: "Élégant", desc: "Cadre fin" },
                                                { id: "retro", name: "Rétro", desc: "Teinte vintage" },
                                                { id: "minimal", name: "Minimaliste", desc: "Épuré" },
                                                { id: "bold", name: "Gras", desc: "Bandeau contrast" }
                                            ] as const).map((m) => (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setBarcodeModel(m.id);
                                                        try {
                                                            localStorage.setItem("pos_printing_prefs", JSON.stringify({ barcodeModel: m.id }));
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
                                                        <div className="absolute top-1 right-1">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-pink-500" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 4. Quantity Stepper */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between p-3.5 bg-white dark:bg-[#121220] rounded-xl border border-gray-200 dark:border-gray-800">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Nombre d'exemplaires</span>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500">Quantité à imprimer</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setCopies(prev => Math.max(1, prev - 1))}
                                                    className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors font-bold text-base"
                                                >
                                                    <Minus className="h-3.5 w-3.5" />
                                                </button>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={500}
                                                    value={copies}
                                                    onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                                                    className="w-12 text-center font-black bg-transparent border-none text-gray-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setCopies(prev => Math.min(500, prev + 1))}
                                                    className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-600 dark:text-gray-300 transition-colors font-bold text-base"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
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
                                {hasBarcodes ? (
                                    <div className="shadow-2xl bg-white rounded-md overflow-hidden transform hover:scale-105 transition-transform duration-300 border border-gray-100">
                                        <BarcodeLabel
                                            productName={productName}
                                            price={price}
                                            barcodeValue={activeBarcode}
                                            size={size}
                                            model={barcodeModel}
                                        />
                                    </div>
                                ) : (
                                    <div className="text-center text-xs text-gray-400">
                                        Aucun code-barres disponible
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 text-center max-w-[280px]">
                                <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold">
                                    Format d'impression : {size === "4x2" ? "40 x 20 mm" : size === "4.5x3.5" ? "45 x 35 mm" : "50 x 30 mm"}
                                </p>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed">
                                    L'affichage est optimisé pour votre rouleau d'imprimante thermique sans marges ni débordements.
                                </p>
                            </div>
                        </div>

                        {/* Print Button */}
                        <div className="w-full mt-8">
                            <Button
                                type="button"
                                onClick={onPrintClick}
                                disabled={!hasBarcodes}
                                className="w-full h-12 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30 transition-all duration-200 flex items-center justify-center gap-2 text-sm border-none"
                            >
                                <Printer className="h-4 w-4" />
                                Imprimer {copies} étiquette{copies > 1 ? "s" : ""}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Hidden container specifically for printing multiple copies */}
                <div className="hidden">
                    <div ref={printRef} className="print-container" data-printer={printerBarcode} data-printer-name={printerBarcode} data-selected-printer={printerBarcode}>
                        {isPrinting && Array.from({ length: copies }).map((_, i) => (
                            <BarcodeLabel
                                key={i}
                                productName={productName}
                                price={price}
                                barcodeValue={activeBarcode}
                                size={size}
                                model={barcodeModel}
                            />
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
