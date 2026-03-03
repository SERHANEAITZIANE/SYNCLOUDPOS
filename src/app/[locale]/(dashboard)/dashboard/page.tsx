import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { getAnalyticsData } from "@/actions/analytics";
import { AnalyticsClient } from "../analytics/components/client";

export default async function DashboardPage() {
    const t = await getTranslations("Dashboard");
    const session = await auth();
    if (!session || !session.user) {
        return null;
    }

    let analyticsData = null;
    let hasError = false;

    try {
        analyticsData = await getAnalyticsData();
    } catch (error) {
        console.error("Dashboard error:", error);
        hasError = true;
    }

    return (
        <div className="flex-col animate-in fade-in duration-700 slide-in-from-bottom-4">
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-4 md:pt-6">
                {hasError ? (
                    <div className="p-8">
                        <h1 className="text-2xl font-bold mb-4">{t("messages.title")}</h1>
                        <div className="p-4 text-red-500 border border-red-200 rounded-md bg-red-50">
                            <h2 className="font-bold">{t("messages.errorTitle")}</h2>
                            <p>{t("messages.errorMessage")}</p>
                        </div>
                    </div>
                ) : analyticsData ? (
                    <AnalyticsClient data={analyticsData} />
                ) : null}
            </div>
        </div>
    );
}
