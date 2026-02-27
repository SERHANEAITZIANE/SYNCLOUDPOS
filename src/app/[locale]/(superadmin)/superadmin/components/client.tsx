"use client"

import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { DataTable } from "@/components/ui/data-table"
import { columns, TenantColumn } from "./columns"

interface SuperAdminClientProps {
    data: TenantColumn[]
}

export const SuperAdminClient: React.FC<SuperAdminClientProps> = ({ data }) => {
    return (
        <>
            <div className="flex items-center justify-between">
                <Heading
                    title={`Superadmin (${data.length})`}
                    description="Gérez tous les espaces abonnés et prolongez les accès."
                />
            </div>
            <Separator />
            <DataTable searchKey="name" columns={columns} data={data} />
        </>
    )
}
