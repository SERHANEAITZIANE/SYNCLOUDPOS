"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Camera, Upload, Loader2, FileText, CheckCircle2, AlertTriangle, X, Sparkles } from "lucide-react"
import Image from "next/image"
import { toast } from "react-hot-toast"
import { Badge } from "@/components/ui/badge"
import { analyzeInvoiceWithAI, type OcrInvoiceItem, type OcrInvoiceResult } from "@/actions/ocr-invoice"

interface OcrReceiptUploaderProps {
    onProductsExtracted: (
        items: { name: string; price: number; quantity: number }[],
        supplier?: string
    ) => void
    disabled?: boolean
}

export const OcrReceiptUploader: React.FC<OcrReceiptUploaderProps> = ({
    onProductsExtracted,
    disabled
}) => {
    const [image, setImage] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [result, setResult] = useState<OcrInvoiceResult | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]
        const imageUrl = URL.createObjectURL(file)
        setImage(imageUrl)
        setResult(null)
        await processFile(file, imageUrl)
        // Reset input so same file can be re-selected
        e.target.value = ""
    }

    const processFile = async (file: File, imageUrl: string) => {
        setIsProcessing(true)
        try {
            // Convert file to base64
            const base64 = await fileToBase64(file)
            const mimeType = file.type || "image/jpeg"

            const ocrResult = await analyzeInvoiceWithAI(base64, mimeType)
            setResult(ocrResult)

            if (ocrResult.error) {
                toast.error(`Erreur IA: ${ocrResult.error}`)
                return
            }

            if (ocrResult.items.length === 0) {
                toast.error("Aucun article trouvé. Essayez avec une image plus nette.")
                return
            }

            toast.success(`${ocrResult.items.length} article(s) détecté(s) par IA !`)
        } catch (error) {
            console.error("OCR Error:", error)
            toast.error("Erreur lors de l'analyse de l'image.")
        } finally {
            setIsProcessing(false)
        }
    }

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                const dataUrl = reader.result as string
                // Strip the "data:image/xxx;base64," prefix
                const base64 = dataUrl.split(",")[1]
                resolve(base64)
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }

    const handleConfirm = () => {
        if (!result) return
        const items = result.items.map(item => ({
            name: item.name,
            price: item.unitPrice,
            quantity: item.quantity
        }))
        onProductsExtracted(items, result.supplier || undefined)
    }

    const handleReset = () => {
        setImage(null)
        setResult(null)
    }

    // ─── Empty state ──────────────────────────────────────────────────
    if (!image) {
        return (
            <div className="bg-gradient-to-br from-indigo-50/60 to-purple-50/60 dark:from-indigo-950/30 dark:to-purple-950/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="flex justify-center">
                    <div className="h-14 w-14 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center ring-4 ring-indigo-50 dark:ring-indigo-950">
                        <Sparkles className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                    </div>
                </div>
                <div>
                    <h3 className="font-bold text-lg text-indigo-900 dark:text-indigo-100">Scanner un bon de livraison</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        L'IA détectera automatiquement le <strong>fournisseur</strong>, les <strong>produits</strong>, <strong>quantités</strong> et <strong>prix unitaires</strong>.
                    </p>
                </div>
                <div className="flex gap-3 mt-2">
                    <Button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={disabled || isProcessing}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        <Camera className="h-4 w-4 mr-2" />
                        Prendre une photo
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled || isProcessing}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Importer image
                    </Button>
                </div>

                <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} className="hidden" onChange={handleFileChange} />
                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
            </div>
        )
    }

    // ─── Processing state ─────────────────────────────────────────────
    if (isProcessing) {
        return (
            <div className="border rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[200px]">
                <div className="relative h-40 w-full max-w-xs rounded-lg overflow-hidden border bg-black/5 mb-2">
                    <Image src={image} alt="Invoice" fill className="object-contain opacity-50" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
                        <Sparkles className="h-8 w-8 text-indigo-500 animate-pulse mb-2" />
                        <p className="font-semibold text-sm text-indigo-700 dark:text-indigo-300">Analyse IA en cours...</p>
                        <p className="text-xs text-muted-foreground mt-1">L'IA détecte les articles...</p>
                    </div>
                </div>
                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            </div>
        )
    }

    // ─── Results state ────────────────────────────────────────────────
    if (result) {
        const hasError = !!result.error || result.items.length === 0
        return (
            <div className="border rounded-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-indigo-500" />
                        <span className="font-semibold text-sm">Résultat IA — Bon de livraison</span>
                        {result.supplier && (
                            <Badge className="bg-indigo-100 text-indigo-800 border-0 text-xs font-semibold">
                                📦 {result.supplier}
                            </Badge>
                        )}
                    </div>
                    <Button size="sm" variant="ghost" onClick={handleReset}>
                        <X className="h-4 w-4 mr-1" /> Recommencer
                    </Button>
                </div>

                {hasError ? (
                    <div className="p-6 flex flex-col items-center gap-3 text-center">
                        <AlertTriangle className="h-10 w-10 text-amber-500" />
                        <p className="font-semibold">Analyse incomplète</p>
                        <p className="text-sm text-muted-foreground max-w-xs">{result.error || "Aucun article détecté. Essayez avec une image plus claire ou mieux cadrée."}</p>
                        <Button variant="outline" onClick={handleReset} className="mt-2">
                            Réessayer avec une autre image
                        </Button>
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        {/* Preview image + totals */}
                        <div className="flex gap-4">
                            <div className="relative h-28 w-24 shrink-0 rounded-lg overflow-hidden border bg-black/5">
                                <Image src={image} alt="Invoice preview" fill className="object-contain" />
                            </div>
                            <div className="flex-1 space-y-2">
                                {/* Total verification */}
                                <div className={`rounded-lg px-3 py-2 border flex items-center justify-between text-sm font-medium ${result.isValid ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
                                    <div className="flex items-center gap-1.5">
                                        {result.isValid
                                            ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            : <AlertTriangle className="h-4 w-4 text-amber-600" />
                                        }
                                        {result.isValid ? "Totaux vérifiés ✓" : "Écart dans les totaux"}
                                    </div>
                                    <span className="font-bold">{result.grandTotal.toLocaleString("fr-DZ")} DA</span>
                                </div>
                                {!result.isValid && (
                                    <p className="text-xs text-muted-foreground">
                                        Calculé: {result.calculatedTotal.toLocaleString("fr-DZ")} DA • Document: {result.grandTotal.toLocaleString("fr-DZ")} DA
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Items table */}
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr className="text-xs uppercase text-muted-foreground">
                                        <th className="px-3 py-2 text-left font-semibold">Désignation</th>
                                        <th className="px-3 py-2 text-center font-semibold w-14">Qté</th>
                                        <th className="px-3 py-2 text-right font-semibold w-24">P.U (DA)</th>
                                        <th className="px-3 py-2 text-right font-semibold w-28">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.items.map((item: OcrInvoiceItem, i: number) => (
                                        <tr key={i} className="border-t hover:bg-muted/20">
                                            <td className="px-3 py-2 font-medium">{item.name}</td>
                                            <td className="px-3 py-2 text-center">{item.quantity}</td>
                                            <td className="px-3 py-2 text-right text-muted-foreground">
                                                {item.unitPrice.toLocaleString("fr-DZ")}
                                            </td>
                                            <td className="px-3 py-2 text-right font-semibold text-primary">
                                                {(item.quantity * item.unitPrice).toLocaleString("fr-DZ")}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-muted/30 border-t-2">
                                    <tr>
                                        <td colSpan={3} className="px-3 py-2 text-right font-bold text-xs uppercase">TOTAL</td>
                                        <td className="px-3 py-2 text-right font-bold">{result.grandTotal.toLocaleString("fr-DZ")} DA</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Confirm */}
                        <div className="flex gap-3 pt-1">
                            <Button
                                type="button"
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                                onClick={handleConfirm}
                            >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Importer ces {result.items.length} articles
                            </Button>
                            <Button type="button" variant="outline" onClick={handleReset}>
                                Recommencer
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return null
}
