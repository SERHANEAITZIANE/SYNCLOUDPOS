import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// GET /api/mobile/gerant/cheques — Cheque list from treasury transactions
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }

        const tenantId = user.tenantId;

        // Fetch treasury transactions that are cheques (received and issued)
        const chequeTransactions = await db.treasuryTransaction.findMany({
            where: {
                tenantId,
                OR: [
                    { paymentMethod: "CHECK" },
                    { paymentMethod: "CHEQUE" },
                    { notes: { contains: "CHQ" } },
                    { notes: { contains: "chèque" } },
                    { notes: { contains: "cheque" } },
                ],
            },
            include: {
                account: { select: { name: true } },
                customer: { select: { name: true, phone: true } },
                supplier: { select: { name: true } },
            },
            orderBy: { date: "desc" },
            take: 100,
        });

        const now = new Date();

        const cheques = chequeTransactions.map((tx: any) => {
            const isReceived = tx.type === "CREDIT" || tx.type === "IN";
            const maturityDate = tx.maturityDate ? new Date(tx.maturityDate) : new Date(tx.date.getTime() + 30 * 24 * 60 * 60 * 1000);
            const daysUntilMaturity = Math.round((maturityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            // Determine status
            let status: "en_attente" | "encaissé" | "rejeté" | "annulé" = "en_attente";
            if (tx.status === "CLEARED" || tx.status === "COMPLETED" || tx.status === "PAID") {
                status = "encaissé";
            } else if (tx.status === "REJECTED" || tx.status === "BOUNCED") {
                status = "rejeté";
            } else if (tx.status === "CANCELLED" || tx.status === "VOIDED") {
                status = "annulé";
            } else if (maturityDate <= now && tx.status !== "PENDING") {
                status = "encaissé";
            }

            const formatDate = (d: Date) => d.toLocaleDateString("fr-FR");
            const counterparty = isReceived
                ? (tx.customer?.name || tx.supplier?.name || tx.description || "Client")
                : (tx.supplier?.name || tx.customer?.name || tx.description || "Fournisseur");

            return {
                id: tx.id,
                type: isReceived ? "reçu" : "émis",
                number: tx.reference || tx.checkNumber || `CHQ-${tx.id.slice(-5).toUpperCase()}`,
                bank: tx.bankName || tx.account?.name || "Banque",
                amount: Math.round(Number(tx.amount || 0)),
                issuerOrBeneficiary: counterparty,
                issueDate: formatDate(new Date(tx.date)),
                maturityDate: formatDate(maturityDate),
                daysUntilMaturity,
                status,
                phone: tx.customer?.phone || null,
            };
        });

        // Summary stats
        const totalReceivable = cheques
            .filter((c: any) => c.type === "reçu" && c.status === "en_attente")
            .reduce((s: number, c: any) => s + c.amount, 0);
        const totalPayable = cheques
            .filter((c: any) => c.type === "émis" && c.status === "en_attente")
            .reduce((s: number, c: any) => s + c.amount, 0);
        const urgentCount = cheques.filter((c: any) => c.status === "en_attente" && c.daysUntilMaturity <= 7).length;
        const rejectedCount = cheques.filter((c: any) => c.status === "rejeté").length;

        return NextResponse.json({
            cheques,
            summary: { totalReceivable, totalPayable, urgentCount, rejectedCount },
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}

// PATCH /api/mobile/gerant/cheques — Update cheque status
export async function PATCH(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }

        const { id, status } = await req.json();
        if (!id || !status) {
            return NextResponse.json({ error: "id et status requis" }, { status: 400 });
        }

        const statusMap: Record<string, string> = {
            encaissé: "CLEARED",
            rejeté: "REJECTED",
            annulé: "CANCELLED",
            en_attente: "PENDING",
        };

        const updated = await db.treasuryTransaction.update({
            where: { id },
            data: { status: statusMap[status] || "PENDING" },
        });

        return NextResponse.json({ success: true, id: updated.id });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
