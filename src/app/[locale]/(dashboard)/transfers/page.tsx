import { getTransfers } from "@/actions/transfers"
import { TransferClient } from "./components/client"
import { TransferColumn } from "./components/columns"

export default async function TransfersPage() {
    const { data, error } = await getTransfers()

    if (error || !data) {
        return <div className="p-8">Erreur de chargement des transferts</div>
    }

    const formattedData: TransferColumn[] = data.map((item: any) => ({
        id: item.id,
        reference: item.reference,
        fromStore: item.fromStore?.name || "N/A",
        toStore: item.toStore?.name || "N/A",
        status: item.status,
        createdBy: item.createdBy?.name || "N/A",
        createdAt: item.createdAt
    }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <TransferClient data={formattedData} />
            </div>
        </div>
    )
}
