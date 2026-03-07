"use client";

import { useTranslations } from "next-intl";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, ArrowRight } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

interface CustomerReportProps {
    data: {
        id: string;
        name: string;
        phone: string;
        balance: number;
    }[];
}

export const CustomersReportClient: React.FC<CustomerReportProps> = ({ data }) => {
    const t = useTranslations();

    const totalCustomers = data.length;
    const totalDebt = data.reduce((acc, curr) => acc + Number(curr.balance), 0);
    const debtorsCount = data.filter(c => Number(c.balance) > 0).length;

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "name",
            header: "Nom",
        },
        {
            accessorKey: "phone",
            header: "Téléphone",
        },
        {
            accessorKey: "balance",
            header: "Dette (Solde)",
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("balance"));
                const formatted = new Intl.NumberFormat("fr-DZ", {
                    style: "currency",
                    currency: "DZD"
                }).format(amount);
                return (
                    <span className={amount > 0 ? "text-red-500 font-bold" : "text-green-600 font-bold"}>
                        {formatted}
                    </span>
                );
            }
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <Button asChild variant="ghost" size="sm">
                    <Link href={`/dashboard/customers/${row.original.id}/ledger`}>
                        Voir Détails <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                </Button>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Heading
                    title="Balance Clients"
                    description="Suivi détaillé des dettes et créances de vos clients."
                />
            </div>
            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                        <Users className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalCustomers}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Clients Endettés</CardTitle>
                        <Users className="w-4 h-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{debtorsCount}</div>
                    </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-900/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-red-600">Dette Globale</CardTitle>
                        <CreditCard className="w-4 h-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {new Intl.NumberFormat("fr-DZ", { style: "currency", currency: "DZD" }).format(totalDebt)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Détail des soldes</CardTitle>
                </CardHeader>
                <CardContent>
                    <DataTable  exportTitle={"Balance Clients"} exportDescription={"Suivi détaillé des dettes et créances de vos clients."} searchKey="name" columns={columns} data={data} />
                </CardContent>
            </Card>
        </div>
    );
};
