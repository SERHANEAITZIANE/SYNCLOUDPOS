const main = async () => {
    try {
        const res = await fetch('https://chirpedbeo.online/api/mobile/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: 'السلام عليكم يا صديقي، هل هذا الصوت يعمل بشكل جيد؟',
                language: 'darija'
            })
        });

        console.log('Response status:', res.status);
        console.log('Content-Type:', res.headers.get('content-type'));
        console.log('X-TTS-Voice:', res.headers.get('x-tts-voice'));
        console.log('X-TTS-Language:', res.headers.get('x-tts-language'));

        if (res.ok) {
            const buf = await res.arrayBuffer();
            console.log('Audio file generated successfully! Size:', buf.byteLength, 'bytes');
        } else {
            const txt = await res.text();
            console.log('Error payload:', txt);
        }
    } catch (err) {
        console.error('Fetch error:', err);
    }
};

main();
