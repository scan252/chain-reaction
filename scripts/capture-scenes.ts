// 拍 奖励/商店/休息/结算（真实开局后注入场景数据）
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5199';
const OUT = process.env.SHOT_DIR ?? '/tmp/cr-after';

type RS = {
  getState: () => {
    scene: string;
    masterDeck: { templateId: string; name: string; type: string; baseValue: number; effectId: string; description: string; color: string; rarity: string; archetype: string }[];
    startNewRun: () => void;
    playerProfile: unknown;
  };
  setState: (s: Record<string, unknown>) => void;
};

async function enterMap(page: import('playwright').Page) {
  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.replace(/\s/g, '').includes('开始冒险'));
    t?.click();
  });
  await page.waitForTimeout(900);
  const hasInput = await page.evaluate(() => !!document.querySelector('input'));
  if (hasInput) {
    await page.evaluate(() => {
      const input = document.querySelector('input')!;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, '观月');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('坚韧'))?.click();
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter((b) =>
        b.textContent?.replace(/\s/g, '').includes('开始冒险') && !b.hasAttribute('disabled'));
      btns[btns.length - 1]?.click();
    });
    await page.waitForTimeout(1300);
  }
  // NPC 页面：拒绝
  const scene = await page.evaluate(() => (window as unknown as { __runStore?: RS }).__runStore?.getState().scene);
  if (scene === 'NPC_HELP') {
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.replace(/\s/g, '') === '拒绝')?.click();
    });
    await page.waitForTimeout(1300);
  }
  console.log('[scene]', await page.evaluate(() => (window as unknown as { __runStore?: RS }).__runStore?.getState().scene));
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1300);

  await enterMap(page);

  // ===== 奖励屏 =====
  await page.evaluate(() => {
    const rs = (window as unknown as { __runStore?: RS }).__runStore!;
    const deck = rs.getState().masterDeck;
    const pick = [deck[2] ?? deck[0], deck[5] ?? deck[1], deck[0]].filter(Boolean).map((card) => ({ card }));
    rs.setState({
      scene: 'REWARD',
      pendingReward: { cards: pick, gold: 66, bonusSlot: false, currentRound: 1, totalRounds: 2, allCards: [pick] },
      rewardCardCollected: false,
    });
  });
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${OUT}/11-reward.png` });

  // 特殊奖励变体（+1 序列槽）
  await page.evaluate(() => {
    const rs = (window as unknown as { __runStore?: RS }).__runStore!;
    const deck = rs.getState().masterDeck;
    const pick = [deck[4] ?? deck[0], deck[7] ?? deck[1], deck[1]].filter(Boolean).map((card) => ({ card }));
    rs.setState({
      pendingReward: { cards: pick, gold: 66, bonusSlot: true, currentRound: 1, totalRounds: 2, allCards: [pick] },
      rewardCardCollected: false,
    });
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/12-reward-bonus.png` });

  // ===== 商店 =====
  await page.evaluate(() => {
    const rs = (window as unknown as { __runStore?: RS }).__runStore!;
    const deck = rs.getState().masterDeck;
    const items = [deck[3] ?? deck[0], deck[6] ?? deck[1], deck[8] ?? deck[2]].filter(Boolean).map((c, i) => ({
      id: `shot-${i}`, type: 'BUY_CARD', card: c, cost: [48, 65, 82][i],
    }));
    rs.setState({ scene: 'SHOP', shopItems: items, gold: 100 });
  });
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${OUT}/13-shop.png` });

  // ===== 休息处 =====
  await page.evaluate(() => {
    const rs = (window as unknown as { __runStore?: RS }).__runStore!;
    rs.setState({ scene: 'MAP', showRestChoice: true });
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/14-rest.png` });

  // ===== 结算屏 =====
  await page.evaluate(() => {
    const rs = (window as unknown as { __runStore?: RS }).__runStore!;
    rs.setState({
      showRestChoice: false,
      scene: 'GAME_END',
      runResult: 'VICTORY',
      gameStats: { totalDamage: 486, totalArmor: 173, effectiveArmor: 151, defeatedEnemies: ['史莱姆', '骷髅兵', '暗影刺客', '石像鬼', '熔岩巨兽'] },
    });
  });
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${OUT}/15-end.png` });

  await browser.close();
  console.log('done');
}

main().catch((e) => { console.error(e); process.exit(1); });
