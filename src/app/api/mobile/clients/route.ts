import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// GET /api/mobile/clients — List clients for the tenant
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("q") || "";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");

        const where: any = { tenantId: user.tenantId };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { phone: { contains: search } },
                { address: { contains: search, mode: "insensitive" } },
                { city: { contains: search, mode: "insensitive" } },
            ];
        }

        const [clients, total] = await Promise.all([
            db.customer.findMany({
                where,
                select: {
                    id: true, name: true, phone: true, email: true,
                    address: true, city: true, balance: true, initialBalance: true,
                    nif: true, rc: true, nis: true, rib: true,
                    artImposition: true, clientType: true,
                    barcode: true, loyaltyPoints: true,
                    notes: true,
                },
                orderBy: { name: "asc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            db.customer.count({ where }),
        ]);

        return NextResponse.json({
            clients: clients.map(c => ({ ...c, balance: Number(c.balance), initialBalance: Number(c.initialBalance) })),
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}

// POST /api/mobile/clients — Create new client (prospection on field)
export async function POST(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);
        const body = await req.json();

        const { name, phone, address, city, notes, latitude, longitude } = body;
        if (!name) {
            return NextResponse.json({ error: "Nom du client requis" }, { status: 400 });
        }

        const client = await db.customer.create({
            data: {
                tenantId: user.tenantId,
                name,
                phone: phone || null,
                address: address || null,
                city: city || null,
                notes: notes ? `${notes}\n[GPS: ${latitude},${longitude}]` : (latitude ? `[GPS: ${latitude},${longitude}]` : null),
            },
        });

        return NextResponse.json({ ...client, balance: Number(client.balance), initialBalance: Number(client.initialBalance) }, { status: 201 });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
