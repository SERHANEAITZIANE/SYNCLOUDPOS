import { auth } from "@/auth";
import { redirect } from "@/i18n/routing";
import { db } from "@/lib/db";
import { BarcodeLabelClient } from "./barcode-label-client";

export const metadata = {
    title: "Impression Étiquettes Code-barres | SYNCLOUDPOS",
    description: "Générez et imprimez des planches d'étiquettes code-barres pour vos produits",
};

export default async function BarcodeLabelPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const session = await auth();
    const { locale } = await params;

    if (!session) {
        redirect({ href: "/login", locale });
    }

    const tenantId = session.user?.tenantId;
    if (!tenantId) {
        redirect({ href: "/login", locale });
    }

    const products = await db.product.findMany({
        where: { tenantId, isArchived: false },
        include: { barcodes: true, category: true },
        orderBy: { name: "asc" },
    });

    const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, phone: true }
    });

    const serialized = products.map((p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        category: p.category?.name || "",
        barcodes: p.barcodes.map((b) => b.value),
    }));

    return (
        <BarcodeLabelClient 
            products={serialized} 
            tenantName={tenant?.name || ""} 
            tenantPhone={tenant?.phone || ""} 
        />
    );
}
