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

  // 角色创建
  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('开始冒险'));
    t?.click();
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/02-create.png` });

  // 填名选职业
  await page.evaluate(() => {
    const input = document.querySelector('input');
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, '观月');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const cls = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('坚韧'));
    cls?.click();
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/03-create-filled.png` });

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter((b) => b.textContent?.includes('开始冒险') && !b.hasAttribute('disabled'));
    btns[btns.length - 1]?.click();
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/04-npc.png` });

  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === '拒绝');
    t?.click();
  });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/05-map.png` });

  // 点吉祥物
  await page.evaluate(() => {
    const mascot = document.querySelector('img[alt="冒险伙伴"]')?.parentElement;
    mascot?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/06-mascot.png` });

  // 进战斗
  await page.evaluate(() => {
    const gs = Array.from(document.querySelectorAll('svg g'));
    const clickable = gs.find((g) => g.className?.baseVal === 'cursor-pointer');
    clickable?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/07-battle.png` });

  // 放满管道
  await page.evaluate(() => {
    const w = window as unknown as { __gameStore?: { getState: () => { hand: { uuid: string }[]; addToPipeline: (u: string, i: number) => void } } };
    const s = w.__gameStore!.getState();
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
  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('执行结算'));
    t?.click();
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/09-executing.png` });

  await page.evaluate(() => {
    const w = window as unknown as { __gameStore?: { getState: () => { requestSkip: () => void } } };
    w.__gameStore?.getState().requestSkip();
  });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/10-summary.png` });

  await browser.close();
  console.log('screenshots saved to', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
