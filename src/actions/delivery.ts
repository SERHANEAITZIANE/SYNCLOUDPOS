"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

const PROVIDERS: Record<string, { name: string; baseUrl: string }> = {
    YALIDINE: { name: "Yalidine", baseUrl: "https://api.yalidine.app/v1" },
    DHD: { name: "DHD Livraison", baseUrl: "https://app.dhd-dz.com/api" },
    HDD: { name: "HDD Express", baseUrl: "https://api.hdd-dz.com/v1" },
    PROCOLIS: { name: "Procolis", baseUrl: "https://procolis.com/api/v1" },
    ZR_EXPRESS: { name: "Zr Express", baseUrl: "https://www.zr-express.dz/api" },
}

/** Create a delivery shipment and send to the provider API */
export async function createDeliveryShipment(data: {
    provider: string
    customerName: string
    customerPhone: string
    customerAddress: string
    wilaya: string
    commune?: string
    weight: number
    codAmount: number
    salesOrderId?: string
    notes?: string
}) {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { yalidineApiId: true, yalidineApiToken: true, dhdApiToken: true, hddApiToken: true, name: true }
    })
    if (!tenant) return { error: "Tenant not found" }

    // Save shipment to DB first (so we always have a record)
    const shipment = await db.deliveryShipment.create({
        data: { tenantId, ...data, status: "PENDING" }
    })

    // Try to send to provider API
    let trackingCode: string | undefined
    let providerRef: string | undefined
    let apiError: string | undefined

    try {
        if (data.provider === "YALIDINE" && tenant.yalidineApiId && tenant.yalidineApiToken) {
            const res = await fetch(`${PROVIDERS.YALIDINE.baseUrl}/parcels/`, {
                method: "POST",
                headers: {
                    "X-API-ID": tenant.yalidineApiId,
                    "X-API-TOKEN": tenant.yalidineApiToken,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    firstname: data.customerName,
                    familyname: "",
                    contact_phone: data.customerPhone,
                    address: data.customerAddress,
                    to_wilaya_id: data.wilaya,
                    to_commune_id: data.commune || "",
                    product_list: data.notes || "Colis",
                    price: data.codAmount,
                    do_insurance: false,
                    declared_value: data.codAmount,
                    length: 0,
                    width: 0,
                    height: 0,
                    weight: data.weight,
                    freeshipping: data.codAmount === 0,
                    is_stopdesk: false,
                    has_exchange: false,
                })
            })
            if (res.ok) {
                const json = await res.json()
                trackingCode = json.tracking || json.parcel_id
                providerRef = json.id || json.parcel_id
            } else {
                apiError = `Yalidine: ${res.status}`
            }
        } else if (data.provider === "DHD" && tenant.dhdApiToken) {
            const res = await fetch(`${PROVIDERS.DHD.baseUrl}/colis`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${tenant.dhdApiToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    nom_client: data.customerName,
                    telephone: data.customerPhone,
                    adresse: data.customerAddress,
                    wilaya: data.wilaya,
                    commune: data.commune || "",
                    montant: data.codAmount,
                    poids: data.weight,
                    remarque: data.notes || ""
                })
            })
            if (res.ok) {
                const json = await res.json()
                trackingCode = json.tracking_code || json.numero
                providerRef = json.id || json.colis_id
            } else {
                apiError = `DHD: ${res.status}`
            }
        } else if (data.provider === "HDD" && tenant.hddApiToken) {
            const res = await fetch(`${PROVIDERS.HDD.baseUrl}/shipments`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${tenant.hddApiToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    recipient_name: data.customerName,
                    recipient_phone: data.customerPhone,
                    recipient_address: data.customerAddress,
                    wilaya: data.wilaya,
                    commune: data.commune || "",
                    cod_amount: data.codAmount,
                    weight: data.weight,
                    notes: data.notes || ""
                })
            })
            if (res.ok) {
                const json = await res.json()
                trackingCode = json.tracking_number
                providerRef = json.shipment_id
            } else {
                apiError = `HDD: ${res.status}`
            }
        }
    } catch (e) {
        apiError = "Network error contacting delivery API"
        console.error("[DELIVERY_API]", e)
    }

    // Update shipment with tracking info if obtained
    if (trackingCode || providerRef) {
        await db.deliveryShipment.update({
            where: { id: shipment.id },
            data: { trackingCode, providerRef, status: "SENT" }
        })
    }

    revalidatePath("/[locale]/(dashboard)/delivery", "page")
    return {
        success: true,
        id: shipment.id,
        trackingCode,
        apiError,
        status: trackingCode ? "SENT" : "PENDING"
    }
}

/** Get all delivery shipments for the current tenant */
export async function getDeliveryShipments(page = 1, pageSize = 50) {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { data: [], total: 0 }

    const [data, total] = await Promise.all([
        db.deliveryShipment.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: {
                salesOrder: { select: { id: true, receiptNumber: true } }
            }
        }),
        db.deliveryShipment.count({ where: { tenantId } })
    ]);

    return { data, total }
}

