"use client"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { columns, ChequeColumn } from "./columns"

interface ChequeClientProps {
    data: ChequeColumn[]
}

export const ChequeClient: React.FC<ChequeClientProps> = ({ data }) => {
    const router = useRouter()

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading 
                    title={`Chèques (${data.length})`}
                    description="Gérez vos chèques émis et reçus"
                />
                <Button onClick={() => router.push(`/treasury/cheques/new`)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter
                </Button>
            </div>
            <Separator />
            <DataTable columns={columns} data={data} searchKey="number" />
        </>
    )
}
