import { getDailyCloses, computeDailyClose, saveDailyClose } from "@/actions/daily-close"
import { ClotureClient } from "./components/cloture-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Clôture de Caisse | SynCloudPOS",
    description: "Rapport de clôture journalière de la caisse"
}

export default async function CloturePage() {
    const history = await getDailyCloses(20)
    return (
        <div className="flex-col animate-in fade-in duration-700">
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-4 md:pt-6">
                <ClotureClient
                    history={history}
                    computeAction={computeDailyClose}
                    saveAction={saveDailyClose}
                />
            </div>
        </div>
    )
}
