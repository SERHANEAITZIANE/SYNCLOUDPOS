"use client";

import { useTranslations } from "next-intl";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Truck, FileOutput } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

interface PurchasesReportProps {
    totalPurchasesValue: number;
    totalSupplierDebt: number;
    purchaseOrders: {
        id: string;
        date: string;
        supplier: string;
        total: number;
        status: string;
    }[];
}

export const PurchasesReportClient: React.FC<PurchasesReportProps> = ({
    totalPurchasesValue,
    totalSupplierDebt,
    purchaseOrders
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
            cell: ({ row }) => format(new Date(row.original.date), "dd/MM/yyyy")
        },
        {
            accessorKey: "supplier",
            header: "Fournisseur",
        },
        {
            accessorKey: "status",
            header: "Statut de la Facture",
        },
        {
            accessorKey: "total",
            header: "Montant",
            cell: ({ row }) => <span className="font-bold">{formatter.format(row.original.total)}</span>
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Heading
                    title="Rapport des Achats"
                    description="Suivi de vos dépenses fournisseurs et de l'historique d'approvisionnement."
                />
            </div>
            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Volume Total des Achats</CardTitle>
                        <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatter.format(totalPurchasesValue)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Dépenses globales d'approvisionnement</p>
                    </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-900/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-red-600">Dettes Fournisseurs (A Payer)</CardTitle>
                        <FileOutput className="w-4 h-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {formatter.format(totalSupplierDebt)}
                        </div>
                        <p className="text-xs text-red-600/80 mt-1">Montant total restant à régler à vos fournisseurs</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Truck className="w-5 h-5" /> Historique des Commandes d'Achat
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <DataTable  exportTitle={"Rapport des Achats"} exportDescription={"Suivi de vos dépenses fournisseurs et de l'historique d'approvisionnement."} searchKey="supplier" columns={columns} data={purchaseOrders} />
                </CardContent>
            </Card>
        </div>
    );
};
