import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// POST /api/mobile/gerant/notifications/read
export async function POST(req: NextRequest) {
    try {
        requireMobileAuth(req);
        return NextResponse.json({ success: true, message: "Notifications marquées comme lues" });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
