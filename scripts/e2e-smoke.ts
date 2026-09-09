// 端到端冒烟测试：标题 → 创建角色 → NPC帮助 → 地图 → 首场战斗 → 执行结算 → 回合推进
// 使用系统 Edge（channel: 'msedge'），无需下载浏览器。
// 运行: npx tsx scripts/e2e-smoke.ts  （或 node --experimental-strip-types）
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

  // 1. 标题界面
  check('标题界面渲染', await page.getByRole('button', { name: /开始冒险/ }).count() === 1);

  // 2. 进入角色创建
  await page.getByRole('button', { name: /开始冒险/ }).first().click();
  await page.waitForTimeout(1000);
  check('角色创建界面', await page.getByText('创建角色').count() >= 1);

  // 3. 填写名字 + 选职业
  const input = page.locator('input[type="text"]');
  await input.fill('E2E勇者');
  await page.getByText('坚韧不拔的近战专家').first().click();
  await page.waitForTimeout(300);
  const startBtns = page.getByRole('button', { name: /开始冒险/ });
  await startBtns.last().click();
  await page.waitForTimeout(1200);

  // 4. NPC 帮助页 → 拒绝
  const rejectBtn = page.getByRole('button', { name: '拒绝', exact: true });
  check('NPC帮助页出现', await rejectBtn.count() === 1);
  if (await rejectBtn.count() === 1) {
    await rejectBtn.click();
    await page.waitForTimeout(1500);
  }

  // 5. 地图
  const mapTitle = await page.getByText('冒险地图').count();
  check('进入地图界面', mapTitle >= 1);

  // 6. 点击第一个可用节点（SVG 节点）——通过点击地图中部偏上的可点击圆形
  // 地图节点是 SVG <g>，Playwright 可点击；取发光的第一个
  const mapClicked = await page.evaluate(() => {
    const gs = Array.from(document.querySelectorAll('svg g'));
    const clickable = gs.find((g) => g.className?.baseVal === 'cursor-pointer');
    if (!clickable) return false;
    (clickable as unknown as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  });
  check('地图节点可点击', mapClicked);
  await page.waitForTimeout(1500);

  // 7. 战斗界面
  const battleText = await page.getByText('执行结算').count();
  check('进入战斗界面', battleText >= 1);
  check('抽到手牌', await page.evaluate(() => document.body.innerText.includes('将卡牌置入序列槽')));

  // 8. 放置手牌到槽位：优先 store 直连（dev），生产环境用真实鼠标拖拽
  let placed = await page.evaluate(() => {
    const w = window as unknown as { __gameStore?: { getState: () => { hand: { uuid: string }[]; addToPipeline: (u: string, i: number) => void } } };
    if (w.__gameStore) {
      const s = w.__gameStore.getState();
      let slot = 0;
      for (const card of s.hand) {
        s.addToPipeline(card.uuid, slot);
        slot++;
        if (slot >= 5) break;
      }
      return slot;
    }
    return -1;
  });

  if (placed === -1) {
    // 生产路径：真实指针拖拽（dnd-kit PointerSensor: down → move ≥5px → up）
    placed = 0;
    for (let i = 0; i < 5; i++) {
      const from = await page.evaluate(() => {
        const cards = document.querySelectorAll('[data-testid="hand-card"], .cursor-grab');
        const el = cards[0] as HTMLElement | undefined;
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 - 20 };
      });
      const to = await page.evaluate((slotIdx) => {
        const slots = Array.from(document.querySelectorAll('[data-slot-index]')) as HTMLElement[];
        const el = slots[slotIdx];
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }, i);
      if (!from || !to) break;
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 5 });
      await page.mouse.move(to.x, to.y, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(400);
      placed++;
    }
  }
  check('放置卡牌到管道', placed > 0, `placed=${placed}`);

  if (placed > 0) {
    // 9. 执行结算
    await page.getByRole('button', { name: /执行结算/ }).click();
    await page.waitForTimeout(500);
    // 跳过动画加速（dev 环境生效；生产环境自然等待动画结束）
    await page.evaluate(() => {
      const w = window as unknown as { __gameStore?: { getState: () => { requestSkip: () => void } } };
      w.__gameStore?.getState().requestSkip();
    });
    // 等待结算完成（生产动画全速约 3.5s，多留余量）
    await page.waitForTimeout(4500);

    // 10. 结算总结出现并可进入下一回合
    const summaryVisible = await page.evaluate(() => document.body.innerText.includes('点击进入下一回合') || document.body.innerText.includes('总伤害'));
    check('回合结算完成', summaryVisible);

    // 点击进入下一回合（优先按钮，回退到总结区域点击）
    const nextBtn = page.getByRole('button', { name: /下一回合/ });
    if (await nextBtn.count() === 1) {
      await nextBtn.click();
    } else {
      await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('div'));
        const summary = els.find((e) => e.textContent?.includes('点击进入下一回合') && e.children.length < 6);
        if (summary) (summary as HTMLElement).click();
      });
    }
    await page.waitForTimeout(1200);
    const turn2 = await page.evaluate(() => document.body.innerText.includes('回合 2'));
    check('进入第2回合', turn2);
  }

  // 11. 无 JS 错误（过滤资源加载噪音）
  const realErrors = consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('404'));
  check('无 JS 运行时错误', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\n===== E2E 冒烟测试结果 =====');
  for (const r of results) console.log(r);
  console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('E2E crashed:', e);
  process.exit(1);
});
