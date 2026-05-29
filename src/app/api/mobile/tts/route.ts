import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

// Voice mapping for supported languages/dialects
const VOICE_MAP: Record<string, string> = {
    darija: "ar-DZ-AminaNeural",   // Algerian Arabic (Darja) — native ar-DZ Microsoft Neural voice
    arabic: "ar-SA-ZariyahNeural", // Modern Standard Arabic (Saudi)
    french: "fr-FR-DeniseNeural",  // French (France) — natural female voice
};

// Fallback voices (male alternatives)
const FALLBACK_VOICES: Record<string, string> = {
    darija: "ar-DZ-IsmaelNeural",  // Male Algerian voice
    arabic: "ar-SA-HamedNeural",   // Male MSA
    french: "fr-FR-HenriNeural",   // Male French
};

async function generateAudio(text: string, voiceName: string): Promise<Buffer> {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

    const { audioStream } = tts.toStream(text);
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
        audioStream.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
        });
        audioStream.on("end", () => resolve());
        audioStream.on("error", (err: Error) => reject(err));
    });

    return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const { text, language = "french", responseFormat } = body;

        if (!text || !text.trim()) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        // Limit text length to prevent abuse (max ~2000 chars)
        const cleanText = text
            .replace(/[*#_\\]/g, "")
            .trim()
            .slice(0, 2000);

        const voiceName = VOICE_MAP[language] || VOICE_MAP.french;

        let audioBuffer: Buffer;

        try {
            audioBuffer = await generateAudio(cleanText, voiceName);
        } catch (primaryError) {
            console.warn(`[TTS] Primary voice ${voiceName} failed, trying fallback...`, primaryError);
            // Try fallback voice
            const fallbackVoice = FALLBACK_VOICES[language] || FALLBACK_VOICES.french;
            audioBuffer = await generateAudio(cleanText, fallbackVoice);
        }

        // Return Base64 JSON if requested
        if (responseFormat === "base64") {
            return NextResponse.json({
                success: true,
                audio: audioBuffer.toString("base64"),
                voice: voiceName,
                language
            });
        }

        // Return the MP3 audio as a binary response
        return new NextResponse(audioBuffer as any, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": audioBuffer.length.toString(),
                "Cache-Control": "public, max-age=3600",
                "X-TTS-Voice": voiceName,
                "X-TTS-Language": language,
            },
        });
    } catch (error: any) {
        console.error("[TTS] Error generating speech:", error);
        return NextResponse.json(
            { error: "TTS generation failed", details: error?.message },
            { status: 500 }
        );
    }
}
