"use client";

import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Clock, CalendarDays, History } from "lucide-react";

interface AgingReportClientProps {
    data: {
        id: string;
        name: string;
        totalDebt: number;
        bucket0_30: number;
        bucket30_60: number;
        bucket60_90: number;
        bucket90Plus: number;
    }[];
}

export const AgingReportClient: React.FC<AgingReportClientProps> = ({ data }) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("fr-DZ", {
            style: "currency",
            currency: "DZD"
        }).format(value);
    };

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "name",
            header: "Client",
        },
        {
            accessorKey: "bucket0_30",
            header: "0-30 Jours",
            cell: ({ row }) => <span className="text-gray-600">{formatCurrency(row.original.bucket0_30)}</span>
        },
        {
            accessorKey: "bucket30_60",
            header: "30-60 Jours",
            cell: ({ row }) => <span className="text-orange-500 font-medium">{formatCurrency(row.original.bucket30_60)}</span>
        },
        {
            accessorKey: "bucket60_90",
            header: "60-90 Jours",
            cell: ({ row }) => <span className="text-red-500 font-medium">{formatCurrency(row.original.bucket60_90)}</span>
        },
        {
            accessorKey: "bucket90Plus",
            header: "90+ Jours (Critique)",
            cell: ({ row }) => <span className="text-red-700 font-bold">{formatCurrency(row.original.bucket90Plus)}</span>
        },
        {
            accessorKey: "totalDebt",
            header: "Dette Totale",
            cell: ({ row }) => <span className="font-bold">{formatCurrency(row.original.totalDebt)}</span>
        }
    ];

    const total0_30 = data.reduce((acc, curr) => acc + curr.bucket0_30, 0);
    const total30_60 = data.reduce((acc, curr) => acc + curr.bucket30_60, 0);
    const total60_90 = data.reduce((acc, curr) => acc + curr.bucket60_90, 0);
    const total90Plus = data.reduce((acc, curr) => acc + curr.bucket90Plus, 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Heading
                    title="Balance Âgée des Clients"
                    description="Rapport sur le vieillissement des créances clients."
                />
            </div>
            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">0 - 30 Jours</CardTitle>
                        <Clock className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(total0_30)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">30 - 60 Jours</CardTitle>
                        <CalendarDays className="w-4 h-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-500">{formatCurrency(total30_60)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">60 - 90 Jours</CardTitle>
                        <History className="w-4 h-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">{formatCurrency(total60_90)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">90+ Jours</CardTitle>
                        <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700 dark:text-red-400">{formatCurrency(total90Plus)}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Détail par client</CardTitle>
                </CardHeader>
                <CardContent>
                    <DataTable 
                        exportTitle="Balance Agee" 
                        exportDescription="Rapport de vieillissement des creances" 
                        searchKey="name" 
                        columns={columns} 
                        data={data} 
                    />
                </CardContent>
            </Card>
        </div>
    );
};
