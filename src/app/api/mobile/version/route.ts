import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        version: "2.1.0",
        apkUrl: "https://chirpedbeo.online/downloads/syncloudpos-gerant-v2.1.0.apk",
        releaseNotes: {
            fr: "• Version 2.1.0 — Toutes les données en temps réel\n• G50 TVA : calcul automatique mensuel depuis les ventes et achats réels\n• Chèques : liste live depuis la trésorerie, encaissement en un tap\n• Livreurs : performance journalière en temps réel par BL assigné\n• Clôture de caisse : réconciliation live + archivage serveur",
            ar: "• نسخة 2.1.0 — جميع البيانات حية\n• G50 الضريبة: حساب تلقائي شهري من المبيعات والمشتريات الحقيقية\n• الشيكات: قائمة حية من الخزينة، تأكيد التحصيل بنقرة واحدة\n• السائقون: أداء يومي حقيقي من وصولات التسليم المعينة\n• إقفال الصندوق: تسوية حية + أرشفة على الخادم"
        },
        minRequired: "1.0.0",
        gerantEndpoints: [
            "GET /api/mobile/gerant/dashboard",
            "GET /api/mobile/gerant/financials",
            "GET /api/mobile/gerant/debts",
            "GET /api/mobile/gerant/suppliers",
            "GET /api/mobile/gerant/alerts",
            "GET /api/mobile/gerant/performance",
            "GET /api/mobile/gerant/stock-health",
            "POST /api/mobile/gerant/expense",
            "GET /api/mobile/gerant/expense",
            "POST /api/mobile/gerant/payment-supplier",
            "GET /api/mobile/gerant/client/:id/ledger",
            "GET /api/mobile/gerant/supplier/:id/ledger",
            "GET /api/mobile/gerant/g50",
            "GET /api/mobile/gerant/cheques",
            "PATCH /api/mobile/gerant/cheques",
            "GET /api/mobile/gerant/driver-monitor",
            "GET /api/mobile/gerant/daily-close",
            "POST /api/mobile/gerant/daily-close",
        ]
    });
}

