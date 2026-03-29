import { auth } from "@/auth";
import { redirect } from "@/i18n/routing";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PurchaseOrderPrintClient } from "./print-client";

export default async function PurchaseOrderPrintPage({
    params,
}: {
    params: Promise<{ locale: string; id: string }>;
}) {
    const session = await auth();
    const { locale, id } = await params;

    if (!session) {
        redirect({ href: "/login", locale });
    }

    const tenantId = session.user?.tenantId;
    if (!tenantId) {
        redirect({ href: "/login", locale });
    }

    const po = await db.purchaseOrder.findUnique({
        where: { id, tenantId },
        include: {
            supplier: true,
            items: { include: { product: true } },
            store: true,
        },
    });

    if (!po) return notFound();

    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });

    return (
        <PurchaseOrderPrintClient
            po={JSON.parse(JSON.stringify(po))}
            tenant={JSON.parse(JSON.stringify(tenant))}
        />
    );
}
