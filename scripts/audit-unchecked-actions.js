const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '.next') walk(p, out); }
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

// 1) Collect exported action names from src/actions that RETURN an error object
const actionFiles = walk('src/actions');
const errorReturning = new Set();
const allActions = new Set();
for (const f of actionFiles) {
  const src = fs.readFileSync(f, 'utf8');
  const re = /export\s+(?:const\s+(\w+)\s*=\s*async|async\s+function\s+(\w+))/g;
  let m;
  const names = [];
  while ((m = re.exec(src))) names.push([m[1] || m[2], m.index]);
  for (let i = 0; i < names.length; i++) {
    const [name, start] = names[i];
    const end = i + 1 < names.length ? names[i + 1][1] : src.length;
    const body = src.slice(start, end);
    allActions.add(name);
    if (/return\s*\{[^}]*\berror\s*:/.test(body)) errorReturning.add(name);
  }
}

// 2) Find call sites in components/app and classify
const consumerFiles = [...walk('src/components'), ...walk('src/app')];
const findings = [];
for (const f of consumerFiles) {
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/(^|[^.\w])await\s+(\w+)\s*\(/);
    if (!m) continue;
    const name = m[2];
    if (!errorReturning.has(name)) continue;
    // Is the result captured on this line?
    const captured = /(?:const|let|var)\s+[\w{}\[\],:\s]+=\s*await\s+\w+\s*\(/.test(line)
                  || /=\s*await\s+\w+\s*\(/.test(line);
    // Look ahead for an error check within 12 lines
    const ahead = lines.slice(i, i + 12).join('\n');
    const checksError = /\.error\b|['"]error['"]\s*in\b|\berror\s*\)/.test(ahead);
    if (!captured || !checksError) {
      findings.push({ file: f, line: i + 1, action: name, captured, checksError, code: line.trim() });
    }
  }
}
findings.sort((a,b) => a.file.localeCompare(b.file) || a.line - b.line);
console.log('error-returning actions:', errorReturning.size, '/ total actions:', allActions.size);
console.log('UNCHECKED CALL SITES:', findings.length);
console.log('---');
for (const x of findings) {
  console.log(`${x.file}:${x.line}\t${x.action}\tcaptured=${x.captured}\t${x.code.slice(0,90)}`);
}
