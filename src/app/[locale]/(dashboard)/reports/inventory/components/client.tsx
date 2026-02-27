"use client";

import { useTranslations } from "next-intl";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageX, TrendingUp, Archive } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

interface InventoryReportProps {
    data: {
        id: string;
        name: string;
        stock: number;
        minStock: number;
        cost: number;
        price: number;
    }[];
}

export const InventoryReportClient: React.FC<InventoryReportProps> = ({ data }) => {
    const t = useTranslations();

    // Only count positive stock for valuation
    const validStock = data.filter(p => p.stock > 0);
    const totalCostValue = validStock.reduce((acc, curr) => acc + (curr.stock * curr.cost), 0);
    const totalRetailValue = validStock.reduce((acc, curr) => acc + (curr.stock * curr.price), 0);
    const potentialProfit = totalRetailValue - totalCostValue;

    const lowStockItems = data.filter(p => p.stock <= p.minStock);

    const formatter = new Intl.NumberFormat("fr-DZ", {
        style: "currency",
        currency: "DZD"
    });

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "name",
            header: "Produit",
        },
        {
            accessorKey: "stock",
            header: "Stock Actuel",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <span className="font-bold">{row.original.stock}</span>
                    {row.original.stock <= 0 && <Badge variant="destructive">Rupture</Badge>}
                </div>
            )
        },
        {
            accessorKey: "minStock",
            header: "Seuil d'Alerte",
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.minStock}</span>
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Heading
                    title="État du Stock & Inventaire"
                    description="Valorisation de votre inventaire et alertes de stock faible."
                />
            </div>
            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Valeur d'Achat (Coût)</CardTitle>
                        <Archive className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatter.format(totalCostValue)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Capital immobilisé en stock</p>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 dark:bg-blue-900/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600">Valeur de Revente</CardTitle>
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {formatter.format(totalRetailValue)}
                        </div>
                        <p className="text-xs text-blue-600/80 mt-1">Chiffre d'affaires potentiel</p>
                    </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-900/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-red-600">Produits en Alerte</CardTitle>
                        <PackageX className="w-4 h-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {lowStockItems.length}
                        </div>
                        <p className="text-xs text-red-600/80 mt-1">Produits sous le seuil minimum</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-red-200 shadow-sm">
                <CardHeader className="bg-red-50/50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/30">
                    <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                        <PackageX className="w-5 h-5" /> Ruptures et Alertes de Stock
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <DataTable searchKey="name" columns={columns} data={lowStockItems} searchPlaceholder="Filtrer les produits critiques..." />
                </CardContent>
            </Card>
        </div>
    );
};
