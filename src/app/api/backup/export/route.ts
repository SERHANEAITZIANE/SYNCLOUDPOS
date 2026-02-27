import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // @ts-expect-error custom property
        if (session.user.role !== "ADMIN" && !session.user.isSuperadmin) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const currentUser = await db.user.findUnique({
            where: { id: session.user.id },
            select: { tenantId: true }
        });

        if (!currentUser?.tenantId) {
            return new NextResponse("No tenant found", { status: 404 });
        }

        const tenantId = currentUser.tenantId;

        // Fetch all relevant data for the tenant
        // Notice we do NOT include TenantUsers and other meta tables to prevent logic breaking
        // on restoration or locking users out
        const tenantData = await db.tenant.findUnique({
            where: { id: tenantId },
            include: {
                categories: true,
                brands: true,
                products: {
                    include: {
                        images: true,
                        barcodes: true
                    }
                },
                customers: true,
                suppliers: true,
                expenseCategories: true,
                expenses: true,
                treasuryAccounts: true,
                treasuryTransactions: true,
                salesOrders: {
                    include: { items: true }
                },
                purchaseOrders: {
                    include: { items: true }
                },
                orders: {
                    include: { items: true }
                }
            }
        });

        if (!tenantData) {
            return new NextResponse("Tenant data not found", { status: 404 });
        }

        return NextResponse.json(tenantData);
    } catch (error) {
        console.error("[BACKUP_EXPORT_ERROR]", error);
        return new NextResponse("Internal server error", { status: 500 });
    }
}
