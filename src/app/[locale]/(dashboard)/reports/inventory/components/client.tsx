"use client";

import { useTranslations } from "next-intl";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageX, TrendingUp, Archive, ArrowUpDown } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";

interface InventoryReportProps {
    data: {
        id: string;
        name: string;
        stock: number;
        minStock: number;
        cost: number;
        price: number;
        category: string;
        brand: string;
    }[];
}

export const InventoryReportClient: React.FC<InventoryReportProps> = ({ data }) => {
    const t = useTranslations();
    const [hideZeroStock, setHideZeroStock] = useState(false);
    const [brandFilter, setBrandFilter] = useState("ALL");
    const [categoryFilter, setCategoryFilter] = useState("ALL");

    // Extract unique brands and categories for the filters
    const brands = useMemo(() => Array.from(new Set(data.map(p => p.brand))).filter(Boolean).sort(), [data]);
    const categories = useMemo(() => Array.from(new Set(data.map(p => p.category))).filter(Boolean).sort(), [data]);

    // Apply Client-Side Filters
    const filteredData = useMemo(() => {
        return data.filter(p => {
            if (hideZeroStock && p.stock <= 0) return false;
            if (brandFilter !== "ALL" && p.brand !== brandFilter) return false;
            if (categoryFilter !== "ALL" && p.category !== categoryFilter) return false;
            return true;
        });
    }, [data, hideZeroStock, brandFilter, categoryFilter]);

    // High-level values calculation based on visible data
    const validStock = data.filter(p => p.stock > 0);
    const totalCostValue = validStock.reduce((acc, curr) => acc + (curr.stock * curr.cost), 0);
    const totalRetailValue = validStock.reduce((acc, curr) => acc + (curr.stock * curr.price), 0);

    // Low stock strictly on all items
    const lowStockItems = data.filter(p => p.stock <= p.minStock);

    const formatter = new Intl.NumberFormat("fr-DZ", {
        style: "currency",
        currency: "DZD"
    });

    // Calculate totals for the filtered data specifically to show in the footer
    const currentTableCost = filteredData.reduce((acc, curr) => acc + (Math.max(0, curr.stock) * curr.cost), 0);
    const currentTableRetail = filteredData.reduce((acc, curr) => acc + (Math.max(0, curr.stock) * curr.price), 0);

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "name",
            header: "Produit",
        },
        {
            accessorKey: "category",
            header: "Famille",
        },
        {
            accessorKey: "brand",
            header: "Marque",
        },
        {
            accessorKey: "stock",
            header: ({ column }) => {
                return (
                    <Button variant="ghost" className="px-0 font-bold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                        Quantité
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <span className="font-bold">{row.original.stock}</span>
                    {row.original.stock <= 0 && <Badge variant="destructive">Rupture</Badge>}
                </div>
            )
        },
        {
            accessorKey: "cost",
            header: "Prix Achat",
            cell: ({ row }) => formatter.format(row.original.cost)
        },
        {
            id: "totalCost",
            header: "Montant Achat",
            cell: ({ row }) => {
                const total = row.original.cost * Math.max(0, row.original.stock);
                return <span className="font-medium text-muted-foreground">{formatter.format(total)}</span>
            }
        },
        {
            accessorKey: "price",
            header: "Prix Vente",
            cell: ({ row }) => formatter.format(row.original.price)
        },
        {
            id: "totalPrice",
            header: "Montant Vente",
            cell: ({ row }) => {
                const total = row.original.price * Math.max(0, row.original.stock);
                return <span className="font-bold text-blue-600 dark:text-blue-400">{formatter.format(total)}</span>
            }
        }
    ];

    const totalsFooter = (
        <TableRow>
            <TableCell colSpan={5} className="text-right text-lg font-bold">Totaux des produits affichés</TableCell>
            <TableCell className="text-lg font-bold text-muted-foreground">{formatter.format(currentTableCost)}</TableCell>
            <TableCell></TableCell>
            <TableCell className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatter.format(currentTableRetail)}</TableCell>
        </TableRow>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Heading
                    title="État du Stock & Inventaire"
                    description="Visualisation complète de votre inventaire avec filtres, valorisation et contrôle des ruptures."
                />
            </div>
            <Separator />

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Valeur d'Achat (Coût global)</CardTitle>
                        <Archive className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatter.format(totalCostValue)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Capital immobilisé de tout le stock</p>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600">Valeur de Revente ( globale )</CardTitle>
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {formatter.format(totalRetailValue)}
                        </div>
                        <p className="text-xs text-blue-600/80 mt-1">Chiffre d'affaires potentiel</p>
                    </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-red-600">Produits en Alerte</CardTitle>
                        <PackageX className="w-4 h-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {lowStockItems.length}
                        </div>
                        <p className="text-xs text-red-600/80 mt-1">Produits sous leur seuil minimum</p>
                    </CardContent>
                </Card>
            </div>

            {/* Custom Filters */}
            <div className="flex flex-wrap items-end gap-4 bg-muted/50 p-4 rounded-xl border">
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Famille</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[180px] bg-background">
                            <SelectValue placeholder="Toutes les familles" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Toutes les familles</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Marque</Label>
                    <Select value={brandFilter} onValueChange={setBrandFilter}>
                        <SelectTrigger className="w-[180px] bg-background">
                            <SelectValue placeholder="Toutes les marques" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Toutes les marques</SelectItem>
                            {brands.map(brand => (
                                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center space-x-2 bg-background p-2.5 px-4 rounded-md border shadow-sm ml-auto">
                    <Switch
                        id="hide-null"
                        checked={hideZeroStock}
                        onCheckedChange={setHideZeroStock}
                    />
                    <Label htmlFor="hide-null" className="font-semibold cursor-pointer">
                        Cacher le stock nul (0)
                    </Label>
                </div>
            </div>

            {/* Main Data Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b">
                    <CardTitle className="text-lg">Détails de l'Inventaire ({filteredData.length} produits affichés)</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <DataTable
                        searchKey="name"
                        columns={columns}
                        data={filteredData}
                        showPagination={false}
                        footerRow={totalsFooter}
                    />
                </CardContent>
            </Card>
        </div>
    );
};
