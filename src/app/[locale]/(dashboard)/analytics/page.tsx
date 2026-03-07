
import { getAnalyticsData } from "@/actions/analytics"
import { AnalyticsClient } from "./components/client"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

const AnalyticsPage = async ({
    searchParams
}: {
    searchParams: { from?: string; to?: string }
}) => {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "MANAGER" && session?.user?.role !== "ACCOUNTANT" && !session?.user?.isSuperadmin) {
        redirect("/dashboard")
    }

    let analyticsData = null
    let errorMessage: string | null = null

    try {
        const fromDate = searchParams.from ? new Date(searchParams.from) : undefined;
        const toDate = searchParams.to ? new Date(searchParams.to) : undefined;

        analyticsData = await getAnalyticsData(
            fromDate && toDate ? { from: fromDate, to: toDate } : undefined
        )
    } catch (error) {
        console.error("Failed to load analytics data:", error)
        errorMessage = error instanceof Error ? error.message : "Unknown error"
    }

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                {errorMessage ? (
                    <div className="p-4 text-red-500 border border-red-200 rounded-md">
                        <h2 className="text-lg font-bold">Error loading analytics</h2>
                        <p>Something went wrong while fetching data. Please try again later.</p>
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                            {errorMessage}
                        </pre>
                    </div>
                ) : analyticsData ? (
                    <AnalyticsClient
                        data={analyticsData}
                        initialDateRange={searchParams.from && searchParams.to ? {
                            from: new Date(searchParams.from),
                            to: new Date(searchParams.to)
                        } : undefined}
                    />
                ) : null}
            </div>
        </div>
    )
}

export default AnalyticsPage
