import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // Evolution API webhook payload typically includes the instance name
        const instanceName = body.instance || body.sender || body.instanceName;
        const event = body.event;
        
        if (!instanceName) {
            return NextResponse.json({ error: "Missing instance name" }, { status: 400 });
        }

        const tenant = await db.tenant.findFirst({
            where: { whatsappInstanceId: instanceName }
        });

        if (!tenant) {
            return NextResponse.json({ error: "Tenant not found for instance" }, { status: 404 });
        }

        if (event === "CONNECTION_UPDATE" || event === "connection.update") {
            const state = body.data?.state || body.state;
            
            if (state === "open" || state === "connected") {
                await db.tenant.update({
                    where: { id: tenant.id },
                    data: { whatsappStatus: "CONNECTED" }
                });
            } else if (state === "close" || state === "disconnected") {
                await db.tenant.update({
                    where: { id: tenant.id },
                    data: { whatsappStatus: "DISCONNECTED" }
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("WhatsApp Webhook Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
