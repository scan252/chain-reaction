// 图片资源压缩：30MB 原图 → 按用途重采样为 WebP
// 用法: npx tsx scripts/optimize-images.ts
import sharp from 'sharp';
import { mkdirSync, readdirSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const PIC = join(process.cwd(), 'public', 'pic');

async function toWebp(src: string, dest: string, width: number, quality: number) {
  await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality }).toFile(dest);
}

async function main() {
  const jobs: { file: string; width: number; quality: number }[] = [];
  const backgrounds = ['P1.jpg', 'P2.jpg', 'P3.jpg', 'P4_opacity_65.png'];
  for (const f of backgrounds) {
    if (existsSync(join(PIC, f))) jobs.push({ file: f, width: 1920, quality: 72 });
  }
  const monsterDir = join(PIC, 'monster');
  for (const f of readdirSync(monsterDir)) {
    if (/\.(jpg|png)$/i.test(f)) jobs.push({ file: join('monster', f), width: 480, quality: 80 });
  }
  const proDir = join(PIC, 'pro');
  for (const f of readdirSync(proDir)) {
    if (/\.(jpg|png)$/i.test(f)) jobs.push({ file: join('pro', f), width: 640, quality: 80 });
  }
  // 吉祥物需要保留透明度
  const mascot = join(PIC, 'map', '220513he5vqCdOtvYxTfGW.png');
  if (existsSync(mascot)) jobs.push({ file: join('map', '220513he5vqCdOtvYxTfGW.png'), width: 720, quality: 85 });

  let before = 0;
  let after = 0;
  for (const job of jobs) {
    const src = join(PIC, job.file);
    const dest = join(PIC, job.file.slice(0, job.file.lastIndexOf('.')) + '.webp');
    before += statSync(src).size;
    await toWebp(src, dest, job.width, job.quality);
    after += statSync(dest).size;
    console.log(`${job.file} -> ${basename(dest)}  ${(statSync(src).size / 1024).toFixed(0)}KB -> ${(statSync(dest).size / 1024).toFixed(0)}KB`);
    unlinkSync(src);
  }
  console.log(`\nTOTAL: ${(before / 1024 / 1024).toFixed(1)}MB -> ${(after / 1024 / 1024).toFixed(1)}MB`);

  // favicon 保留，index.html 引用不变
  mkdirSync(join(PIC, '.done'), { recursive: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
