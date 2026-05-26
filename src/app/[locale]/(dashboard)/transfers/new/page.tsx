import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { TransferForm } from "./components/transfer-form"
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function NewTransferPage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")
    const tenantId = session.user.tenantId

    const stores = await db.store.findMany({ where: { tenantId }, select: { id: true, name: true } })
    const productsDb = await db.product.findMany({ 
        where: { tenantId }, 
        select: { 
            id: true, 
            name: true, 
            barcodes: {
                select: {
                    value: true
                }
            } 
        } 
    })
    const products = productsDb.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.barcodes[0]?.value || null
    }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <Heading title="Nouveau Transfert" description="Créer une nouvelle demande de transfert" />
                <Separator />
                <TransferForm stores={stores} products={products} />
            </div>
        </div>
    )
}
