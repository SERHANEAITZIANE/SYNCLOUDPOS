import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// GET /api/mobile/gerant/cheques — Cheque list from native Cheque model
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }

        const tenantId = user.tenantId;

        // Fetch cheques directly from native Cheque model
        const chequeRecords = await db.cheque.findMany({
            where: {
                tenantId,
            },
            include: {
                account: { select: { name: true } },
                customer: { select: { name: true, phone: true } },
                supplier: { select: { name: true } },
            },
            orderBy: { dueDate: "desc" },
            take: 100,
        });

        const now = new Date();

        const cheques = chequeRecords.map((chq: any) => {
            const isReceived = chq.type === "RECEIVED";
            const dueDate = new Date(chq.dueDate);
            const daysUntilMaturity = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            // Determine status
            let status: "en_attente" | "encaissé" | "rejeté" | "annulé" = "en_attente";
            if (chq.status === "CLEARED") {
                status = "encaissé";
            } else if (chq.status === "BOUNCED") {
                status = "rejeté";
            } else if (chq.status === "CANCELLED") {
                status = "annulé";
            }

            const formatDate = (d: Date) => d.toLocaleDateString("fr-FR");
            const counterparty = isReceived
                ? (chq.customer?.name || "Client")
                : (chq.supplier?.name || "Fournisseur");

            return {
                id: chq.id,
                type: isReceived ? "reçu" : "émis",
                number: chq.number || `CHQ-${chq.id.slice(-5).toUpperCase()}`,
                bank: chq.bank || chq.account?.name || "Banque",
                amount: Math.round(Number(chq.amount || 0)),
                issuerOrBeneficiary: counterparty,
                issueDate: formatDate(new Date(chq.createdAt)),
                maturityDate: formatDate(dueDate),
                daysUntilMaturity,
                status,
                phone: chq.customer?.phone || null,
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
            rejeté: "BOUNCED",
            annulé: "CANCELLED",
            en_attente: "PENDING",
        };

        const updated = await db.cheque.update({
            where: { id },
            data: { status: statusMap[status] || "PENDING" },
        });

        return NextResponse.json({ success: true, id: updated.id });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
