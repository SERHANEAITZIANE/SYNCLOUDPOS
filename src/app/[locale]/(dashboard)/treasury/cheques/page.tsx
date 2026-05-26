import { getCheques } from "@/actions/cheques"
import { ChequeClient } from "./components/client"
import { ChequeColumn } from "./components/columns"
import { formatter } from "@/lib/utils"

export default async function ChequesPage() {
    const { data, error } = await getCheques()

    if (error || !data) {
        return <div className="p-8">Erreur de chargement des chèques</div>
    }

    const formattedData: ChequeColumn[] = data.map((item: any) => ({
        id: item.id,
        number: item.number,
        bank: item.bank,
        amount: formatter.format(Number(item.amount)),
        dueDate: item.dueDate,
        status: item.status,
        type: item.type,
        partyName: item.customer?.name || item.supplier?.name || "N/A"
    }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <ChequeClient data={formattedData} />
            </div>
        </div>
    )
}
