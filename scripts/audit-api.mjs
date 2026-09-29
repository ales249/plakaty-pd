// Automatický audit API: node scripts/audit-api.mjs [BASE]  (výchozí http://localhost:3100)
// Vytvoří testovací fotky a loga, projde validace a všechny exporty a na konci po sobě uklidí.
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { PDFDocument } from '@cantoo/pdf-lib';
const BASE = process.argv[2] ?? process.env.BASE ?? 'http://localhost:3100';
let pass = 0, fail = 0;
const ok = (cond, name, detail = '') => { if (cond) pass++; else fail++; console.log(`${cond ? '✓' : '✗ CHYBA'}  ${name}${detail ? ' — ' + detail : ''}`); };
const post = (path, body) => fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const upload = async (path, buf, name, type) => { const fd = new FormData(); fd.append('file', new Blob([buf], { type }), name); const r = await fetch(BASE + path, { method: 'POST', body: fd }); return [r.status, await r.json()]; };

// --- testovací data
const colorJpg = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: { r: 180, g: 60, b: 40 } } }).jpeg({ quality: 90 }).toBuffer();
const logoSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80"><rect width="200" height="80" rx="10" fill="#e60"/><text x="100" y="52" text-anchor="middle" font-size="36" font-family="Arial" fill="#fff">TEST</text></svg>');
const logoJpg = await sharp({ create: { width: 300, height: 120, channels: 3, background: '#fff' } }).composite([{ input: Buffer.from('<svg width="300" height="120"><circle cx="150" cy="60" r="50" fill="#123"/></svg>') }]).jpeg().toBuffer();

console.log('— stránky');
ok((await fetch(BASE + '/')).status === 200, 'hlavní stránka 200');
ok((await fetch(BASE + '/render?d=xxx&f=poster-3x4')).status === 404, '/render s nesmyslnými daty → 404');
ok((await fetch(BASE + '/render?f=a5')).status === 404, '/render s neexistujícím formátem → 404');
ok((await fetch(BASE + '/fonts/Montserrat-VF.ttf')).status === 200, 'font je dostupný');
ok((await fetch(BASE + '/brand/logo-pd-dark-bg.svg')).status === 200, 'logo PD je dostupné');

