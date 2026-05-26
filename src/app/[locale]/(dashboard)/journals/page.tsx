import { getTreasuryAccounts } from "@/actions/treasury"
import JournalsClient from "./journals-client"

export default async function JournalsPage() {
    const accounts = await getTreasuryAccounts()
    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <JournalsClient accounts={accounts} />
            </div>
        </div>
    )
}
