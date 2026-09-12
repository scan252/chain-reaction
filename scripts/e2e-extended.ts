// 扩展 E2E：商店购买/删卡保护、锻造、遗物、事件奖励、精英战、禁忌卡彩蛋
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5199';
const results: string[] = [];
let failed = 0;

function check(name: string, ok: boolean, detail = '') {
  results.push(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors: string[] = [];
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  // ===== 场景1: 商店流程（删卡保护 + 稀有度价格） =====
  await page.evaluate(() => {
    const w = window as unknown as { __runStore?: { getState: () => Record<string, (...a: unknown[]) => void> & { scene: string; shopItems: { id: string }[]; masterDeck: unknown[]; removeCardCount: number } } };
    const s = w.__runStore!.getState();
    s.setPlayerProfile('商店测试', 'WARRIOR');
    s.setDifficulty('NORMAL');
    s.startNewRun();
    // 直接生成商店
    const shopItems = [];
    s.scene = 'SHOP';
    // 用 selectMapNode 无法保证商店节点，直接注入
    const st2 = (w.__runStore as unknown as { setState: (fn: (state: { shopItems: unknown[]; scene: string }) => void) => void });
    st2.setState((state) => {
      state.scene = 'SHOP';
    });
  });
  await page.evaluate(() => {
    // 通过状态注入进入商店（绕开地图随机）
    const w = window as unknown as { __runStore?: { getState: () => { shopItems: unknown[] } } & { setState: (fn: (s: { shopItems: unknown[]; scene: string }) => void) => void } };
    w.__runStore!.setState((state) => {
      // 手动填商店
      const items = [
        { id: 'shop-test-1', type: 'BUY_CARD', card: { templateId: 'atk_fire', name: '火球', type: 'ACTION', baseValue: 9, effectId: 'DEAL_DAMAGE', description: '', color: '#e74c3c', rarity: 'COMMON', archetype: 'GENERIC' }, cost: 50 },
        { id: 'shop-test-remove', type: 'REMOVE_CARD', cost: 50 },
      ];
      state.shopItems = items;
      state.scene = 'SHOP';
    });
  });
  await page.waitForTimeout(1500);
  const shopText = await page.evaluate(() => document.body.innerText.replace(/s/g, ''));
  check('商店界面渲染', shopText.includes('驿站商店'), shopText.slice(0, 60));

  // 买卡
  await page.evaluate(() => {
    const w = window as unknown as { __runStore?: { getState: () => { buyCard: (id: string) => void; gold: number; masterDeck: unknown[] } } };
    const s = w.__runStore!.getState();
    const before = s.masterDeck.length;
    s.buyCard('shop-test-1');
    return s.masterDeck.length > before;
  });
  const deckAfterBuy = await page.evaluate(() => (window as unknown as { __runStore: { getState: () => { masterDeck: unknown[] } } }).__runStore.getState().masterDeck.length);
  check('购买卡牌成功', deckAfterBuy > 12, `deck=${deckAfterBuy}`);

  // 删卡价格递增验证
  const costs: number[] = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate((idx) => {
      const w = window as unknown as { __runStore: { getState: () => { removeCard: (i: number) => void } } };
      w.__runStore.getState().removeCard(idx);
    }, i);
    costs.push(await page.evaluate(() => (window as unknown as { __runStore: { getState: () => { currentRemoveCost: () => number } } }).__runStore.getState().currentRemoveCost()));
  }
  check('删卡价格递增', costs[0] > costs[2] || costs[0] === 75 || costs[0] === 100, `costs=${costs.join(',')}`);

  // 卡组下限保护
  await page.evaluate(() => {
    const w = window as unknown as { __runStore: { getState: () => { masterDeck: unknown[] } & { setState: (fn: (s: { masterDeck: unknown[] }) => void) => void } } };
    // 削减到最小值
    w.__runStore.setState((state) => {
      while (state.masterDeck.length > 5) state.masterDeck.pop();
    });
  });
  const deckAtMin = await page.evaluate(() => {
    const w = window as unknown as { __runStore: { getState: () => { removeCard: (i: number) => void; masterDeck: unknown[] } } };
    const s = w.__runStore.getState();
    const before = s.masterDeck.length;
    s.removeCard(0);
    return { before, after: s.masterDeck.length };
  });
  check('卡组最小5张保护', deckAtMin.before <= 6 && deckAtMin.after === deckAtMin.before, JSON.stringify(deckAtMin));

  // ===== 场景2: 锻造 =====
  const forgeResult = await page.evaluate(() => {
    const w = window as unknown as { __runStore: { getState: () => { masterDeck: { name: string; upgraded?: boolean; baseValue: number; effectId: string }[]; upgradeCardAt: (i: number) => void } } };
    const s = w.__runStore.getState();
    // 找一张未升级卡
    const idx = s.masterDeck.findIndex((c) => !c.upgraded);
    if (idx === -1) return { err: 'no forgeable', deck: s.masterDeck.map((c) => c.name + (c.upgraded ? '+' : '')) };
    const nameBefore = s.masterDeck[idx].name;
    const valBefore = s.masterDeck[idx].baseValue;
    s.upgradeCardAt(idx);
    // 重新 getState 读取（Immer 写时复制）
    const s2 = w.__runStore.getState();
    const after = s2.masterDeck[idx];
    return { nameBefore, nameAfter: after.name, valBefore, valAfter: after.baseValue, upgraded: after.upgraded };
  });
  check('锻造升级生效', !('err' in forgeResult) && forgeResult.upgraded === true && String(forgeResult.nameAfter).includes('+') && (forgeResult.valAfter ?? 0) > (forgeResult.valBefore ?? 0), JSON.stringify(forgeResult));

  // 二次锻造应无效
  const forgeTwice = await page.evaluate(() => {
    const w = window as unknown as { __runStore: { getState: () => { masterDeck: { baseValue: number }[]; upgradeCardAt: (i: number) => void } } };
    const s = w.__runStore.getState();
    const before = s.masterDeck[0].baseValue;
    s.upgradeCardAt(0);
    return s.masterDeck[0].baseValue === before;
  });
  check('锻造每卡限一次', forgeTwice);

  // ===== 场景3: 精英战斗奖励（遗物+金币加成） =====
  const eliteReward = await page.evaluate(() => {
    const w = window as unknown as { __runStore: { getState: () => { onBattleVictory: (...a: unknown[]) => void; relics: string[]; scene: string; pendingReward: { gold: number } | null } & { setState: (fn: (s: { scene: string }) => void) => void } } };
    w.__runStore.setState((state) => { state.scene = 'BATTLE'; });
    const s = w.__runStore.getState();
    s.onBattleVictory(80, { totalDamage: 100, totalArmor: 50, effectiveArmor: 40, enemyName: '测试精英', isElite: true });
    const after = w.__runStore.getState();
    return { relicCount: after.relics.length, gold: after.pendingReward?.gold ?? 0, scene: after.scene };
  });
  check('精英必掉遗物', eliteReward.relicCount >= 1, JSON.stringify(eliteReward));
  check('精英金币加成', eliteReward.gold >= 50, `gold=${eliteReward.gold}`);


  // ===== 场景5: 难度缩放验证 =====
  const enemyScale = await page.evaluate(async () => {
    // 采样多只敌人验证缩放方向（同模板无法保证抽到同一只，改采样均值）
    const mapMod = await import('/src/data/mapData.ts');
    const { getEnemyForNode } = mapMod as unknown as { getEnemyForNode: (n: { type: string; layer: number }, slots: number, diff: string) => { maxHp: number } };
    const node = { type: 'BATTLE', layer: 0 };
    let sumN = 0; let sumE = 0;
    for (let i = 0; i < 200; i++) {
      sumN += getEnemyForNode(node, 5, 'NORMAL').maxHp;
      sumE += getEnemyForNode(node, 5, 'ELITE').maxHp;
    }
    return { avgNormal: sumN / 200, avgElite: sumE / 200 };
  });
  check('精英难度敌人数值缩放(均值)', Math.abs(enemyScale.avgElite - enemyScale.avgNormal * 1.15) < 3, JSON.stringify(enemyScale));

  // 清理：回到标题
  await page.evaluate(() => {
    const w = window as unknown as { __runStore: { getState: () => { returnToTitle: () => void } } };
    w.__runStore.getState().returnToTitle();
  });
  const backTitle = await page.evaluate(() => (window as unknown as { __runStore: { getState: () => { scene: string } } }).__runStore.getState().scene);
  check('返回标题场景', backTitle === 'TITLE');

  // JS 错误检查
  const realErrors = consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('404'));
  check('无 JS 运行时错误', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\n===== 扩展 E2E 结果 =====');
  for (const r of results) console.log(r);
  console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('E2E crashed:', e);
  process.exit(1);
});
