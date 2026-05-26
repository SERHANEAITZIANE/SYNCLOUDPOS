import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { ReconciliationClient } from "./components/client"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function ReconciliationPage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <Heading title="Rapprochement Bancaire" description="Importez vos relevés bancaires (CSV) pour rapprocher vos écritures." />
                <Separator />
                <ReconciliationClient />
            </div>
        </div>
    )
}
