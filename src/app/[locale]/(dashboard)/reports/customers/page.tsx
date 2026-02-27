import { getCustomers } from "@/actions/customers";
import { CustomersReportClient } from "./components/client";

export default async function CustomersReportPage() {
    const { customers } = await getCustomers();

    const formattedData = ((customers as any) || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        phone: item.phone || "-",
        balance: Number(item.balance || 0),
    })).sort((a: any, b: any) => b.balance - a.balance); // Sort by highest debt first

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <CustomersReportClient data={formattedData} />
            </div>
        </div>
    );
}
