"use client"

import React, { useRef } from "react"
import { Printer, X, User, Wallet, Calendar, FileText, ArrowDownLeft } from "lucide-react"
import { useReactToPrint } from "react-to-print"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

export interface PaymentFicheData {
    id?: string
    date: string
    amount: number
    customerName: string
    accountName: string
    description?: string
    source?: string
}

interface FichePaiementModalProps {
    open: boolean
    onClose: () => void
    data: PaymentFicheData | null
}

export const FichePaiementModal: React.FC<FichePaiementModalProps> = ({ open, onClose, data }) => {
    const printRef = useRef<HTMLDivElement>(null)

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Fiche_Paiement_${data?.customerName || 'Client'}_${data?.id ? data.id.slice(0, 8) : 'Recu'}`,
    })

    if (!data) return null

    const formattedAmount = new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(data.amount) + " DA"

    const formattedDate = data.date
        ? format(new Date(data.date), "dd MMMM yyyy 'à' HH:mm", { locale: fr })
        : format(new Date(), "dd MMMM yyyy 'à' HH:mm", { locale: fr })

    return (
        <Dialog open={open} onOpenChange={(val) => { if (!val) onClose() }}>
            <DialogContent showCloseButton={false} className="p-0 sm:max-w-lg overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl">
                <DialogTitle className="sr-only">Fiche de Paiement</DialogTitle>
                
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-6 py-5 text-white flex items-center justify-between shrink-0 shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                            <ArrowDownLeft className="h-6 w-6 text-emerald-100" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold tracking-tight">Fiche de Paiement</h2>
                                <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
                                    Encaissé
                                </span>
                            </div>
                            <p className="text-xs text-emerald-100/80 mt-0.5 font-mono">
                                Réf: #{data.id ? data.id.slice(0, 12) : "PAY-" + Math.floor(Math.random() * 100000)}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content / Printable Area */}
                <div className="p-6 overflow-y-auto space-y-6 max-h-[75vh]">

                    {/* Amount Banner */}
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-5 text-center shadow-sm">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                            Montant du Versement
                        </span>
                        <span className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-300 tracking-tight">
                            {formattedAmount}
                        </span>
                    </div>

                    {/* Information Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
                            <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                <User className="w-3.5 h-3.5 text-emerald-500" /> Client / Payeur
                            </span>
                            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 block truncate">
                                {data.customerName || "Client de passage"}
                            </span>
                        </div>

                        <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
                            <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                <Wallet className="w-3.5 h-3.5 text-blue-500" /> Caisse / Mode
                            </span>
                            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 block truncate">
                                {data.accountName || "Caisse Principale"}
                            </span>
                        </div>

                        <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 sm:col-span-2">
                            <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                <Calendar className="w-3.5 h-3.5 text-amber-500" /> Date & Heure
                            </span>
                            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 block">
                                {formattedDate}
                            </span>
                        </div>

                        {data.description && (
                            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 sm:col-span-2">
                                <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                    <FileText className="w-3.5 h-3.5 text-purple-500" /> Observation / Motif
                                </span>
                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block italic">
                                    "{data.description}"
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Hidden Printable Ticket Template */}
                    <div className="hidden">
                        <div ref={printRef} className="p-8 font-sans text-black max-w-md mx-auto">
                            <div className="text-center pb-4 border-b border-black mb-4">
                                <h2 className="text-xl font-bold uppercase">REÇU DE VERSEMENT</h2>
                                <p className="text-xs">SYNCLOUDPOS</p>
                                <p className="text-xs font-mono mt-1">N°: #{data.id ? data.id.slice(0, 10) : "RECU"}</p>
                            </div>
                            <div className="space-y-2 text-sm my-4">
                                <div className="flex justify-between">
                                    <span className="font-semibold">Date:</span>
                                    <span>{formattedDate}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold">Client:</span>
                                    <span className="font-bold">{data.customerName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold">Mode de règlement:</span>
                                    <span>{data.accountName}</span>
                                </div>
                                {data.description && (
                                    <div className="flex justify-between">
                                        <span className="font-semibold">Motif:</span>
                                        <span>{data.description}</span>
                                    </div>
                                )}
                            </div>
                            <div className="border-t-2 border-b-2 border-black py-3 my-4 text-center">
                                <span className="text-xs font-bold uppercase block">Montant Encaissé</span>
                                <span className="text-2xl font-black">{formattedAmount}</span>
                            </div>
                            <div className="flex justify-between text-xs pt-6">
                                <div>Signature Caissier</div>
                                <div>Signature Client</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/80 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3 shrink-0">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="rounded-xl border-zinc-300 dark:border-zinc-700"
                    >
                        Fermer
                    </Button>
                    <Button
                        onClick={handlePrint}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 font-semibold shadow-md"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimer le Reçu
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
