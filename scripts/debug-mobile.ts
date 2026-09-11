import { chromium } from 'playwright';
async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const w = window as unknown as { __runStore?: { getState: () => { setPlayerProfile: (n: string, c: string) => void; startNewRun: () => void; selectMapNode: (id: string) => void; map: { layers: { id: string }[][] } } } };
    const st = w.__runStore!.getState();
    st.setPlayerProfile('调试', 'WARRIOR');
    st.startNewRun();
    const st2 = w.__runStore!.getState();
    st2.selectMapNode(st2.map.layers[0][0].id);
  });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const zones = Array.from(document.querySelectorAll('div'));
    const enemyZone = zones.find((d) => d.className.includes('flex-1') && d.className.includes('items-center')) as HTMLElement | undefined;
    const bar = zones.find((d) => typeof d.className === 'string' && d.className.includes('max-w-[400px]')) as HTMLElement | undefined;
    const hand = zones.find((d) => typeof d.className === 'string' && d.className.includes('min-h-[84px]')) as HTMLElement | undefined;
    return {
      enemyZoneH: enemyZone ? enemyZone.clientHeight : null,
      barFound: !!bar,
      barTop: bar ? Math.round(bar.getBoundingClientRect().top) : null,
      handW: hand ? Math.round(hand.scrollWidth) : null,
      handClientW: hand ? Math.round(hand.clientWidth) : null,
      vw: window.innerWidth,
    };
  });
  console.log(JSON.stringify(info, null, 1));
  await browser.close();
}
main();
