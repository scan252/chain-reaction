// 截取游戏关键界面截图供视觉评审
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5199';
const OUT = 'docs/screenshots';
mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/01-title.png` });

  // 进角色创建
  const r1 = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.replace(/[s ]/g, '').includes('开始冒险'));
    if (!t) return 'NOT FOUND';
    t.click();
    return 'clicked';
  });
  await page.waitForTimeout(1200);
  console.log('[flow] start-click:', r1);
  await page.screenshot({ path: `${OUT}/02-create.png` });

  // 填名
  const r2 = await page.evaluate(() => {
    const input = document.querySelector('input');
    if (!input) return 'NO INPUT';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, '观月');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return 'filled';
  });
  await page.waitForTimeout(200);

  // 选勇士
  const r3 = await page.evaluate(() => {
    const cls = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('坚韧'));
    if (!cls) return 'NOT FOUND';
    cls.click();
    return 'picked';
  });
  await page.waitForTimeout(400);
  console.log('[flow] name/class:', r2, r3);
  await page.screenshot({ path: `${OUT}/03-create-filled.png` });

  // 开始
  const r4 = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter((b) =>
      b.textContent?.replace(/[s ]/g, '').includes('开始冒险') && !b.hasAttribute('disabled'));
    if (btns.length === 0) return 'NO ENABLED';
    btns[btns.length - 1].click();
    return `clicked(${btns.length})`;
  });
  await page.waitForTimeout(1800);
  console.log('[flow] create-start:', r4);
  await page.screenshot({ path: `${OUT}/04-npc.png` });

  // 拒绝
  const r5 = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.replace(/[s ]/g, '') === '拒绝');
    if (!t) return 'NOT FOUND';
    t.click();
    return 'clicked';
  });
  await page.waitForTimeout(1800);
  console.log('[flow] reject:', r5);
  await page.screenshot({ path: `${OUT}/05-map.png` });

  // 星灵伙伴
  await page.evaluate(() => {
    document.querySelector('img[alt="星灵伙伴"]')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/06-mascot.png` });

  // 进战斗
  const r7 = await page.evaluate(() => {
    const gs = Array.from(document.querySelectorAll('svg g'));
    const clickable = gs.find((g) => g.getAttribute('class') === 'cursor-pointer');
    if (!clickable) return 'NO NODE';
    clickable.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return 'node clicked';
  });
  await page.waitForTimeout(2000);
  console.log('[flow] map-node:', r7);
  await page.screenshot({ path: `${OUT}/07-battle.png` });

  // 放满管道（dev 钩子）
  await page.evaluate(() => {
    const w = window as unknown as { __gameStore?: { getState: () => { hand: { uuid: string }[]; addToPipeline: (u: string, i: number) => void } } };
    const s = w.__gameStore?.getState();
    if (!s) return;
    let slot = 0;
    for (const card of [...s.hand]) {
      s.addToPipeline(card.uuid, slot);
      slot++;
      if (slot >= 5) break;
    }
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/08-battle-filled.png` });

  // 执行结算
  const r9 = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.replace(/[s ]/g, '').includes('执行结算'));
    if (!t) return 'NOT FOUND';
    t.click();
    return 'clicked';
  });
  await page.waitForTimeout(1200);
  console.log('[flow] execute:', r9);
  await page.screenshot({ path: `${OUT}/09-executing.png` });

  // 跳过动画
  await page.evaluate(() => {
    const w = window as unknown as { __gameStore?: { getState: () => { requestSkip: () => void } } };
    w.__gameStore?.getState().requestSkip();
  });
  await page.waitForTimeout(3200);
  await page.screenshot({ path: `${OUT}/10-summary.png` });

  await browser.close();
  console.log('screenshots saved to', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
