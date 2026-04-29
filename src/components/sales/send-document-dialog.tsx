"use client"

import { useState } from "react"
import { toast } from "react-hot-toast"
import { MessageCircle, Mail, Send, X, User, Phone, AtSign, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { sendDocumentViaWhatsApp, sendDocumentViaEmail } from "@/actions/send-document"

const TYPE_LABELS: Record<string, string> = {
    INVOICE: "Facture",
    ORDER: "Bon de Livraison",
    QUOTE: "Devis / Proforma",
    CREDIT_NOTE: "Avoir",
}

const TYPE_COLORS: Record<string, string> = {
    INVOICE: "bg-purple-100 text-purple-700",
    ORDER: "bg-amber-100 text-amber-700",
    QUOTE: "bg-gray-100 text-gray-700",
    CREDIT_NOTE: "bg-red-100 text-red-700",
}

interface SendDocumentDialogProps {
    open: boolean
    onClose: () => void
    salesOrderId: string
    receiptNumber?: string | null
    documentType: string
    customerName: string
    customerPhone?: string | null
    customerEmail?: string | null
    total: number | string
}

export function SendDocumentDialog({
    open, onClose, salesOrderId, receiptNumber, documentType,
    customerName, customerPhone, customerEmail, total,
}: SendDocumentDialogProps) {
    const [sendingWhatsApp, setSendingWhatsApp] = useState(false)
    const [sendingEmail, setSendingEmail] = useState(false)

    const docLabel = TYPE_LABELS[documentType] || "Document"
    const hasPhone = !!customerPhone
    const hasEmail = !!customerEmail

    const handleWhatsApp = async () => {
        setSendingWhatsApp(true)
        try {
            const result = await sendDocumentViaWhatsApp(salesOrderId)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(result.success || "Envoyé par WhatsApp !")
                onClose()
            }
        } catch {
            toast.error("Erreur lors de l'envoi WhatsApp")
        } finally {
            setSendingWhatsApp(false)
        }
    }

    const handleEmail = async () => {
        setSendingEmail(true)
        try {
            const result = await sendDocumentViaEmail(salesOrderId)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(result.success || "Envoyé par email !")
                onClose()
            }
        } catch {
            toast.error("Erreur lors de l'envoi email")
        } finally {
            setSendingEmail(false)
        }
    }

    const isSending = sendingWhatsApp || sendingEmail

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-blue-600" />
                        Envoyer le document
                    </DialogTitle>
                    <DialogDescription>
                        Envoyez ce document au client par WhatsApp ou Email en PDF
                    </DialogDescription>
                </DialogHeader>

                {/* Document info */}
                <div className="bg-muted/40 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <Badge className={TYPE_COLORS[documentType] || "bg-gray-100 text-gray-700"}>
                                {docLabel}
                            </Badge>
                        </div>
                        <span className="font-mono text-sm font-medium">{receiptNumber || "—"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-semibold">{customerName}</span>
                        </div>
                        <span className="font-bold text-lg">
                            {Number(total).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} DA
                        </span>
                    </div>

                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5" />
                            {hasPhone ? customerPhone : <span className="italic">Pas de téléphone</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            <AtSign className="w-3.5 h-3.5" />
                            {hasEmail ? customerEmail : <span className="italic">Pas d&apos;email</span>}
                        </div>
                    </div>
                </div>

                {/* Send buttons */}
                <div className="flex flex-col gap-3">
                    <Button
                        onClick={handleWhatsApp}
                        disabled={!hasPhone || isSending}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base gap-2"
                    >
                        {sendingWhatsApp ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <MessageCircle className="w-5 h-5" />
                        )}
                        {sendingWhatsApp ? "Envoi en cours..." : "Envoyer par WhatsApp"}
                    </Button>
                    {!hasPhone && (
                        <p className="text-xs text-amber-600 -mt-2 ml-1">
                            ⚠ Ce client n&apos;a pas de numéro de téléphone enregistré
                        </p>
                    )}

                    <Button
                        onClick={handleEmail}
                        disabled={!hasEmail || isSending}
                        variant="outline"
                        className="w-full h-12 text-base gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                        {sendingEmail ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Mail className="w-5 h-5" />
                        )}
                        {sendingEmail ? "Envoi en cours..." : "Envoyer par Email"}
                    </Button>
                    {!hasEmail && (
                        <p className="text-xs text-amber-600 -mt-2 ml-1">
                            ⚠ Ce client n&apos;a pas d&apos;adresse email enregistrée
                        </p>
                    )}
                </div>

                <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={isSending}>
                        <X className="w-4 h-4 mr-1" /> Fermer
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
