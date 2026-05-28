import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        version: "1.1.1",
        apkUrl: "https://chirpedbeo.online/downloads/syncloudpos-gerant-v1.1.1.apk",
        releaseNotes: {
            fr: "• Optimisations majeures du catalogue (uniquement produits et marques en stock)\n• Menu de navigation rapide et fiche produit épurée (affichage d'un seul prix profil)\n• Améliorations de l'assistant vocal Darja AI avec Gemini 2.0 (fallback robuste)",
            ar: "• تحسينات هامة في الكتالوج (السلع والعلامات المتوفرة في المخزن فقط)\n• أزرار التنقل السريع وبطاقة المنتجات المبسطة (عرض سعر واحد متطابق)\n• تحسينات المساعد الصوتي الدارجة AI مع Gemini 2.0 (تكامل متين)"
        },
        minRequired: "1.0.0"
    });
}
