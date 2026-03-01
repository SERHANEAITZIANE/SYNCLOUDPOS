"use client";

import { useTranslations } from "next-intl";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarRange, CreditCard, DollarSign, Wallet } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

interface SalesReportProps {
    data: {
        id: string;
        date: string;
        customer: string;
        total: number;
        paid: number;
        debt: number;
    }[];
}

export const SalesReportClient: React.FC<SalesReportProps> = ({ data }) => {
    const t = useTranslations();

    const totalSales = data.reduce((acc, curr) => acc + curr.total, 0);
    const totalPaid = data.reduce((acc, curr) => acc + curr.paid, 0);
    const totalUnpaid = data.reduce((acc, curr) => acc + curr.debt, 0);

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
            accessorKey: "customer",
            header: "Client",
        },
        {
            accessorKey: "total",
            header: "Total",
            cell: ({ row }) => <span className="font-bold">{formatter.format(row.original.total)}</span>
        },
        {
            accessorKey: "paid",
            header: "Encaissé",
            cell: ({ row }) => <span className="text-green-600">{formatter.format(row.original.paid)}</span>
        },
        {
            accessorKey: "debt",
            header: "Reste (Dette)",
            cell: ({ row }) => {
                const debt = row.original.debt;
                return (
                    <span className={debt > 0 ? "text-red-500 font-bold" : ""}>
                        {formatter.format(debt)}
                    </span>
                );
            }
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Heading
                    title="Journal des Ventes"
                    description="Analyse des ventes, montants encaissés et restes à recouvrer."
                />
            </div>
            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Chiffre d'Affaires Global</CardTitle>
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatter.format(totalSales)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total des ventes (payées ou non)</p>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 dark:bg-green-900/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-green-600">Total Encaissé</CardTitle>
                        <Wallet className="w-4 h-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {formatter.format(totalPaid)}
                        </div>
                        <p className="text-xs text-green-600/80 mt-1">Argent réellement perçu</p>
                    </CardContent>
                </Card>
                <Card className="bg-orange-50 dark:bg-orange-900/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-orange-600">Reste à Recouvrer</CardTitle>
                        <CreditCard className="w-4 h-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {formatter.format(totalUnpaid)}
                        </div>
                        <p className="text-xs text-orange-600/80 mt-1">Dettes générées par ces ventes</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarRange className="w-5 h-5" /> Historique des Ventes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <DataTable searchKey="customer" columns={columns} data={data} />
                </CardContent>
            </Card>
        </div>
    );
};
