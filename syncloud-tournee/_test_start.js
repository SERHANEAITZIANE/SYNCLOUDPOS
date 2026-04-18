const cp = require('child_process');
const fs = require('fs');
try {
    const r = cp.execSync('npx expo start', {timeout:15000, encoding:'utf-8'});
    fs.writeFileSync('start_result.json', JSON.stringify({ok:true, out:r.substring(0,800)}));
} catch(e) {
    fs.writeFileSync('start_result.json', JSON.stringify({
        ok:false,
        stderr:String(e.stderr||'').substring(0,800),
        stdout:String(e.stdout||'').substring(0,800),
        msg:String(e.message||'').substring(0,800)
    }));
}
