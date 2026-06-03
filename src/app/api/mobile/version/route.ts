import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        version: "2.0.0",
        apkUrl: "https://chirpedbeo.online/downloads/syncloudpos-gerant-v2.0.0.apk",
        releaseNotes: {
            fr: "• Version 2.0.0 — Module Gérant Complet\n• Dashboard financier temps réel (CA, encaissements, dettes, trésorerie)\n• Analyse financière avancée avec marges et COGS\n• Suivi créances clients avec vieillissement (0-30j, 30-60j, 60-90j, 90+)\n• Obligations fournisseurs et soldes\n• Alertes intelligentes (ruptures stock, créances critiques, promos expirantes)\n• Performance équipe (par caissier/vendeur)\n• Santé du stock (lents, rapides, sur-stockés, valeur totale)\n• Enregistrement dépenses depuis le mobile\n• Paiement fournisseur depuis le mobile\n• Extrait de compte client et fournisseur mobile",
            ar: "• نسخة 2.0.0 — وحدة المدير الكاملة\n• لوحة مالية فورية (الإيرادات، التحصيل، الديون، الخزينة)\n• تحليل مالي متقدم مع هوامش الربح\n• متابعة ديون العملاء حسب العمر\n• التزامات الموردين والأرصدة\n• تنبيهات ذكية (نفاد المخزون، الديون الحرجة)\n• أداء الفريق (لكل بائع)\n• صحة المخزون (بطيء، سريع، مُكدَّس)\n• تسجيل المصاريف من الهاتف\n• دفع المورد من الهاتف\n• كشف حساب العميل والمورد"
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
        ]
    });
}

