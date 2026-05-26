import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { ChequeForm } from "./components/cheque-form"
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function NewChequePage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")
    const tenantId = session.user.tenantId

    const customers = await db.customer.findMany({ where: { tenantId }, select: { id: true, name: true } })
    const suppliers = await db.supplier.findMany({ where: { tenantId }, select: { id: true, name: true } })

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <Heading title="Nouveau Chèque" description="Ajouter un chèque émis ou reçu" />
                <Separator />
                <ChequeForm customers={customers} suppliers={suppliers} />
            </div>
        </div>
    )
}
