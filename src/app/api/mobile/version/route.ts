import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        version: "1.2.1",
        apkUrl: "https://chirpedbeo.online/downloads/syncloudpos-gerant-v1.2.1.apk",
        releaseNotes: {
            fr: "• Version 1.2.1 : Correction critique de l'assistant vocal TTS et de l'OCR mobile (numérisation des factures)\n• Assistant vocal Darja 100% opérationnel\n• Fallback automatique des modèles Gemini pour une réactivité maximale",
            ar: "• نسخة 1.2.1: إصلاح حاسم للمساعد الصوتي وجهاز مسح الفواتير (OCR) بالهاتف المحمول\n• المساعد الصوتي بالدارجة الجزائرية شغال 100%\n• استجابة فائقة السرعة مع النماذج الاحتياطية لـ Gemini"
        },
        minRequired: "1.0.0"
    });
}

