import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// GET /api/mobile/gerant/client/[id]/ledger — Client account statement
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = requireMobileAuth(req);

        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }

        const tenantId = user.tenantId;
        const { id: customerId } = await params;
        const { searchParams } = new URL(req.url);
        const fromStr = searchParams.get("from");
        const toStr = searchParams.get("to");

        // Verify customer exists
        const customer = await db.customer.findFirst({
            where: { id: customerId, tenantId },
            select: { id: true, name: true, phone: true, balance: true, createdAt: true },
        });

        if (!customer) {
            return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
        }

        // Fetch all related data in parallel
        const [allSalesOrders, invoices, cheques, customerOrders, clientReturns] = await Promise.all([
            db.salesOrder.findMany({
                where: { tenantId, customerId },
                select: {
                    id: true, createdAt: true, total: true,
                    receiptNumber: true, type: true, status: true,
                },
            }),
            db.invoice.findMany({
                where: { tenantId, customerId },
                select: { id: true },
            }),
            db.cheque.findMany({
                where: { tenantId, customerId },
                select: { id: true },
            }),
            db.order.findMany({
                where: { tenantId, customerId },
                select: { id: true },
            }),
            db.productReturn.findMany({
                where: { tenantId, customerId },
                select: {
                    id: true, createdAt: true, totalAmount: true,
                    returnType: true,
                    product: { select: { name: true } },
                },
            }),
        ]);

        const sales = allSalesOrders.filter(so => ["VALIDATED", "PAID"].includes(so.status));
        const referenceIds = [
            customerId,
            ...customerOrders.map(o => o.id),
            ...allSalesOrders.map(so => so.id),
            ...invoices.map(i => i.id),
            ...cheques.map(c => c.id),
        ];

        // Fetch treasury transactions
        const [credits, debits] = await Promise.all([
            db.treasuryTransaction.findMany({
                where: { tenantId, type: "CREDIT", referenceId: { in: referenceIds } },
                select: { id: true, date: true, amount: true, description: true, source: true, referenceId: true },
            }),
            db.treasuryTransaction.findMany({
                where: { tenantId, type: "DEBIT", referenceId: { in: referenceIds } },
                select: { id: true, date: true, amount: true, description: true, source: true, referenceId: true },
            }),
        ]);

        // Build ledger lines
        type LedgerLine = {
            date: string;
            type: string;
            debit: number;
            credit: number;
            balance: number;
            observation: string;
            category: string;
        };

        const rawLines: Omit<LedgerLine, "balance">[] = [];

        // Sales (debits)
        for (const sale of sales) {
            const isCreditNote = sale.type === "CREDIT_NOTE";
            let label = "Vente";
            if (sale.type === "INVOICE") label = "Facture";
            else if (sale.type === "CREDIT_NOTE") label = "Avoir";
            else if (sale.type === "QUOTE") continue;
            rawLines.push({
                date: sale.createdAt.toISOString(),
                type: isCreditNote ? "CREDIT" : "DEBIT",
                debit: isCreditNote ? 0 : Number(sale.total),
                credit: isCreditNote ? Number(sale.total) : 0,
                observation: `${label} N°: ${sale.receiptNumber || "-"}`,
                category: isCreditNote ? "RETURN" : "SALE",
            });
        }

        // Loans given (debits)
        for (const loan of debits) {
            rawLines.push({
                date: loan.date.toISOString(),
                type: "DEBIT",
                debit: Number(loan.amount),
                credit: 0,
                observation: loan.description || "Emprunt accordé",
                category: "LOAN",
            });
        }

        // Payments received (credits)
        for (const pay of credits) {
            rawLines.push({
                date: pay.date.toISOString(),
                type: "CREDIT",
                debit: 0,
                credit: Number(pay.amount),
                observation: pay.description || "Paiement",
                category: "PAYMENT",
            });
        }

        // Client returns (credits)
        for (const ret of clientReturns) {
            const isCash = ret.returnType === "CASH";
            rawLines.push({
                date: ret.createdAt.toISOString(),
                type: "CREDIT",
                debit: 0,
                credit: isCash ? 0 : Number(ret.totalAmount),
                observation: `Retour: ${ret.product?.name || "Produit"} (${isCash ? "Remboursé" : "Crédité"})`,
                category: "RETURN",
            });
        }

        // Calculate initial balance
        const totalDebits = rawLines.reduce((s, l) => s + l.debit, 0);
        const totalCredits = rawLines.reduce((s, l) => s + l.credit, 0);
        const currentBalance = Number(customer.balance);
        const initialBalance = currentBalance - totalDebits + totalCredits;

        // Sort by date
        rawLines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Apply date filter if provided
        let filteredLines = rawLines;
        if (fromStr) {
            const from = new Date(fromStr);
            filteredLines = filteredLines.filter(l => new Date(l.date) >= from);
        }
        if (toStr) {
            const to = new Date(toStr);
            to.setHours(23, 59, 59, 999);
            filteredLines = filteredLines.filter(l => new Date(l.date) <= to);
        }

        // Build running balance
        let balance = initialBalance;
        const ledger: LedgerLine[] = [
            {
                date: customer.createdAt.toISOString(),
                type: "INITIAL",
                debit: 0,
                credit: 0,
                balance: Math.round(initialBalance),
                observation: "Solde Initial",
                category: "INITIAL",
            },
        ];

        for (const line of filteredLines) {
            balance += line.debit - line.credit;
            ledger.push({
                ...line,
                debit: Math.round(line.debit),
                credit: Math.round(line.credit),
                balance: Math.round(balance),
            });
        }

        return NextResponse.json({
            customer: {
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                currentBalance: Math.round(currentBalance),
            },
            summary: {
                initialBalance: Math.round(initialBalance),
                totalDebits: Math.round(totalDebits),
                totalCredits: Math.round(totalCredits),
                currentBalance: Math.round(currentBalance),
                transactionCount: filteredLines.length,
            },
            ledger,
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
