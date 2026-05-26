import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/webhooks/delivery
 * 
 * Webhook endpoint for delivery providers (Yalidine, DHD, HDD) to call
 * when a shipment status changes. Each provider sends a different payload format.
 * 
 * Security: Uses a shared secret token per tenant (yalidineApiToken / dhdApiToken / hddApiToken)
 * to verify the request is legitimate.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const provider = req.headers.get("x-provider") || body.provider || ""

        let trackingCode: string | undefined
        let newStatus: string | undefined
        let providerRef: string | undefined
        let providedToken: string | undefined

        // ── Yalidine webhook format ──
        if (provider.toUpperCase() === "YALIDINE" || body.tracking) {
            trackingCode = body.tracking
            providerRef = body.parcel_id || body.id
            providedToken = req.headers.get("x-api-token") || req.headers.get("api-token") || body.api_token
            const statusMap: Record<string, string> = {
                "En préparation": "PENDING",
                "Expédié": "SENT",
                "En cours de livraison": "IN_TRANSIT",
                "Livré": "DELIVERED",
                "Retourné": "RETURNED",
                "Retour reçu": "RETURNED",
            }
            newStatus = statusMap[body.status] || body.status
        }

        // ── DHD webhook format ──
        else if (provider.toUpperCase() === "DHD" || body.tracking_code || body.numero) {
            trackingCode = body.tracking_code || body.numero
            providerRef = body.colis_id || body.id
            providedToken = req.headers.get("authorization")?.replace("Bearer ", "") || body.token
            const statusMap: Record<string, string> = {
                "en_attente": "PENDING",
                "expedie": "SENT",
                "en_transit": "IN_TRANSIT",
                "livre": "DELIVERED",
                "retourne": "RETURNED",
            }
            newStatus = statusMap[body.statut || body.status] || body.statut || body.status
        }

        // ── HDD webhook format ──
        else if (provider.toUpperCase() === "HDD" || body.tracking_number) {
            trackingCode = body.tracking_number
            providerRef = body.shipment_id || body.id
            providedToken = req.headers.get("authorization")?.replace("Bearer ", "") || body.token
            const statusMap: Record<string, string> = {
                "pending": "PENDING",
                "shipped": "SENT",
                "in_transit": "IN_TRANSIT",
                "delivered": "DELIVERED",
                "returned": "RETURNED",
            }
            newStatus = statusMap[body.status] || body.status
        }

        if (!trackingCode || !newStatus) {
            return NextResponse.json(
                { error: "Invalid webhook payload: missing tracking or status" },
                { status: 400 }
            )
        }

        // Find the shipment by tracking code or provider ref
        const shipment = await db.deliveryShipment.findFirst({
            where: {
                OR: [
                    { trackingCode },
                    ...(providerRef ? [{ providerRef }] : []),
                ],
            },
            include: {
                tenant: {
                    select: { yalidineApiToken: true, dhdApiToken: true, hddApiToken: true }
                }
            }
        })

        if (!shipment) {
            return NextResponse.json(
                { error: "Shipment not found", trackingCode },
                { status: 404 }
            )
        }

        // Verify Authentication
        let expectedToken = ""
        if (shipment.provider === "YALIDINE") expectedToken = shipment.tenant.yalidineApiToken || ""
        else if (shipment.provider === "DHD") expectedToken = shipment.tenant.dhdApiToken || ""
        else if (shipment.provider === "HDD") expectedToken = shipment.tenant.hddApiToken || ""

        if (!expectedToken || providedToken !== expectedToken) {
            console.warn(`[DELIVERY_WEBHOOK] Unauthorized attempt for ${trackingCode}. Provided: ${providedToken}`)
            // Commenting out strict enforce to prevent blocking valid payloads if headers were not sent properly.
            // But since this is a critical audit issue, we must enforce it.
            return NextResponse.json(
                { error: "Unauthorized: Invalid API token" },
                { status: 401 }
            )
        }

        // Update the status
        await db.deliveryShipment.update({
            where: { id: shipment.id },
            data: { status: newStatus },
        })

        console.log(`[DELIVERY_WEBHOOK] ${provider} updated ${trackingCode} → ${newStatus}`)

        return NextResponse.json({
            success: true,
            shipmentId: shipment.id,
            oldStatus: shipment.status,
            newStatus,
        })
    } catch (error: any) {
        console.error("[DELIVERY_WEBHOOK_ERROR]", error)
        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 500 }
        )
    }
}
