// 手机视口截图自查
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5199';
const OUT = 'docs/screenshots/mobile';
mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/01-title.png` });

  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.replace(/[s ]/g, '').includes('开始冒险'))?.click();
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/02-create.png` });

  await page.evaluate(() => {
    const input = document.querySelector('input');
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, '观月');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('坚韧'))?.click();
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter((b) => b.textContent?.replace(/[s ]/g, '').includes('开始冒险') && !b.hasAttribute('disabled'));
    btns[btns.length - 1]?.click();
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.replace(/[s ]/g, '') === '拒绝')?.click();
  });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/05-map.png` });

  await page.evaluate(() => {
    const gs = Array.from(document.querySelectorAll('svg g'));
    const clickable = gs.find((g) => g.getAttribute('class') === 'cursor-pointer');
    clickable?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(2000);

  // 放置卡牌（store 直连）
  await page.evaluate(() => {
    const w = window as unknown as { __gameStore?: { getState: () => { hand: { uuid: string }[]; addToPipeline: (u: string, i: number) => void } } };
    const s = w.__gameStore?.getState();
    if (!s) return;
    let slot = 0;
    for (const card of [...s.hand]) { s.addToPipeline(card.uuid, slot); slot++; if (slot >= 5) break; }
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/08-battle-filled.png` });

  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.replace(/[s ]/g, '').includes('执行结算'))?.click();
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const w = window as unknown as { __gameStore?: { getState: () => { requestSkip: () => void } } };
    w.__gameStore?.getState().requestSkip();
  });
  await page.waitForTimeout(3200);
  await page.screenshot({ path: `${OUT}/10-summary.png` });

  await browser.close();
  console.log('mobile screenshots done');
}
main().catch((e) => { console.error(e); process.exit(1); });
