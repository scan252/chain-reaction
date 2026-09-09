import { chromium } from 'playwright';
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5199';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERR:', m.text().slice(0, 150)); });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Step 1: click start
  const r1 = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.replace(/[s ]/g, '').includes('开始冒险'));
    if (!t) return 'BUTTON NOT FOUND';
    t.click();
    return 'clicked';
  });
  await page.waitForTimeout(1500);
  const s1 = await page.evaluate(() => document.body.innerText.slice(0, 40).replace(/\n+/g, '|'));
  console.log('STEP1:', r1, '→', s1);

  // Step 2: fill name
  const r2 = await page.evaluate(() => {
    const input = document.querySelector('input');
    if (!input) return 'NO INPUT';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, '观月');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return 'filled';
  });
  // Step 3: pick class
  const r3 = await page.evaluate(() => {
    const cls = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('坚韧'));
    if (!cls) return 'CLASS NOT FOUND';
    cls.click();
    return 'class picked';
  });
  await page.waitForTimeout(400);
  // Step 4: click start (enabled)
  const r4 = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter((b) => b.textContent?.replace(/[s ]/g, '').includes('开始冒险') && !b.hasAttribute('disabled'));
    if (btns.length === 0) return 'NO ENABLED START (count=0)';
    btns[btns.length - 1].click();
    return `clicked (${btns.length})`;
  });
  await page.waitForTimeout(1800);
  const s4 = await page.evaluate(() => document.body.innerText.slice(0, 40).replace(/\n+/g, '|'));
  console.log('STEP2-4:', r2, r3, r4, '→', s4);

  await browser.close();
}
main();
