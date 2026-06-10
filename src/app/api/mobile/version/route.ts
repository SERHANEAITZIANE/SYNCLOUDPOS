import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        version: "3.0.0",
        apkUrl: "https://chirpedbeo.online/downloads/syncloudpos-gerant-v3.0.0.apk",
        releaseNotes: {
            fr: "• Version 3.0.0 — Refonte majeure de l'interface (Design System v3), tableau de bord premium dynamique, nouveaux rapports analytiques avec filtres, centre de notifications intelligent, suivi des objectifs et résumés hebdomadaires.",
            ar: "• نسخة 3.0.0 — تحديث شامل للواجهة وتصميم جديد، لوحة تحكم ذكية، تقارير تحليلية متقدمة مع فلاتر جديدة، مركز إشعارات متكامل، ومتابعة الأهداف والملخصات الأسبوعية."
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

