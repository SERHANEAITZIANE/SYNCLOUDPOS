"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Camera, Upload, Loader2, FileText, CheckCircle2, AlertTriangle, X, Sparkles } from "lucide-react"
import Image from "next/image"
import { toast } from "react-hot-toast"
import { Badge } from "@/components/ui/badge"
import { analyzeInvoiceWithAI, type OcrInvoiceItem, type OcrInvoiceResult } from "@/actions/ocr-invoice"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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
    const [isOpen, setIsOpen] = useState(false)
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
        setIsOpen(false)
        handleReset()
    }

    const handleReset = () => {
        setImage(null)
        setResult(null)
    }

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(true)}
                disabled={disabled}
                className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 font-semibold transition-all duration-300 rounded-xl shadow-sm hover:shadow-lg hover:shadow-indigo-500/10 gap-1.5"
            >
                <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
                Scanner un bon (IA)
            </Button>

            <Dialog open={isOpen} onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) handleReset();
            }}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
                    <DialogHeader className="pb-2 border-b">
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
                            Numérisation de Facture / Bon par IA
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-4">
                        {/* ─── Empty state ────────────────────────────────────────────────── */}
                        {!image && (
                            <div className="space-y-5">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:border-indigo-500 dark:hover:border-indigo-500/80 transition-all group min-h-[220px]"
                                >
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-full text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                                        <Upload className="h-8 w-8" />
                                    </div>
                                    <p className="font-bold text-base text-slate-800 dark:text-slate-200 mb-1">
                                        Sélectionner une image ou un document
                                    </p>
                                    <p className="text-sm text-muted-foreground max-w-xs">
                                        Cliquez pour parcourir ou glissez-déposez votre facture/bon de livraison.
                                    </p>
                                </div>

                                <div className="flex items-center justify-center gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => cameraInputRef.current?.click()}
                                        className="gap-2 rounded-xl border-slate-200 dark:border-slate-800"
                                        disabled={disabled}
                                    >
                                        <Camera className="h-4 w-4 text-muted-foreground" />
                                        Prendre une photo (Caméra)
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* ─── Processing state ───────────────────────────────────────────── */}
                        {isProcessing && (
                            <div className="flex flex-col items-center justify-center text-center py-8 space-y-5">
                                {image && (
                                    <div className="relative h-48 w-40 rounded-xl overflow-hidden border bg-black/5 shadow-md">
                                        <Image src={image} alt="Invoice" fill className="object-contain opacity-50" />
                                        <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-1.5">
                                    <p className="font-bold text-lg text-slate-800 dark:text-slate-200">Analyse intelligente en cours...</p>
                                    <p className="text-sm text-muted-foreground max-w-sm">
                                        Notre modèle Gemini extrait les produits, les quantités et les prix d'achat de votre document.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ─── Results state ──────────────────────────────────────────────── */}
                        {!isProcessing && result && (
                            <div className="space-y-4">
                                {result.error || result.items.length === 0 ? (
                                    <div className="p-6 flex flex-col items-center gap-3 text-center">
                                        <AlertTriangle className="h-10 w-10 text-amber-500" />
                                        <p className="font-semibold">Analyse incomplète</p>
                                        <p className="text-sm text-muted-foreground max-w-xs">{result.error || "Aucun article détecté. Essayez avec une image plus claire ou mieux cadrée."}</p>
                                        <Button variant="outline" onClick={handleReset} className="mt-2 rounded-xl">
                                            Réessayer avec une autre image
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-150 dark:border-slate-800/85">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900 text-xs font-semibold px-2.5 py-1">
                                                    📦 {result.supplier || "Fournisseur non détecté"}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {result.items.length} article(s) trouvé(s)
                                                </span>
                                            </div>
                                            <div className={`rounded-lg px-3 py-1 border flex items-center gap-1.5 text-xs font-bold ${result.isValid ? "bg-emerald-50 dark:bg-emerald-950/45 border-emerald-255 text-emerald-800 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-950/45 border-amber-255 text-amber-800 dark:text-amber-400"}`}>
                                                {result.isValid
                                                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                                    : <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                                }
                                                Total document: {result.grandTotal.toLocaleString("fr-DZ")} DA
                                            </div>
                                        </div>

                                        <div className="border rounded-xl overflow-hidden shadow-sm max-h-[300px] overflow-y-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 dark:bg-slate-900/60 sticky top-0 border-b">
                                                    <tr className="text-xs uppercase text-slate-500 dark:text-slate-400 font-bold">
                                                        <th className="px-4 py-3 text-left">Désignation</th>
                                                        <th className="px-4 py-3 text-center w-16">Qté</th>
                                                        <th className="px-4 py-3 text-right w-28">P.U (DA)</th>
                                                        <th className="px-4 py-3 text-right w-32">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 bg-white dark:bg-slate-950">
                                                    {result.items.map((item: OcrInvoiceItem, i: number) => (
                                                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                                                            <td className="px-4 py-3 text-center font-semibold">{item.quantity}</td>
                                                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                                                                {item.unitPrice.toLocaleString("fr-DZ")}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">
                                                                {(item.quantity * item.unitPrice).toLocaleString("fr-DZ")}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Confirm/Reset buttons */}
                                        <div className="flex gap-3 pt-2">
                                            <Button
                                                type="button"
                                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl font-semibold shadow-md shadow-indigo-500/10"
                                                onClick={handleConfirm}
                                            >
                                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                                Importer ces {result.items.length} articles dans le bon
                                            </Button>
                                            <Button type="button" variant="outline" onClick={handleReset} className="rounded-xl border-slate-200 dark:border-slate-800">
                                                Recommencer
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} className="hidden" onChange={handleFileChange} />
            <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
        </>
    )
}
