import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.error("====== MOBILE APP CRASH LOG ======");
        console.error(`App: ${body.app || "unknown"}`);
        console.error(`Version: ${body.version || "unknown"}`);
        console.error(`Is Fatal: ${body.isFatal}`);
        console.error(`Error Message: ${body.error?.message}`);
        console.error(`Stack: ${body.error?.stack}`);
        console.error("==================================");
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