/** Update shipment status (e.g., DELIVERED, RETURNED) */
export async function updateShipmentStatus(id: string, status: string) {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    await db.deliveryShipment.update({
        where: { id, tenantId },
        data: { status }
    })

    revalidatePath("/[locale]/(dashboard)/delivery", "page")
    return { success: true }
}

/** Sync shipment statuses by polling delivery provider APIs */
export async function syncShipmentStatuses() {
    const session = await auth()
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { yalidineApiId: true, yalidineApiToken: true, dhdApiToken: true, hddApiToken: true }
    })
    if (!tenant) return { error: "Tenant not found" }

    // Get all active (non-terminal) shipments
    const shipments = await db.deliveryShipment.findMany({
        where: {
            tenantId,
            status: { in: ["PENDING", "SENT", "IN_TRANSIT"] },
            trackingCode: { not: null }
        }
    })

    let updated = 0
    let errors = 0

    // Process in batches of 5 to avoid overwhelming APIs
    const BATCH_SIZE = 5;
    for (let i = 0; i < shipments.length; i += BATCH_SIZE) {
        const batch = shipments.slice(i, i + BATCH_SIZE);
        
        const results = await Promise.allSettled(batch.map(async (shipment) => {
            let newStatus: string | undefined

            if (shipment.provider === "YALIDINE" && tenant.yalidineApiId && tenant.yalidineApiToken && shipment.trackingCode) {
                const res = await fetch(`${PROVIDERS.YALIDINE.baseUrl}/parcels/?tracking=${shipment.trackingCode}`, {
                    headers: {
                        "X-API-ID": tenant.yalidineApiId,
                        "X-API-TOKEN": tenant.yalidineApiToken,
                    },
                })
                if (res.ok) {
                    const json = await res.json()
                    const parcel = Array.isArray(json) ? json[0] : json
                    if (parcel) {
                        const statusMap: Record<string, string> = {
                            "En préparation": "PENDING",
                            "Expédié": "SENT",
                            "En cours de livraison": "IN_TRANSIT",
                            "Livré": "DELIVERED",
                            "Retourné": "RETURNED",
                            "Retour reçu": "RETURNED",
                        }
                        newStatus = statusMap[parcel.status] || parcel.status
                    }
                } else {
                    throw new Error(`Yalidine API error: ${res.status}`);
                }
            } else if (shipment.provider === "DHD" && tenant.dhdApiToken && shipment.providerRef) {
                const res = await fetch(`${PROVIDERS.DHD.baseUrl}/colis/${shipment.providerRef}`, {
                    headers: { "Authorization": `Bearer ${tenant.dhdApiToken}` },
                })
                if (res.ok) {
                    const json = await res.json()
                    const statusMap: Record<string, string> = {
                        "en_attente": "PENDING",
                        "expedie": "SENT",
                        "en_transit": "IN_TRANSIT",
                        "livre": "DELIVERED",
                        "retourne": "RETURNED",
                    }
                    newStatus = statusMap[json.statut || json.status] || json.statut
                } else {
                    throw new Error(`DHD API error: ${res.status}`);
                }
            } else if (shipment.provider === "HDD" && tenant.hddApiToken && shipment.providerRef) {
                const res = await fetch(`${PROVIDERS.HDD.baseUrl}/shipments/${shipment.providerRef}`, {
                    headers: { "Authorization": `Bearer ${tenant.hddApiToken}` },
                })
                if (res.ok) {
                    const json = await res.json()
                    const statusMap: Record<string, string> = {
                        "pending": "PENDING",
                        "shipped": "SENT",
                        "in_transit": "IN_TRANSIT",
                        "delivered": "DELIVERED",
                        "returned": "RETURNED",
                    }
                    newStatus = statusMap[json.status] || json.status
                } else {
                    throw new Error(`HDD API error: ${res.status}`);
                }
            }

            if (newStatus && newStatus !== shipment.status) {
                return { id: shipment.id, status: newStatus };
            }
            return null;
        }));

        const updates = results.filter(r => r.status === 'fulfilled' && r.value !== null).map(r => (r as any).value);
        const errs = results.filter(r => r.status === 'rejected');

        if (updates.length > 0) {
            // Prisma doesn't support bulk update with different values easily, but we can do a transaction of updates
            await db.$transaction(
                updates.map(u => db.deliveryShipment.update({
                    where: { id: u.id },
                    data: { status: u.status }
                }))
            );
            updated += updates.length;
        }
        errors += errs.length;
        for (const err of errs) {
            console.error(`[DELIVERY_SYNC] Error in batch:`, (err as any).reason);
        }
    }

    revalidatePath("/[locale]/(dashboard)/delivery", "page")
    return {
        success: true,
        total: shipments.length,
        updated,
        errors,
        message: `${updated} colis mis à jour sur ${shipments.length} vérifiés${errors > 0 ? ` (${errors} erreurs)` : ""}`
    }
}

