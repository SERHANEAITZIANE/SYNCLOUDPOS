import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        version: "2.2.1",
        apkUrl: "https://chirpedbeo.online/downloads/syncloudpos-gerant-v2.2.1.apk",
        releaseNotes: {
            fr: "• Version 2.2.1 — Refonte UX complète \u2018Midnight Aurora\u2019\n• Nouvelle navigation 4 onglets : Accueil, Finance, IA, Plus\n• Écran Finance : accès direct à tous les rapports en 1 tap\n• Écran Plus : toutes les opérations organisées par catégorie\n• Thème Midnight Aurora : glassmorphism, gradients, micro-animations\n• Correctif IA : historique de conversation + mode détaillé\n• Transitions de page fluides (fade from bottom)",
            ar: "• نسخة 2.2.1 — تجديد كامل لواجهة Midnight Aurora\n• تنقل جديد بـ 4 تبويبات: الرئيسية, المالية, الذكاء, المزيد\n• شاشة مالية: وصول مباشر لجميع التقارير بنقرة واحدة\n• شاشة المزيد: جميع العمليات منظمة حسب الفئة\n• تصحيح الذكاء: تاريخ المحادثة + الوضع التفصيلي"
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

