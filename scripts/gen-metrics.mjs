// Vygeneruje tabulku šířek znaků Montserratu (jednotky em/1000) pro řezy 400/600/700.
// Stejná tabulka slouží formuláři, preview i exportu → rozhodnutí o zmenšení textu je deterministické.
// Spuštění: node scripts/gen-metrics.mjs
import * as fontkit from 'fontkit';
import { writeFileSync } from 'node:fs';

const FONT = 'public/fonts/Montserrat-VF.ttf';
const OUT = 'src/brand/metrics.generated.json';

let chars = '';
for (let c = 0x20; c <= 0x7e; c++) chars += String.fromCharCode(c);
chars += 'áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽäöüÄÖÜßłŁńśźżąęĄĘőűŐŰ';
chars += '„“‚‘’–—…·•€§°×→ ';

const font = fontkit.openSync(FONT);
const weights = {};
// levé boční odsazení (left side bearing) → optické zarovnání textu na svislici
const leftBearings = {};
for (const wght of [400, 600, 700]) {
  const v = font.getVariation({ wght });
  const table = {};
  const lsb = {};
  for (const ch of chars) {
    const g = v.glyphForCodePoint(ch.codePointAt(0));
    if (g && g.id !== 0) {
      table[ch] = Math.round(g.advanceWidth);
      if (Number.isFinite(g.bbox.minX)) lsb[ch] = Math.round(g.bbox.minX);
    }
  }
  weights[wght] = table;
  leftBearings[wght] = lsb;
}

writeFileSync(
  OUT,
  JSON.stringify({ unitsPerEm: font.unitsPerEm, source: 'Montserrat[wght].ttf ' + font.version, weights, leftBearings }) + '\n',
);
console.log('zapsáno', OUT, Object.keys(weights[700]).length, 'znaků');
