import { chromium } from 'playwright';
async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    (document.querySelectorAll('button')[0] as HTMLElement).click();
  });
  await page.waitForTimeout(800);
  // 快速进入战斗
  await page.evaluate(() => {
    const w = window as unknown as { __runStore?: { getState: () => { setPlayerProfile: (n: string, c: string) => void; startNewRun: () => void; selectMapNode: (id: string) => void; map: { layers: { id: string }[][] } } } };
    const s = w.__runStore!.getState();
    s.setPlayerProfile('调试', 'WARRIOR');
    s.startNewRun();
    const s2 = w.__runStore!.getState();
    s2.selectMapNode(s2.map.layers[0][0].id);
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const w = window as unknown as { __gameStore?: { getState: () => { hand: { uuid: string }[]; addToPipeline: (u: string, i: number) => void } } };
    const s = w.__gameStore!.getState();
    let slot = 0;
    for (const card of [...s.hand]) { s.addToPipeline(card.uuid, slot); slot++; if (slot >= 5) break; }
  });
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => {
    const panel = document.querySelector('.panel.relative');
    const root = panel?.parentElement;
    const pr = panel?.getBoundingClientRect();
    const rr = root?.getBoundingClientRect();
    const row = panel?.querySelector('[data-slot-index="0"]')?.parentElement?.getBoundingClientRect();
    return {
      rootClass: root?.className.slice(0, 60),
      computedMargin: root ? getComputedStyle(root).marginLeft + '/' + getComputedStyle(root).marginRight : null,
      computedWidth: root ? getComputedStyle(root).width : null,
      parentDisplay: root?.parentElement ? getComputedStyle(root.parentElement).display : null,
      rootRect: rr ? { x: Math.round(rr.x), w: Math.round(rr.width) } : null,
      panelRect: pr ? { x: Math.round(pr.x), w: Math.round(pr.width) } : null,
      rowWidth: row ? Math.round(row.width) : null,
      viewport: window.innerWidth,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
}
main();
