import { DisplayClient } from "./components/client"
import { getTranslations } from "next-intl/server"

export async function generateMetadata({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const t = await getTranslations({ locale, namespace: "Dashboard" })
    return {
        title: `Customer Display | SYNCLOUDPOS`,
        description: "Customer Display Screen for POS"
    }
}

export default async function DisplayPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    return (
        <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-900">
            <DisplayClient />
        </div>
    )
}
