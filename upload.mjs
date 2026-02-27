import fs from 'fs';

async function upload() {
    try {
        const file = fs.readFileSync('update_v3.zip');
        const blob = new Blob([file]);
        const fd = new FormData();
        fd.append('file', blob, 'update_v3.zip');

        const res = await fetch('https://file.io', {
            method: 'POST',
            body: fd,
            headers: {
                'Accept': 'application/json'
            }
        });

        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}
upload();
