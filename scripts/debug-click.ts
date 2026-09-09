import { chromium } from 'playwright';
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5199';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const probe = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const t = btns.find((b) => b.textContent?.replace(/\s/g, '').includes('开始冒险'));
    return {
      total: btns.length,
      texts: btns.map((b) => JSON.stringify(b.textContent)),
      found: !!t,
      disabled: t?.disabled,
    };
  });
  console.log('PROBE:', JSON.stringify(probe, null, 2));

  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.replace(/\s/g, '').includes('开始冒险'));
    t?.click();
  });
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => document.body.innerText.slice(0, 120));
  console.log('AFTER:', after.replace(/\n+/g, ' | '));
  await browser.close();
}
main();
