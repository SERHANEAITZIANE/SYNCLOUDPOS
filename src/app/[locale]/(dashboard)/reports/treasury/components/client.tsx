"use client";

import { useTranslations } from "next-intl";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Landmark, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

import { Link } from "@/i18n/routing";
import { Eye } from "lucide-react";

interface TreasuryReportProps {
    totalCash: number;
    totalBank: number;
    transactions: {
        id: string;
        date: string;
        account: string;
        type: string;
        amount: number;
        description: string;
        source: string;
        referenceId: string | null;
    }[];
}

export const TreasuryReportClient: React.FC<TreasuryReportProps> = ({
    totalCash,
    totalBank,
    transactions
}) => {
    const t = useTranslations();
    const formatter = new Intl.NumberFormat("fr-DZ", {
        style: "currency",
        currency: "DZD"
    });

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "date",
            header: "Date",
            cell: ({ row }) => format(new Date(row.original.date), "dd/MM/yyyy HH:mm")
        },
        {
            accessorKey: "account",
            header: "Compte",
        },
        {
            accessorKey: "description",
            header: "Description / Libellé",
        },
        {
            accessorKey: "type",
            header: "Type",
            cell: ({ row }) => {
                const type = row.original.type;
                if (type === "CREDIT") {
                    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><ArrowDownToLine className="w-3 h-3 mr-1" /> Entrée</Badge>
                }
                return <Badge variant="destructive"><ArrowUpFromLine className="w-3 h-3 mr-1" /> Sortie</Badge>
            }
        },
        {
            accessorKey: "amount",
            header: "Montant",
            cell: ({ row }) => {
                const type = row.original.type;
                const isCredit = type === "CREDIT";
                return (
                    <span className={`font-bold ${isCredit ? "text-green-600" : "text-red-500"}`}>
                        {isCredit ? "+" : "-"}{formatter.format(row.original.amount)}
                    </span>
                );
            }
        },
        {
            accessorKey: "referenceId",
            header: "Opération",
            cell: ({ row }) => {
                const refId = row.original.referenceId
                const source = row.original.source
                if (!refId) return <span className="text-muted-foreground">-</span>

                let href = ""
                let label = "Détail"

                if (source === "SALE") {
                    href = `/sales/${refId}`
                    label = "Vente"
                } else if (source === "PURCHASE") {
                    href = `/purchases/${refId}`
                    label = "Achat"
                } else if (source === "EXPENSE") {
                    href = `/expenses/${refId}`
                    label = "Dépense"
                } else if (source === "TRANSFER") {
                    href = `/transfers`
                    label = "Transfert"
                } else if (source === "LOAN") {
                    const desc = (row.original.description || "").toLowerCase()
                    if (desc.includes("fournisseur") || desc.includes("supplier")) {
                        href = `/emprunt-fournisseur`
                    } else {
                        href = `/emprunt`
                    }
                    label = "Emprunt"
                } else if (source === "RETURN") {
                    href = `/retours`
                    label = "Retour"
                } else if (source === "PAYMENT" || source === "MANUAL_IN" || source === "MANUAL_OUT") {
                    const txId = row.original.id
                    const desc = (row.original.description || "").toLowerCase()
                    if (desc.includes("fournisseur") || desc.includes("supplier")) {
                        href = `/payments/suppliers?paymentId=${txId}`
                    } else {
                        href = `/payments?paymentId=${txId}`
                    }
                    label = "Paiement"
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
    ];

    const totalBalance = totalCash + totalBank;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Heading
                    title="Rapport de Trésorerie"
                    description="Vue d'ensemble de vos liquidités, comptes bancaires et flux financiers."
                />
            </div>
            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-900 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-200">Trésorerie Globale</CardTitle>
                        <Landmark className="w-4 h-4 text-slate-300" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatter.format(totalBalance)}</div>
                        <p className="text-xs text-slate-400 mt-1">Total Caisse + Banque</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Liquidité (Caisse)</CardTitle>
                        <Wallet className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {formatter.format(totalCash)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Fonds Bancaires</CardTitle>
                        <Landmark className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {formatter.format(totalBank)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Journal des Transactions (Entrées / Sorties)</CardTitle>
                </CardHeader>
                <CardContent>
                    <DataTable  exportTitle={"Rapport de Trésorerie"} exportDescription={"Vue d'ensemble de vos liquidités, comptes bancaires et flux financiers."} searchKey="description" columns={columns} data={transactions} />
                </CardContent>
            </Card>
        </div>
    );
};
