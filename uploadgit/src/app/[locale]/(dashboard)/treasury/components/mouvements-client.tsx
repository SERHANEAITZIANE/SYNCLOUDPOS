"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns, TreasuryMovementColumn } from "./mouvements-columns"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"

interface MouvementsClientProps {
    data: TreasuryMovementColumn[]
}

export const MouvementsClient: React.FC<MouvementsClientProps> = ({
    data
}) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mt-8">
                <Heading
                    title={`Mouvements (${data.length})`}
                    description="Historique global de toutes les transactions de trésorerie"
                />
            </div>
            <Separator />
            <DataTable searchKey="description" columns={columns} data={data} />
        </div>
    )
}
