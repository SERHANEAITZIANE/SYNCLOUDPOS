import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        version: "1.1.2",
        apkUrl: "https://chirpedbeo.online/downloads/syncloudpos-gerant-v1.1.2.apk",
        releaseNotes: {
            fr: "• Amélioration majeure de l'assistant vocal Darja AI avec l'intégration des tout derniers modèles Gemini 3.5 Flash et Claude 4.7 Opus (les meilleurs pour le dialecte algérien et l'Arabizi)\n• Optimisations du catalogue (marques et produits en stock seulement)\n• Correction des matrices de prix et ajout de boutons de retour rapide",
            ar: "• ترقية ضخمة للمساعد الصوتي الدارجة AI مع دمج أحدث نماذج Gemini 3.5 Flash و Claude 4.7 Opus (الأفضل في فهم الدارجة والعرابيزي)\n• تحسينات هامة في الكتالوج (السلع والعلامات المتوفرة في المخزن فقط)\n• إصلاح مصفوفة الأسعار وإضافة أزرار العودة السريعة"
        },
        minRequired: "1.0.0"
    });
}
