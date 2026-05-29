const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
const fs = require("fs");

async function main() {
    try {
        console.log("Initializing MsEdgeTTS...");
        const tts = new MsEdgeTTS();
        console.log("Setting metadata for AminaNeural...");
        await tts.setMetadata("ar-DZ-AminaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
        
        console.log("Generating stream...");
        const { audioStream } = tts.toStream("السلام عليكم يا مدير، كيفاش نقدر نعاونك اليوم؟");
        
        const chunks = [];
        await new Promise((resolve, reject) => {
            audioStream.on("data", (chunk) => {
                chunks.push(chunk);
            });
            audioStream.on("end", () => {
                console.log("Stream ended successfully");
                resolve();
            });
            audioStream.on("error", (err) => {
                console.error("Stream error:", err);
                reject(err);
            });
        });
        
        const buffer = Buffer.concat(chunks);
        console.log("Generated audio buffer size:", buffer.length);
        fs.writeFileSync("test_tts_out.mp3", buffer);
        console.log("Success! Saved as test_tts_out.mp3");
    } catch (e) {
        console.error("Failed to generate TTS:", e);
    }
}

main();
