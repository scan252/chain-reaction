import sharp from 'sharp';
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const DIR = process.argv[2];
let before = 0, after = 0;
for (const f of readdirSync(DIR).filter((f) => f.endsWith('.png'))) {
  const p = join(DIR, f);
  before += statSync(p).size;
  const buf = await sharp(p).png({ compressionLevel: 9, palette: true, quality: 82, effort: 8 }).toBuffer();
  writeFileSync(p, buf);
  after += buf.length;
  console.log(f, (statSync(p).size/1024).toFixed(0)+'KB');
}
console.log(`TOTAL ${(before/1024/1024).toFixed(1)}MB -> ${(after/1024/1024).toFixed(1)}MB`);
