"use client"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { columns, TransferColumn } from "./columns"

interface TransferClientProps {
    data: TransferColumn[]
}

export const TransferClient: React.FC<TransferClientProps> = ({ data }) => {
    const router = useRouter()

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading 
                    title={`Transferts (${data.length})`}
                    description="Gérez les transferts de stock entre vos dépôts"
                />
                <Button onClick={() => router.push(`/transfers/new`)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau Transfert
                </Button>
            </div>
            <Separator />
            <DataTable columns={columns} data={data} searchKey="reference" />
        </>
    )
}
