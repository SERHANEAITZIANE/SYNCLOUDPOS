import { getPaymentAgingReport } from "@/actions/aging-report";
import { AgingReportClient } from "./components/client";

export default async function AgingReportPage() {
    const response = await getPaymentAgingReport();
    const data = response.data || [];

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <AgingReportClient data={data} />
            </div>
        </div>
    );
}
