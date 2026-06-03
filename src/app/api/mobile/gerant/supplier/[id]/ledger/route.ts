import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// GET /api/mobile/gerant/supplier/[id]/ledger — Supplier account statement
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
        const { id: supplierId } = await params;
        const { searchParams } = new URL(req.url);
        const fromStr = searchParams.get("from");
        const toStr = searchParams.get("to");

        // Fetch supplier + all related data
        const [supplier, purchases, supplierReturns, cheques] = await Promise.all([
            db.supplier.findFirst({
                where: { id: supplierId, tenantId },
                select: { id: true, name: true, phone: true, balance: true, createdAt: true },
            }),
            db.purchaseOrder.findMany({
                where: { tenantId, supplierId },
                select: { id: true, createdAt: true, total: true, status: true },
            }),
            db.supplierReturn.findMany({
                where: { tenantId, supplierId },
                select: {
                    id: true, createdAt: true, totalAmount: true,
                    returnType: true, quantity: true,
                    product: { select: { name: true } },
                },
            }),
            db.cheque.findMany({
                where: { tenantId, supplierId },
                select: { id: true },
            }),
        ]);

        if (!supplier) {
            return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });
        }

        // Fetch treasury transactions
        const purchaseIds = purchases.map(p => p.id);
        const chequeIds = cheques.map(c => c.id);
        const referenceIds = [supplierId, ...purchaseIds, ...chequeIds];

        const treasuryTxs = await db.treasuryTransaction.findMany({
            where: { tenantId, referenceId: { in: referenceIds } },
            select: {
                id: true, date: true, amount: true,
                description: true, source: true, type: true, referenceId: true,
            },
        });

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

        // Purchases (debits - increases what we owe)
        for (const purchase of purchases) {
            let label = "Achat";
            let debitValue = Number(purchase.total);

            if (purchase.status === "BON_LIVRAISON") label = "Bon de Réception";
            else if (purchase.status === "FACTURE") label = "Facture Achat";
            else if (purchase.status === "PENDING") label = "Achat en attente";
            else if (purchase.status === "CANCELLED") { label = "Achat Annulé"; debitValue = 0; }
            else if (purchase.status === "COMPLETED") label = "Achat Complété";

            rawLines.push({
                date: purchase.createdAt.toISOString(),
                type: "DEBIT",
                debit: debitValue,
                credit: 0,
                observation: `${label} N°: ${purchase.id.substring(0, 8)}`,
                category: "PURCHASE",
            });
        }

        // Treasury transactions
        for (const tx of treasuryTxs) {
            if (tx.type === "DEBIT") {
                // Money leaving our treasury => Payment to supplier
                rawLines.push({
                    date: tx.date.toISOString(),
                    type: "CREDIT",
                    debit: 0,
                    credit: Number(tx.amount),
                    observation: tx.description || "Paiement envoyé",
                    category: "PAYMENT",
                });
            } else if (tx.type === "CREDIT") {
                // Money entering our treasury => Loan from supplier
                rawLines.push({
                    date: tx.date.toISOString(),
                    type: "DEBIT",
                    debit: Number(tx.amount),
                    credit: 0,
                    observation: tx.description || "Emprunt Fournisseur",
                    category: "LOAN",
                });
            }
        }

        // Supplier returns (credits - decreases what we owe)
        for (const ret of supplierReturns) {
            rawLines.push({
                date: ret.createdAt.toISOString(),
                type: "CREDIT",
                debit: 0,
                credit: Number(ret.totalAmount),
                observation: `Retour: ${ret.product?.name || "Produit"} (Qté: ${ret.quantity})`,
                category: "RETURN",
            });
        }

        // Calculate initial balance
        const totalDebits = rawLines.reduce((s, l) => s + l.debit, 0);
        const totalCredits = rawLines.reduce((s, l) => s + l.credit, 0);
        const currentBalance = Number(supplier.balance);
        const initialBalance = currentBalance - totalDebits + totalCredits;

        // Sort by date
        rawLines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Apply date filter
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
                date: supplier.createdAt.toISOString(),
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
            supplier: {
                id: supplier.id,
                name: supplier.name,
                phone: supplier.phone,
                currentBalance: Math.round(currentBalance),
            },
            summary: {
                initialBalance: Math.round(initialBalance),
                totalAchats: Math.round(totalDebits),
                totalPaiements: Math.round(totalCredits),
                currentBalance: Math.round(currentBalance),
                transactionCount: filteredLines.length,
            },
            ledger,
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
