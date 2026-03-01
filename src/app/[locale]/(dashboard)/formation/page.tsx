import { getTranslations } from "next-intl/server"
import { FormationClient } from "./components/formation-client"

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
    const t = await getTranslations({ locale, namespace: "dashboard" })
    return {
        title: `Formation ERP | SyncCloud POS`,
    }
}

export default async function FormationPage() {
    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <FormationClient />
            </div>
        </div>
    )
}