console.log('— knihovna fotek (jen pro čtení)');
const manifest = JSON.parse(await readFile('content/photos.json', 'utf8'));
const photos = await (await fetch(BASE + '/api/photos')).json();
ok(photos.length === manifest.length && photos.length > 0, 'seznam fotek odpovídá content/photos.json', `${photos.length} fotek`);
ok(photos.every((p) => !('file' in p)), 'API neprozrazuje názvy souborů na disku');
const color = photos.find((p) => p.variant === 'barva') ?? photos[0];
const entry = manifest.find((p) => p.id === color.id);
const full = Buffer.from(await (await fetch(`${BASE}/api/photos/${color.id}?v=full`)).arrayBuffer());
ok(Buffer.compare(full, await readFile(`content/photos/${entry.file}`)) === 0, 'plná varianta = původní soubor bajt po bajtu');
const prev = await sharp(Buffer.from(await (await fetch(`${BASE}/api/photos/${color.id}?v=preview`)).arrayBuffer())).metadata();
ok(Math.max(prev.width, prev.height) <= 1600, 'náhled zmenšený', `${prev.width}×${prev.height}`);
const fdPhoto = new FormData(); fdPhoto.append('file', new Blob([colorJpg], { type: 'image/jpeg' }), 'x.jpg');
ok((await fetch(BASE + '/api/photos', { method: 'POST', body: fdPhoto })).status === 405, 'nahrání fotky není možné (405)');
ok((await fetch(`${BASE}/api/photos/${color.id}`, { method: 'DELETE' })).status === 405, 'smazání fotky není možné (405)');
ok((await fetch(`${BASE}/api/photos/${color.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status === 405, 'změna fotky není možná (405)');
ok((await fetch(`${BASE}/api/photos/${color.id}?v=full`)).status === 200, 'fotka po pokusech pořád existuje');
ok((await fetch(`${BASE}/api/photos/..%2F..%2Fpackage.json?v=full`)).status === 404, 'path traversal u fotek → 404');
ok((await fetch(`${BASE}/api/logos/..%2F..%2Fpackage.json`)).status === 404, 'path traversal u log → 404');

console.log('— loga pořadatele');
const [l1s, logo1] = await upload('/api/logos', logoSvg, 'test.svg', 'image/svg+xml');
const [l2s, logo2] = await upload('/api/logos', logoJpg, 'kruh.jpg', 'image/jpeg');
ok(l1s === 201 && l2s === 201, 'nahrání SVG i JPG loga');
const lp = await sharp(Buffer.from(await (await fetch(`${BASE}/api/logos/${logo1.id}`)).arrayBuffer())).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
let nonWhite = 0; for (let i = 0; i < lp.data.length; i += 4) if (lp.data[i + 3] > 20 && (lp.data[i] < 250 || lp.data[i + 1] < 250 || lp.data[i + 2] < 250)) nonWhite++;
ok(nonWhite === 0, 'logo převedené na bílou siluetu');

console.log('— validace exportu');
const input = { templateId: 'event-classic', photoId: color.id, cityHeadline: 'v Karlových Varech', venue: 'Městské divadlo', date: '2026-11-18', time: '19:00', description: 'Zaznamenali jste u sebe v posledních dnech nutkavou potřebu', partnerLogoIds: [logo1.id, logo2.id] };
const bad = async (name, patchIn, extra = {}) => { const r = await post('/api/export', { formatId: 'poster-3x4', fileType: 'png', input: { ...input, ...patchIn }, ...extra }); ok(r.status >= 400 && r.status < 500, name, `HTTP ${r.status}`); };
await bad('neexistující datum (30. 2.) odmítnuto', { date: '2026-02-30' });
await bad('neplatný čas (25:99) odmítnut', { time: '25:99' });
await bad('město přes 23 znaků odmítnuto', { cityHeadline: 'v' + 'x'.repeat(23) });
await bad('místo přes 27 znaků odmítnuto', { venue: 'x'.repeat(28) });
await bad('popis přes 3 řádky odmítnut', { description: ['a', 'b', 'c', 'd'].map((c) => c.repeat(20)).join(' ') });
await bad('3 loga pořadatele odmítnuta', { partnerLogoIds: [logo1.id, logo2.id, logo1.id] });
await bad('neexistující logo odmítnuto', { partnerLogoIds: ['00000000-0000-0000-0000-000000000000'] });
await bad('neexistující fotka odmítnuta', { photoId: 'neni' });
await bad('prázdné místo konání odmítnuto', { venue: '' });
await bad('neplatný výřez fotky odmítnut', { photoFocus: { x: 2, y: 0 } });
ok((await post('/api/export', { formatId: 'poster-3x4', fileType: 'jpeg', input: { ...input, photoFocus: { x: 0, y: 0.5 } } })).status === 200, 'vlastní výřez fotky pro plakát');
ok((await post('/api/export', { formatId: 'poster-3x4', fileType: 'pdf', input })).status === 400, 'PDF u 3:4 odmítnuto');

console.log('— exporty');
const cases = [['poster-3x4', 'png', [2160, 2880]], ['poster-3x4', 'jpeg', [2160, 2880]], ['a4', 'png', [2480, 3508]], ['a4', 'jpeg', [2480, 3508]], ['a3', 'png', [3508, 4961]], ['a3', 'jpeg', [3508, 4961]]];
for (const [formatId, fileType, [w, h]] of cases) {
  const t = Date.now(); const r = await post('/api/export', { formatId, fileType, input });
  const buf = Buffer.from(await r.arrayBuffer()); const m = r.status === 200 ? await sharp(buf).metadata() : {};
  ok(r.status === 200 && m.width === w && m.height === h, `${formatId} ${fileType.toUpperCase()}`, `${m.width}×${m.height}, ${(buf.length / 1e6).toFixed(1)} MB, ${((Date.now() - t) / 1000).toFixed(1)} s`);
}
for (const [formatId, bleed, sizeMm, trim] of [['a4', false, [210, 297], null], ['a3', false, [297, 420], null], ['a4', true, [228, 315], [210, 297]], ['a3', true, [315, 438], [297, 420]]]) {
  const t = Date.now(); const r = await post('/api/export', { formatId, fileType: 'pdf', bleed, input });
  const buf = Buffer.from(await r.arrayBuffer());
  if (r.status !== 200) { ok(false, `${formatId} PDF${bleed ? ' pro tiskárnu' : ''}`, `HTTP ${r.status}`); continue; }
  const doc = await PDFDocument.load(buf); const p = doc.getPage(0); const mm = (v) => v * 25.4 / 72;
  const mb = p.getMediaBox(), tb = p.getTrimBox();
  const sizeOk = Math.abs(mm(mb.width) - sizeMm[0]) < 0.6 && Math.abs(mm(mb.height) - sizeMm[1]) < 0.6;
  const trimOk = trim ? Math.abs(mm(tb.width) - trim[0]) < 0.01 && Math.abs(mm(tb.height) - trim[1]) < 0.01 : true;
  const txt = buf.toString('latin1'); const fonts = new Set(txt.match(/\/FontName\s*\/\S+/g)).size;
  ok(doc.getPageCount() === 1 && sizeOk && trimOk && fonts > 0, `${formatId} PDF${bleed ? ' pro tiskárnu' : ''}`, `${mm(mb.width).toFixed(1)}×${mm(mb.height).toFixed(1)} mm${trim ? `, TrimBox ${mm(tb.width).toFixed(0)}×${mm(tb.height).toFixed(0)}` : ''}, fontů ${fonts}, ${((Date.now() - t) / 1000).toFixed(1)} s`);
}
const disp = (await post('/api/export', { formatId: 'a4', fileType: 'pdf', bleed: true, input })).headers.get('content-disposition');
ok(/filename="prepiste-dejiny-karlovych-varech-2026-11-18-a4-pro-tiskarnu\.pdf"/.test(disp), 'název souboru', disp.match(/filename="(.+)"/)[1]);

console.log('— souběh');
const t0 = Date.now();
const par = await Promise.all(['poster-3x4', 'a4', 'a3', 'poster-3x4'].map((f, i) => post('/api/export', { formatId: f, fileType: i === 2 ? 'pdf' : 'png', input })));
ok(par.every(r => r.status === 200), '4 exporty najednou', `${((Date.now() - t0) / 1000).toFixed(1)} s`);

console.log('— úklid');
for (const id of [logo1.id, logo2.id]) ok((await fetch(`${BASE}/api/logos/${id}`, { method: 'DELETE' })).status === 204, `smazání loga ${id.slice(0, 8)}`);
console.log(`\nVÝSLEDEK API: ${pass} OK, ${fail} chyb`);
