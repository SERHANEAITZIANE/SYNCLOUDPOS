import { db } from "@/lib/db";
import { getActiveTenantId } from "@/actions/get-active-tenant";
import { TreasuryReportClient } from "./components/client";
import { redirect } from "next/navigation";

export default async function TreasuryReportPage() {
    const tenantId = await getActiveTenantId();

    if (!tenantId) {
        redirect("/login");
    }

    const accounts = await db.treasuryAccount.findMany({
        where: { tenantId }
    });

    const totalCash = accounts
        .filter(a => a.type === "CAISSE")
        .reduce((acc, curr) => acc + Number(curr.balance), 0);

    const totalBank = accounts
        .filter(a => a.type === "BANK")
        .reduce((acc, curr) => acc + Number(curr.balance), 0);

    const transactions = await db.treasuryTransaction.findMany({
        where: { tenantId },
        include: { account: true },
        orderBy: { date: "desc" },
        take: 500 // Limit history slightly for performance
    });

    const formattedTransactions = transactions.map(tx => ({
        id: tx.id,
        date: tx.date.toISOString(),
        account: tx.account.name,
        type: tx.type,
        amount: Number(tx.amount),
        description: tx.description || "-",
    }));

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <TreasuryReportClient
                    totalCash={totalCash}
                    totalBank={totalBank}
                    transactions={formattedTransactions}
                />
            </div>
        </div>
    );
}
