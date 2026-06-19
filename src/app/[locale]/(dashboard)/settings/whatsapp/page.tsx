import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { WhatsappSettingsClient } from "./components/whatsapp-settings-client"

export default async function WhatsappSettingsPage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/sign-in")

    const tenant = await db.tenant.findUnique({
        where: { id: session.user.tenantId }
    })

    if (!tenant) redirect("/")

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <WhatsappSettingsClient initialData={tenant} />
            </div>
        </div>
    )
}
