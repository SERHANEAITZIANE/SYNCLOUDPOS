import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        version: "1.1.0",
        apkUrl: "https://chirpedbeo.online/downloads/syncloudpos-gerant-v1.1.0.apk",
        releaseNotes: {
            fr: "• Ajout du Catalogue de Vente et Catalogue Produit\n• Partage direct vers WhatsApp & Export PDF\n• Système d'auto-mise à jour intelligent",
            ar: "• إضافة كتالوج المبيعات وكتالوج المنتجات\n• المشاركة المباشرة عبر واتساب وتصدير PDF\n• نظام التحديث التلقائي الذكي"
        },
        minRequired: "1.0.0"
    });
}
