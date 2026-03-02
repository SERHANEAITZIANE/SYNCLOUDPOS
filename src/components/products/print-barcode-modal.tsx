"use client"

import { useState, useRef, useEffect } from "react"
import { useReactToPrint } from "react-to-print"
import { Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { BarcodeLabel } from "./barcode-label"
import type { BarcodeLabelModel } from "./barcode-label"

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

    useEffect(() => {
        try {
            const stored = localStorage.getItem("pos_printing_prefs")
            if (stored) {
                const prefs = JSON.parse(stored)
                if (prefs.barcodeModel) setBarcodeModel(prefs.barcodeModel)
            }
        } catch { /* noop */ }
    }, [])

    const printRef = useRef<HTMLDivElement>(null)

    const handlePrint = useReactToPrint({
        documentTitle: productName || "Barcode Label",
        pageStyle: `
            @page {
                size: ${size === "4x2" ? "40mm 20mm" : size === "4.5x3.5" ? "45mm 35mm" : "50mm 30mm"};
                margin: 0;
            }
            @media print {
                html, body {
                    width: ${size === "4x2" ? "40mm" : size === "4.5x3.5" ? "45mm" : "50mm"};
                    height: ${size === "4x2" ? "20mm" : size === "4.5x3.5" ? "35mm" : "30mm"};
                }
            }
        `
    })

    const onPrintClick = () => {
        if (printRef.current) {
            handlePrint(() => printRef.current!)
        }
    }

    const hasBarcodes = barcodes && barcodes.length > 0;
    const activeBarcode = hasBarcodes ? barcodes[selectedBarcodeIndex].value : "";

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" size="sm" disabled={!hasBarcodes}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print Labels
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Print Barcode Labels</DialogTitle>
                    <DialogDescription>
                        Configure and print barcode labels for your thermal printer.
                    </DialogDescription>
                </DialogHeader>

                {hasBarcodes ? (
                    <div className="grid gap-6 py-4">
                        <div className="space-y-3">
                            <Label>Select Barcode</Label>
                            <div className="flex flex-wrap gap-2">
                                {barcodes.map((b, i) => (
                                    <Button
                                        key={i}
                                        type="button"
                                        variant={selectedBarcodeIndex === i ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedBarcodeIndex(i)}
                                    >
                                        {b.value}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label>Label Size</Label>
                            <RadioGroup value={size} onValueChange={(v: "4x2" | "4.5x3.5" | "5x3") => setSize(v)} className="flex flex-col space-y-1">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="4x2" id="r1" />
                                    <Label htmlFor="r1">4 cm x 2 cm (Compact)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="4.5x3.5" id="r2" />
                                    <Label htmlFor="r2">4.5 cm x 3.5 cm (Standard)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="5x3" id="r3" />
                                    <Label htmlFor="r3">5 cm x 3 cm (Wide)</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="space-y-3">
                            <Label>Copies</Label>
                            <Input
                                type="number"
                                min={1}
                                max={100}
                                value={copies}
                                onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                            />
                        </div>

                        <div className="border rounded-md p-4 bg-muted/50 flex flex-col items-center justify-center min-h-[150px]">
                            <p className="text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wider">Preview</p>
                            <div className="shadow-md bg-white">
                                <BarcodeLabel
                                    productName={productName}
                                    price={price}
                                    barcodeValue={activeBarcode}
                                    size={size}
                                    model={barcodeModel}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-8 text-center text-muted-foreground">
                        No barcodes available for this product.
                    </div>
                )}

                <DialogFooter>
                    <Button
                        type="button"
                        onClick={onPrintClick}
                        disabled={!hasBarcodes}
                        className="w-full"
                    >
                        <Printer className="mr-2 h-4 w-4" />
                        Print {copies} {copies === 1 ? 'Label' : 'Labels'}
                    </Button>
                </DialogFooter>

                {/* Hidden container specifically for printing multiple copies */}
                <div className="hidden">
                    <div ref={printRef} className="print-container">
                        {Array.from({ length: copies }).map((_, i) => (
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
