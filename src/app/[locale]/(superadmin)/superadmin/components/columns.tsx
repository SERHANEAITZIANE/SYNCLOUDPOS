"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

export type TenantColumn = {
    id: string;
    name: string;
    phone: string | null;
    subscriptionEndsAt: Date | null;
    isBlocked: boolean;
    createdAt: Date;
    ownerDetails: {
        name: string | null;
        email: string;
        phone: string | null;
    } | null;
    users: {
        id: string;
        name: string | null;
        email: string;
        phone: string | null;
        role: string;
        isSuperadmin: boolean;
    }[];
    usageStats?: {
        users: number;
        products: number;
        orders: number;
        totalRevenue: number;
    }
}

export const columns: ColumnDef<TenantColumn>[] = [
    {
        accessorKey: "name",
        header: "Nom de l'Espace (Tenant)",
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <span className="font-medium">{row.original.name}</span>
                {row.original.isBlocked && (
                    <Badge variant="destructive" className="text-[10px] h-5 px-1.5">BLOQUÉ</Badge>
                )}
            </div>
        )
    },
    {
        id: "owner",
        header: "Propriétaire",
        cell: ({ row }) => {
            const owner = row.original.ownerDetails;
            return owner ? (
                <div className="flex flex-col">
                    <span className="font-medium text-sm">{owner.name}</span>
                    <span className="text-xs text-muted-foreground">{owner.email}</span>
                </div>
            ) : "N/A"
        }
    },
    {
        id: "phones",
        header: "Téléphones",
        cell: ({ row }) => {
            const orgPhone = row.original.phone;
            const ownerPhone = row.original.ownerDetails?.phone;

            return (
                <div className="flex flex-col gap-1">
                    {orgPhone && <span className="text-xs break-keep whitespace-nowrap">Org: {orgPhone}</span>}
                    {ownerPhone && <span className="text-xs break-keep whitespace-nowrap">User: {ownerPhone}</span>}
                    {!orgPhone && !ownerPhone && <span className="text-xs text-muted-foreground">Aucun</span>}
                </div>
            )
        }
    },
    {
        id: "usage",
        header: "Utilisation",
        cell: ({ row }) => {
            const stats = row.original.usageStats;
            if (!stats) return <span className="text-xs text-muted-foreground">N/A</span>;
            return (
                <div className="flex flex-col gap-1 text-xs">
                    <span>U: {stats.users} | P: {stats.products}</span>
                    <span>Cmd: {stats.orders}</span>
                </div>
            )
        }
    },
    {
        id: "revenue",
        header: "Revenus",
        cell: ({ row }) => {
            const stats = row.original.usageStats;
            if (!stats) return <span className="text-xs text-muted-foreground">N/A</span>;
            return <div className="font-medium text-emerald-600">{stats.totalRevenue.toFixed(2)} DA</div>
        }
    },
    {
        accessorKey: "createdAt",
        header: "Date de création",
        cell: ({ row }) => format(row.original.createdAt, "dd/MM/yyyy")
    },
    {
        accessorKey: "subscriptionEndsAt",
        header: "Expiration",
        cell: ({ row }) => {
            const date = row.original.subscriptionEndsAt;
            if (!date) return <Badge variant="secondary">Inconnue</Badge>;

            const isExpired = new Date(date) < new Date();
            return (
                <Badge variant={isExpired ? "destructive" : "default"} className={!isExpired ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                    {format(new Date(date), "dd/MM/yyyy")}
                </Badge>
            )
        }
    },
    {
        id: "actions",
        cell: ({ row }) => <CellAction data={row.original} />
    }
]
