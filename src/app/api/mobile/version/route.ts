import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        version: "1.1.3",
        apkUrl: "https://chirpedbeo.online/downloads/syncloudpos-gerant-v1.1.2.apk",
        releaseNotes: {
            fr: "• Intégration des tout derniers modèles IA 2026 : Gemini 3.5 Flash, Claude Opus 4.8, GPT-5.5 Pro\n• Les mises à jour sont maintenant optionnelles et non-bloquantes (bouton 'Plus tard')\n• Assistant vocal Darja amélioré et rebrandé\n• Catalogue de vente : flux 3 étapes optimisé (Client → Marque → Produits)",
            ar: "• دمج أحدث نماذج الذكاء الاصطناعي 2026: Gemini 3.5 Flash, Claude Opus 4.8, GPT-5.5\n• التحديثات أصبحت اختيارية وغير إجبارية (زر 'لاحقاً')\n• تحسين المساعد الصوتي الدارجة\n• كتالوج المبيعات: تحسين مسار 3 خطوات (عميل → علامة → منتجات)"
        },
        minRequired: "1.0.0"
    });
}
