import { ReportsClient } from "./components/client"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

const ReportsPage = async () => {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "MANAGER" && session?.user?.role !== "ACCOUNTANT" && !session?.user?.isSuperadmin) {
        redirect("/dashboard")
    }

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <ReportsClient />
            </div>
        </div>
    )
}

export default ReportsPage
