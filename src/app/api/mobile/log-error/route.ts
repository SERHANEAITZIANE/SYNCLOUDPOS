import { NextRequest, NextResponse } from "next/server";
import { verifyMobileAuth } from "@/lib/mobile-auth";

/**
 * Mobile crash reporting sink.
 *
 * Crash reports are genuinely useful from a client that may be in a broken or
 * partially-signed-out state, so a valid token is not *required* — but the
 * endpoint is public (/api/mobile/* bypasses the middleware auth check), so it
 * must not be an unbounded, unauthenticated write into the server log
 * (PROJECT_AUDIT.md, finding L-1).
 *
 * Therefore: anonymous reports are accepted but every field is length-capped
 * and the payload is attributed to a tenant only when a token actually verifies.
 */

const MAX_FIELD = 500;
const MAX_STACK = 4000;
const MAX_BODY_BYTES = 16 * 1024;

function clamp(value: unknown, max: number): string {
    if (typeof value !== "string") return "unknown";
    // Strip CR/LF so a crafted payload cannot forge extra log lines.
    return value.replace(/[\r\n]+/g, " ").slice(0, max);
}

export async function POST(request: NextRequest) {
    try {
        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) {
            return NextResponse.json({ success: false, error: "Payload trop volumineux" }, { status: 413 });
        }

        let body: any;
        try {
            body = JSON.parse(raw);
        } catch {
            return NextResponse.json({ success: false, error: "JSON invalide" }, { status: 400 });
        }

        // Attribute the report when the client still holds a valid token.
        const user = verifyMobileAuth(request);
        const attribution = user ? `${user.tenantId}/${user.userId}` : "anonymous";

        console.error("====== MOBILE APP CRASH LOG ======");
        console.error(`Reporter: ${attribution}`);
        console.error(`App: ${clamp(body?.app, 100)}`);
        console.error(`Version: ${clamp(body?.version, 50)}`);
        console.error(`Is Fatal: ${body?.isFatal === true}`);
        console.error(`Error Message: ${clamp(body?.error?.message, MAX_FIELD)}`);
        console.error(`Stack: ${clamp(body?.error?.stack, MAX_STACK)}`);
        console.error("==================================");

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[MOBILE_LOG_ERROR]", err);
        return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
    }
}
