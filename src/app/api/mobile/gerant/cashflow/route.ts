import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        if (!["ADMIN", "MANAGER", "ACCOUNTANT"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }

        const tenantId = user.tenantId;

        // Get accounts to calculate current balance
        const accounts = await db.treasuryAccount.findMany({
            where: { tenantId }
        });
        const currentBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

        // Get transactions
        const transactions = await db.treasuryTransaction.findMany({
            where: { tenantId },
            include: {
                account: {
                    select: { name: true }
                }
            },
            orderBy: { date: "desc" },
            take: 100
        });

        const flows = transactions.map(t => {
            const isCredit = t.type === "CREDIT" || t.type === "INFLOW";
            return {
                id: t.id,
                label: t.description || t.source || "Transaction",
                date: t.date.toISOString(),
                amount: isCredit ? Number(t.amount) : -Number(t.amount),
                type: isCredit ? "in" : "out",
                category: t.source || "Système",
                probability: "certain", // Historical DB movements are certain
                accountName: t.account?.name || "Caisse"
            };
        });

        return NextResponse.json({
            currentBalance,
            flows
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
