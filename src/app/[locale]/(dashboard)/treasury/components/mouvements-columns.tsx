"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"

import { Link } from "@/i18n/routing"
import { Eye } from "lucide-react"

export type TreasuryMovementColumn = {
    id: string
    date: string
    rawDate: Date
    type: string
    amount: string
    balanceAfter: string
    source: string
    description: string
    accountName: string
    referenceId: string | null
}

export const columns: ColumnDef<TreasuryMovementColumn>[] = [
    {
        accessorKey: "date",
        header: "Date",
    },
    {
        accessorKey: "accountName",
        header: "Compte / Caisse",
        cell: ({ row }) => <div className="font-semibold">{row.getValue("accountName")}</div>
    },
    {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => {
            const source = row.getValue("source") as string
            const type = row.original.type
            const desc = (row.original.description || "").toLowerCase()
            
            let displaySource = source
            
            // Retroactive fix for old returns that were saved as MANUAL_IN/OUT
            const isRetour = source === "RETURN" || desc.includes("retour client") || desc.includes("retour fournisseur")

            // Retroactive fix for old loans that were saved as MANUAL_IN/OUT
            const isEmprunt = source === "LOAN" || source === "CUSTOMER_LOAN" || source === "SUPPLIER_LOAN" || desc.includes("emprunt") || desc.includes("prêt")

            if (isRetour) {
                displaySource = type === "DEBIT" ? "Retour Client" : "Retour Fournisseur"
            }
            else if (isEmprunt) {
                displaySource = type === "DEBIT" ? "Emprunt Client" : "Emprunt Fournisseur"
            }
            else if (source === "SALE" || source === "MANUAL_IN" || source === "CUSTOMER_PAYMENT") displaySource = "Paiement Client"
            else if (source === "PURCHASE" || source === "MANUAL_OUT" || source === "SUPPLIER_PAYMENT") displaySource = "Paiement Fournisseur"
            else if (source === "PAYMENT") displaySource = "Paiement"
            else if (source === "EXPENSE") displaySource = "Dépense"
            else if (source === "TRANSFER") {
                displaySource = type === "DEBIT" ? "Virement Sortant" : "Virement Entrant"
            }
            else if (source === "LOAN" || source === "CUSTOMER_LOAN" || source === "SUPPLIER_LOAN") {
                displaySource = type === "DEBIT" ? "Emprunt Client" : "Emprunt Fournisseur"
            }
            else if (source === "INITIAL_BALANCE") displaySource = "Solde Initial"

            return <Badge variant="outline">{displaySource}</Badge>
        }
    },
    {
        accessorKey: "description",
        header: "Observations",
    },
    {
        accessorKey: "amount",
        header: "Entrée / Sortie",
        cell: ({ row }) => {
            const type = row.original.type
            const amount = row.getValue("amount") as string
            if (type === "CREDIT") {
                return <div className="text-green-600 font-bold">+{amount}</div>
            }
            return <div className="text-red-600 font-bold">-{amount}</div>
        }
    },
    {
        accessorKey: "balanceAfter",
        header: "Solde Final",
        cell: ({ row }) => <div className="font-bold">{row.getValue("balanceAfter")}</div>
    },
    {
        accessorKey: "referenceId",
        header: "Opération",
        cell: ({ row }) => {
            const refId = row.original.referenceId
            const source = row.original.source
            const type = row.original.type
            if (!refId) return <span className="text-muted-foreground">-</span>

            let href = ""
            let label = ""

            const txId = row.original.id
            const desc = (row.original.description || "").toLowerCase()
            
            const isRetour = source === "RETURN" || desc.includes("retour client") || desc.includes("retour fournisseur")

            const isEmprunt = source === "LOAN" || desc.includes("emprunt") || desc.includes("prêt")

            if (isRetour) {
                href = `/retours?returnId=${refId}`
                label = type === "DEBIT" ? "Retour Client" : "Retour Fournisseur"
            } else if (isEmprunt) {
                if (type === "DEBIT") {
                    href = `/emprunt`
                    label = "Emprunt Client"
                } else {
                    href = `/emprunt-fournisseur`
                    label = "Emprunt Fournisseur"
                }
            } else if (source === "SALE" || source === "MANUAL_IN" || source === "CUSTOMER_PAYMENT") {
                href = `/payments?paymentId=${txId}`
                label = "Paiement Client"
            } else if (source === "PURCHASE" || source === "MANUAL_OUT" || source === "SUPPLIER_PAYMENT") {
                href = `/payments/suppliers?paymentId=${txId}`
                label = "Paiement Fournisseur"
            } else if (source === "EXPENSE") {
                href = `/expenses/${refId}`
                label = "Dépense"
            } else if (source === "TRANSFER") {
                href = `/transfers`
                label = type === "DEBIT" ? "Virement Sortant" : "Virement Entrant"
            } else if (source === "INITIAL_BALANCE") {
                // No specific page for initial balance, but we can prevent showing "Autre"
                href = ""
                label = "Solde Initial"
            } else if (source === "PAYMENT") {
                const desc = (row.original.description || "").toLowerCase()
                if (desc.includes("fournisseur") || desc.includes("supplier")) {
                    href = `/payments/suppliers?paymentId=${txId}`
                    label = "Paiement Fournisseur"
                } else {
                    href = `/payments?paymentId=${txId}`
                    label = "Paiement Client"
                }
            }

            if (!href) return <span className="text-xs text-muted-foreground">Autre</span>

            return (
                <Link
                    href={href}
                    target="_blank"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold hover:underline flex items-center gap-1 text-xs"
                >
                    <Eye className="h-3 w-3" />
                    <span>{label}</span>
                </Link>
            )
        }
    }
]
