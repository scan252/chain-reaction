// ============================================================
// 蒙特卡洛平衡模拟器
// 用法: npx tsx scripts/simulate.ts [runsPerConfig]
// 指标目标带见 docs/BALANCE.md §8
// ============================================================
import {
  executePipelineV2,
  resolveSlotCombat,
  applyRelicEffectsToContext,
  isAttackEffect,
  isShieldEffect,
} from '../src/engine/effectRegistry';
import { INITIAL_CONTEXT, AttackPattern, StatusEffectType } from '../src/types';
import type {
  CardTemplate, CardInstance, Enemy, EnemyIntent, SlotStatus, ExecutionContext,
} from '../src/types';
import {
  ALL_CARD_POOL, buildStarterDeck, generateRewardCards, upgradeCard,
} from '../src/data/cardData';
import { generateEnemyIntent, generateGameMap, getEnemyForNode } from '../src/data/mapData';
import { PLAYER, PIPELINE, KEYWORD, STATUS } from '../src/config/balance';

const RUNS = Number(process.argv[2] ?? 400);

// ---------- 工具 ----------
let seedCounter = 0;
function uuid(): string {
  seedCounter += 1;
  return `sim-${seedCounter}`;
}
function toInstance(t: CardTemplate): CardInstance {
  return { ...t, uuid: uuid() };
}
function shuffle<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function pick<T>(a: T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}

// ---------- 战斗模拟（镜像 gameStore 规则） ----------

interface SimResult {
  win: boolean;
  turns: number;
  hpLoss: number;
}

function buildCtx(pipelineLen: number, opts: {
  globalDamageBonus: number; battleChainBonus: number; playerHp: number; playerMaxHp: number;
  hpLostThisBattle: number; weakened: boolean; attackedSlotCount: number;
}): ExecutionContext {
  return {
    ...INITIAL_CONTEXT,
    slotArmors: new Array(pipelineLen).fill(0),
    slotDamageContributions: new Array(pipelineLen).fill(0),
    globalDamageBonus: opts.globalDamageBonus,
    chainBonusPerTrigger: opts.battleChainBonus,
    playerHpCurrent: opts.playerHp,
    hpLostThisBattle: opts.hpLostThisBattle,
    deadlyEligible: opts.playerHp > 0 && opts.playerHp <= Math.floor(opts.playerMaxHp * KEYWORD.DEADLY_THRESHOLD),
    weakened: opts.weakened,
    attackedSlotCount: opts.attackedSlotCount,
  };
}

/** 智能策略 v2（熟练玩家模拟） */
function smartPlacement(hand: CardInstance[], slots: number, intent: EnemyIntent, pipelineLen: number, playerHp = 100): (CardInstance | null)[] {
  const pipeline: (CardInstance | null)[] = new Array(pipelineLen).fill(null);
  const locked = new Set(intent.lockedSlots);
  let freeSlots = [...Array(pipelineLen).keys()].filter((i) => !locked.has(i));

  const isAtk = (c: CardInstance) => isAttackEffect(c.effectId);
  const isShd = (c: CardInstance) => isShieldEffect(c.effectId);
  const isMulMod = (c: CardInstance) => ['MULTIPLY_NEXT', 'REPEAT_NEXT', 'CHAIN_IMBUE'].includes(c.effectId);

  const atks = hand.filter((c) => isAtk(c) && !c.burnCost).sort((a, b) => (a.chain ?? 0) - (b.chain ?? 0) || b.baseValue - a.baseValue);
  const shds = hand.filter((c) => isShd(c) && !c.burnCost).sort((a, b) => b.baseValue - a.baseValue);
  const mods = hand.filter((c) => c.type === 'MODIFIER');
  const mulMods = mods.filter(isMulMod).sort((a, b) => b.baseValue - a.baseValue);
  const otherMods = mods.filter((m) => !isMulMod(m));
  const burns = hand.filter((c) => c.burnCost && playerHp > 25).sort((a, b) => b.baseValue - a.baseValue);

  const put = (c: CardInstance, slot?: number) => {
    if (freeSlots.length === 0) return false;
    const idx = slot !== undefined && freeSlots.includes(slot) ? slot : freeSlots[0];
    pipeline[idx] = c;
    freeSlots = freeSlots.filter((s) => s !== idx);
    return true;
  };

  const maxIncoming = Math.max(0, ...intent.attacks.map((a) => a.damage));

  if (intent.pattern === AttackPattern.WEAK_POINT_SNIPE) {
    // 反狙击：只放一张顶级盾作为最高数值卡，配 X2；其余槽放低数值攻击/盾
    const topShield = shds[0];
    if (topShield) {
      const mod = mulMods[0];
      if (mod) put(mod);
      put(topShield);
    }
    // 其余：小攻击牌（数值低于盾）+ 普通盾
    for (const c of [...atks.sort((a, b) => a.baseValue - b.baseValue).slice(0, 2), ...shds.slice(1, 3), ...otherMods]) {
      if (c === topShield) continue;
      put(c);
    }
    return pipeline;
  }

  // 普通意图：盾对位受击槽（伤害降序），必要时 X2 加倍最大盾
  const sortedAttacks = [...intent.attacks].sort((a, b) => b.damage - a.damage);
  const topShield = shds[0];
  const needBoost = topShield && maxIncoming > topShield.baseValue && mulMods[0] !== undefined;

  let shieldIdx = 0;
  for (const atk of sortedAttacks) {
    if (atk.slotIndex < 0) continue;
    const shield = shds[shieldIdx];
    if (!shield) break;
    let wantSlot = freeSlots.includes(atk.slotIndex) ? atk.slotIndex : freeSlots[0];
    if (needBoost && shield === topShield) {
      // 修饰卡必须放在盾的左侧相邻空位（执行顺序: 左→右）
      const modSlot = freeSlots.filter((f) => f < wantSlot).sort((a, b) => b - a)[0];
      if (modSlot !== undefined) {
        put(mulMods[0], modSlot);
        wantSlot = freeSlots.includes(atk.slotIndex) ? atk.slotIndex : freeSlots[0];
      }
      put(shield, wantSlot);
    } else {
      put(shield, wantSlot);
    }
    shieldIdx++;
  }

  // 进攻队列：修饰卡 + 攻击 + 焚身 + 其他修饰
  const queue: CardInstance[] = [];
  const boostUsed = needBoost;
  const remainingMul = boostUsed ? mulMods.slice(1) : mulMods;
  const damageQueue = [...burns, ...atks].sort((a, b) => {
    // 连锁卡依然靠后，其余按数值降序（让修饰卡吃到最大数值）
    const ac = a.chain ?? 0;
    const bc = b.chain ?? 0;
    if (ac !== bc) return ac - bc;
    return b.baseValue - a.baseValue;
  });
  if (remainingMul[0] && damageQueue.length > 0) queue.push(remainingMul[0]);
  queue.push(...damageQueue, ...otherMods);

  for (const c of queue) put(c);

  // 剩余盾牌也填进剩余槽位
  for (const c of shds.slice(shieldIdx)) put(c);

  return pipeline;
}

/** 随机策略 */
function randomPlacement(hand: CardInstance[], slots: number, intent: EnemyIntent, pipelineLen: number): (CardInstance | null)[] {
  const pipeline: (CardInstance | null)[] = new Array(pipelineLen).fill(null);
  const locked = new Set(intent.lockedSlots);
  const freeSlots = shuffle([...Array(pipelineLen).keys()].filter((i) => !locked.has(i)));
  const chosen = shuffle([...hand]).slice(0, freeSlots.length);
  chosen.forEach((c, i) => {
    pipeline[freeSlots[i]] = c;
  });
  return pipeline;
}

type Strategy = 'smart' | 'random' | 'novice' | 'chain' | 'resonance' | 'riposte' | 'burn';

/** 新手策略：会把盾放到受击槽位（有预览提示），但进攻随机摆放 */
function novicePlacement(hand: CardInstance[], slots: number, intent: EnemyIntent, pipelineLen: number): (CardInstance | null)[] {
  const pipeline: (CardInstance | null)[] = new Array(pipelineLen).fill(null);
  const locked = new Set(intent.lockedSlots);
  let freeSlots = [...Array(pipelineLen).keys()].filter((i) => !locked.has(i));
  const shds = hand.filter((c) => isShieldEffect(c.effectId)).sort((a, b) => b.baseValue - a.baseValue);
  const rest = shuffle(hand.filter((c) => !isShieldEffect(c.effectId)));
  let si = 0;
  for (const atk of [...intent.attacks].sort((a, b) => b.damage - a.damage)) {
    if (atk.slotIndex < 0 || si >= shds.length) continue;
    const want = freeSlots.includes(atk.slotIndex) ? atk.slotIndex : freeSlots[0];
    pipeline[want] = shds[si++];
    freeSlots = freeSlots.filter((f) => f !== want);
  }
  for (const c of [...rest, ...shds.slice(si)]) {
    if (freeSlots.length === 0) break;
    pipeline[freeSlots.shift()!] = c;
  }
  return pipeline;
}

function place(strategy: Strategy, hand: CardInstance[], slots: number, intent: EnemyIntent, pipelineLen: number, playerHp = 100): (CardInstance | null)[] {
  if (strategy === 'random') return randomPlacement(hand, slots, intent, pipelineLen);
  if (strategy === 'novice') return novicePlacement(hand, slots, intent, pipelineLen);
  return smartPlacement(hand, slots, intent, pipelineLen, playerHp);
}

export function simulateBattle(
  deck: CardTemplate[],
  enemyIn: Enemy,
  strategy: Strategy,
  playerHpIn: number,
  playerMaxHp: number,
): SimResult {
  let drawPile = shuffle(deck.map(toInstance));
  let discardPile: CardInstance[] = [];
  let hand: CardInstance[] = [];

  const enemy: Enemy = { ...enemyIn, intent: generateEnemyIntent(enemyIn, PIPELINE.INITIAL_SLOTS) };
  let slotStatuses: SlotStatus[] = Array.from({ length: PIPELINE.INITIAL_SLOTS }, () => ({ isLocked: false, statusEffects: [] }));

  let playerHp = playerHpIn;
  let globalDamageBonus = 0;
  let battleChainBonus = 0;
  const battleBurnPaid: string[] = [];
  let hpLostThisBattle = Math.max(0, playerMaxHp - playerHpIn);
  let turns = 0;
  let vulnerableStacks = 0;
  let weakened = false;

  const draw = () => {
    let needed = PIPELINE.HAND_DRAW_COUNT;
    while (needed > 0) {
      if (drawPile.length === 0) {
        if (discardPile.length === 0) break;
        drawPile = shuffle(discardPile.map((c) => ({ ...c, uuid: uuid() })));
        discardPile = [];
      }
      const c = drawPile.pop();
      if (c) {
        hand.push(c);
        needed--;
      }
    }
  };

  // Boss 二阶段检测
  const tryPhase2 = () => {
    if (enemy.isBoss && enemy.phase2Patterns && enemy.currentHp <= Math.floor(enemy.maxHp / 2)) {
      if (enemy.attackPatterns !== enemy.phase2Patterns) {
        enemy.attackPatterns = enemy.phase2Patterns;
      }
    }
  };

  for (turns = 1; turns <= 30; turns++) {
    draw();
    if (hand.length === 0) break;

    const pipeline = place(strategy, hand, PIPELINE.INITIAL_SLOTS, enemy.intent, PIPELINE.INITIAL_SLOTS, playerHp);
    const playedCards = pipeline.filter(Boolean);
    if (playedCards.length === 0) break;
    hand = hand.filter((c) => !pipeline.some((p) => p?.uuid === c.uuid));

    const attackedSlotCount = new Set(enemy.intent.attacks.map((a) => a.slotIndex).filter((i) => i >= 0)).size
      + (enemy.intent.pattern === AttackPattern.WEAK_POINT_SNIPE ? 1 : 0);

    let ctx = buildCtx(pipeline.length, {
      globalDamageBonus,
      battleChainBonus,
      playerHp,
      playerMaxHp,
      hpLostThisBattle,
      weakened,
      attackedSlotCount,
      paidBurnCardIds: battleBurnPaid,
    });

    ctx = executePipelineV2(pipeline, ctx, slotStatuses);
    ctx = applyRelicEffectsToContext(ctx, pipeline, []);

    // 超导持久化
    for (const c of pipeline) {
      if (c?.effectId === 'SUPERCONDUCTOR') battleChainBonus += c.baseValue;
    }

    const combat = resolveSlotCombat(ctx, enemy.intent, pipeline, vulnerableStacks, []);

    // 敌方非攻击意图
    const intent = enemy.intent;
    if (intent.pattern === AttackPattern.FORTIFY) enemy.armor += intent.buffValue ?? 10;
    else if (intent.pattern === AttackPattern.ENRAGE) enemy.baseDamage += intent.buffValue ?? 3;
    else if (intent.pattern === AttackPattern.WEAKEN) weakened = true;

    // 玩家扣血
    playerHp = Math.max(0, playerHp - combat.totalPlayerHpLoss);
    hpLostThisBattle += combat.totalPlayerHpLoss;
    for (const id of ctx.paidBurnCardIds) if (!battleBurnPaid.includes(id)) battleBurnPaid.push(id);
    const burnCost = Math.min(ctx.totalBurnHpCost, Math.max(0, playerHp - 1));
    playerHp -= burnCost;
    hpLostThisBattle += burnCost;

    vulnerableStacks += combat.newVulnerableStacks;

    if (combat.perfectBlockTrigger) globalDamageBonus += 4;
    if (combat.resonanceTrigger) globalDamageBonus += 1;

    // 总伤害
    const totalDmg = ctx.accumulatedDamage + combat.reflectDamageBonus + combat.riposteDamage;
    let dmg = totalDmg;
    if (enemy.armor > 0) {
      const absorbed = Math.min(enemy.armor, dmg);
      enemy.armor -= absorbed;
      dmg -= absorbed;
    }
    enemy.currentHp = Math.max(0, enemy.currentHp - dmg);

    // 弃牌
    for (const c of pipeline) if (c) discardPile.push(c);
    discardPile.push(...hand);
    hand = [];

    // 燃烧标记
    for (const bs of combat.slotsToMarkBurning) {
      if (!slotStatuses[bs].statusEffects.some((e) => e.type === StatusEffectType.BURNING)) {
        slotStatuses[bs].statusEffects.push({ type: StatusEffectType.BURNING, stacks: 1, duration: STATUS.DEFAULT_DURATION });
      }
    }
    // 焦土
    for (const is of ctx.slotsToIgnite) {
      const ex = slotStatuses[is].statusEffects.find((e) => e.type === StatusEffectType.IGNITED);
      if (ex) ex.duration = 3;
      else slotStatuses[is].statusEffects.push({ type: StatusEffectType.IGNITED, stacks: 1, duration: 3 });
    }

    if (enemy.currentHp <= 0) return { win: true, turns, hpLoss: playerMaxHp >= 0 ? hpLostThisBattle - Math.max(0, playerMaxHp - playerHpIn) : 0 };
    if (playerHp <= 0) return { win: false, turns, hpLoss: hpLostThisBattle };

    tryPhase2();

    // 下回合意图
    const newIntent = generateEnemyIntent(
      { baseDamage: enemy.baseDamage, damageVariance: enemy.damageVariance, attackPatterns: enemy.attackPatterns, chargeMultiplier: enemy.chargeMultiplier },
      PIPELINE.INITIAL_SLOTS,
    );
    enemy.intent = newIntent;
    enemy.chargeMultiplier = newIntent.pattern === AttackPattern.CHARGE_UP ? (newIntent.chargeMultiplier ?? 1) : 1;

    slotStatuses = slotStatuses.map((ss) => ({ isLocked: false, statusEffects: ss.statusEffects }));
    for (const l of newIntent.lockedSlots) {
      if (l >= 0 && l < slotStatuses.length) slotStatuses[l].isLocked = true;
    }

    // 回合结束递减
    weakened = false; // 简化：衰弱只影响被施放的下回合（本模型已应用）
    // 破绽层数跨回合常驻（对双方略保守的简化）
    for (const ss of slotStatuses) {
      ss.statusEffects = ss.statusEffects.map((e) => ({ ...e, duration: e.duration - 1 })).filter((e) => e.duration > 0);
    }
  }

  return { win: false, turns, hpLoss: hpLostThisBattle };
}

// ---------- 流派卡组构造（模拟成长中的成型卡组） ----------

export function archetypeDeck(archetype: Archetype, extraCards: number): CardTemplate[] {
  // 模拟定向构筑玩家：删掉部分初始白板，专注流派选卡
  const deck = buildStarterDeck();
  // 删 4 小石弹 + 2 木盾
  for (let i = 0; i < 4; i++) { const idx = deck.findIndex((c) => c.templateId === 'atk_stone'); if (idx >= 0) deck.splice(idx, 1); }
  for (let i = 0; i < 2; i++) { const idx = deck.findIndex((c) => c.templateId === 'def_wood'); if (idx >= 0) deck.splice(idx, 1); }
  const pool = ALL_CARD_POOL.filter((c) => c.archetype === archetype);
  for (let i = 0; i < extraCards; i++) {
    const rarityRoll = Math.random();
    const tier = rarityRoll < 0.07 ? 'RARE' : rarityRoll < 0.4 ? 'UNCOMMON' : 'COMMON';
    const tierPool = pool.filter((c) => c.rarity === tier);
    const src = tierPool.length > 0 ? tierPool : pool;
    if (src.length > 0) deck.push({ ...pick(src) });
  }
  return deck;
}

// ---------- 单局模拟 ----------

interface RunOutcome {
  victory: boolean;
  layerReached: number;
  hpCurve: number[];
  eliteHpLoss: number[];
  bossTurns: number;
}

function simulateRun(strategy: Strategy, difficulty: Difficulty): RunOutcome {
  const map = generateGameMap();
  const diff = difficulty;

  const deck = buildStarterDeck();
  let playerHp = PLAYER.MAX_HP;
  const hpCurve: number[] = [playerHp];
  const eliteHpLoss: number[] = [];
  let victory = false;
  let bossTurns = 0;

  for (let layer = 0; layer < map.layers.length; layer++) {
    const node = pick(map.layers[layer]); // 随机选路

    if (node.type === 'REST') {
      if (playerHp < PLAYER.MAX_HP * 0.6) {
        playerHp = Math.min(PLAYER.MAX_HP, playerHp + Math.floor(PLAYER.MAX_HP * 0.3));
      } else {
        // 锻造最强攻击卡
        const idx = deck.reduce((best, c, i) => (isAttackEffect(c.effectId) && !c.upgraded && (best === -1 || c.baseValue > deck[best].baseValue) ? i : best), -1);
        if (idx >= 0) deck[idx] = upgradeCard(deck[idx]);
      }
      hpCurve.push(playerHp);
      continue;
    }
    if (node.type === 'SHOP') {
      // 简化：60% 概率买一张卡
      if (Math.random() < 0.6) deck.push({ ...pick(ALL_CARD_POOL) });
      hpCurve.push(playerHp);
      continue;
    }
    if (node.type === 'REWARD') {
      const roll = Math.random();
      if (roll < 0.34) {
        const [rc] = generateRewardCards(1);
        deck.push({ ...rc.card });
      } else if (roll < 0.67) {
        playerHp = Math.min(PLAYER.MAX_HP, playerHp + Math.floor(PLAYER.MAX_HP * 0.3));
      }
      hpCurve.push(playerHp);
      continue;
    }

    // 战斗/精英/Boss
    const enemy = getEnemyForNode(node, PIPELINE.INITIAL_SLOTS, diff);
    const result = simulateBattle(deck, enemy, strategy, playerHp, PLAYER.MAX_HP);
    playerHp = Math.max(1, playerHp - result.hpLoss);

    if (node.type === 'ELITE') {
      eliteHpLoss.push(result.hpLoss);
      // 精英战后篝火：回复 15% 最大HP
      playerHp = Math.min(PLAYER.MAX_HP, playerHp + Math.floor(PLAYER.MAX_HP * 0.25));
      // 精英奖励：2张卡（保底1稀有）
      const r1 = generateRewardCards(3, { guaranteeRare: true });
      const r2 = generateRewardCards(3);
      deck.push({ ...pick(r1).card });
      if (Math.random() < 0.7) deck.push({ ...pick(r2).card });
    } else if (node.type === 'BATTLE') {
      // 普通奖励：平均2张卡
      const r = generateRewardCards(3);
      deck.push({ ...pick(r).card });
      if (Math.random() < 1.0) deck.push({ ...pick(generateRewardCards(3)).card });
    } else if (node.type === 'BOSS') {
      bossTurns = result.turns;
    }

    if (!result.win) {
      return { victory: false, layerReached: layer, hpCurve, eliteHpLoss, bossTurns };
    }
    hpCurve.push(playerHp);
    if (node.type === 'BOSS') {
      victory = true;
      break;
    }
  }

  return { victory, layerReached: map.layers.length - 1, hpCurve, eliteHpLoss, bossTurns };
}

// ---------- 主流程 ----------

function pct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

function main() {
  console.log(`\n===== 蒙特卡洛平衡模拟 (每配置 ${RUNS} 局) =====\n`);

  const configs: { name: string; strategy: Strategy; difficulty: Difficulty }[] = [
    { name: '标准·智能策略', strategy: 'smart', difficulty: 'NORMAL' },
    { name: '标准·新手策略', strategy: 'novice', difficulty: 'NORMAL' },
    { name: '标准·随机策略', strategy: 'random', difficulty: 'NORMAL' },
    { name: '精英·智能策略', strategy: 'smart', difficulty: 'ELITE' },
  ];

  for (const cfg of configs) {
    let wins = 0;
    let layerSum = 0;
    const eliteLosses: number[] = [];
    let bossTurnSum = 0;
    let bossCount = 0;
    const failLayers = new Map<number, number>();

    for (let i = 0; i < RUNS; i++) {
      const r = simulateRun(cfg.strategy, cfg.difficulty);
      if (r.victory) wins++;
      layerSum += r.layerReached;
      eliteLosses.push(...r.eliteHpLoss);
      if (r.bossTurns > 0) {
        bossTurnSum += r.bossTurns;
        bossCount++;
      }
      if (!r.victory) {
        failLayers.set(r.layerReached, (failLayers.get(r.layerReached) ?? 0) + 1);
      }
    }

    const avgEliteLoss = eliteLosses.length ? (eliteLosses.reduce((a, b) => a + b, 0) / eliteLosses.length).toFixed(1) : '-';
    const avgBossTurns = bossCount ? (bossTurnSum / bossCount).toFixed(1) : '-';
    const failStr = [...failLayers.entries()].sort((a, b) => a[0] - b[0]).map(([l, c]) => `L${l + 1}:${c}`).join(' ');

    console.log(`【${cfg.name}】胜率 ${pct(wins / RUNS)} | 平均到达层 ${(layerSum / RUNS + 1).toFixed(1)} | 精英均损血 ${avgEliteLoss} | Boss平均回合 ${avgBossTurns}`);
    console.log(`   失败分布: ${failStr || '无'}\n`);
  }

  // 流派强度对比（成型卡组 vs L4 敌人池 & Boss）
  console.log('===== 流派均衡性（成型卡组 15 张 vs 全程） =====');
  const archetypes: Archetype[] = ['CHAIN', 'RESONANCE', 'RIPOSTE', 'BURN'];
  const archWins: Record<string, number> = {};
  for (const arch of archetypes) {
    let wins = 0;
    const N = 150;
    for (let i = 0; i < N; i++) {
      const r = simulateRunArch(arch, 'NORMAL');
      if (r) wins++;
    }
    archWins[arch] = wins / 150;
    console.log(`  ${arch.padEnd(10)} 胜率 ${pct(archWins[arch])}`);
  }
  const vals = Object.values(archWins);
  const spread = Math.max(...vals) - Math.min(...vals);
  console.log(`  流派胜率极差: ${pct(spread)} (目标 ≤8%)\n`);

  // 卡牌强度参考（单卡在成型连锁卡组的贡献）
  console.log('===== 卡池数值抽查（智能策略平均回合输出） =====');
  sampleDpsCheck();
}

/** 流派专属局：初始就用该流派成型卡组 */
function simulateRunArch(arch: Archetype, difficulty: Difficulty): boolean {
  const map = generateGameMap();
  const deck = archetypeDeck(arch, 6);
  let playerHp = PLAYER.MAX_HP;

  for (let layer = 0; layer < map.layers.length; layer++) {
    const node = pick(map.layers[layer]);
    if (node.type === 'REST') {
      playerHp = Math.min(PLAYER.MAX_HP, playerHp + Math.floor(PLAYER.MAX_HP * 0.3));
      continue;
    }
    if (node.type === 'SHOP' || node.type === 'REWARD') {
      if (Math.random() < 0.5) {
        const pool = ALL_CARD_POOL.filter((c) => c.archetype === arch);
        deck.push({ ...pick(pool.length ? pool : ALL_CARD_POOL) });
      }
      continue;
    }
    const enemy = getEnemyForNode(node, PIPELINE.INITIAL_SLOTS, difficulty);
    const r = simulateBattle(deck, enemy, 'smart', playerHp, PLAYER.MAX_HP);
    playerHp = Math.max(1, playerHp - r.hpLoss);
    if (!r.win) return false;
    if (node.type === 'BOSS') return true;
    if (node.type === 'ELITE' || node.type === 'BATTLE') {
      if (node.type === 'ELITE') playerHp = Math.min(PLAYER.MAX_HP, playerHp + Math.floor(PLAYER.MAX_HP * 0.25));
      const pool = ALL_CARD_POOL.filter((c) => c.archetype === arch);
      deck.push({ ...pick(pool.length ? pool : ALL_CARD_POOL) });
    }
  }
  return true;
}

/** 单卡 DPS 抽查：构造 5 槽固定管线测输出 */
function sampleDpsCheck() {
  const scenarios: { name: string; cards: CardTemplate[] }[] = [
    { name: '白板基线 (石弹x3+盾x2)', cards: ['atk_stone', 'atk_stone', 'atk_stone', 'def_wood', 'def_wood'] },
    { name: '连锁成型 (X2+石弹+电弧+电弧+雪崩)', cards: ['mod_x2', 'atk_stone', 'ch_arc', 'ch_arc', 'ch_avalanche'] },
    { name: '共鸣成型 (双生火x3+双生冰x2)', cards: ['re_fire', 're_fire', 're_fire', 're_ice', 're_ice'] },
    { name: '反击成型 (荆棘x2+镜面+壁垒+X2)', cards: ['ri_thorn', 'ri_thorn', 'ri_mirror', 'ri_wall', 'mod_x2'] },
    { name: '焚身成型 (血偿x3+献祭+燃烧意志)', cards: ['bu_price', 'bu_price', 'bu_price', 'bu_sacrifice', 'bu_ward'] },
  ];

  const dummyIntent: EnemyIntent = {
    pattern: AttackPattern.SINGLE,
    attacks: [{ slotIndex: 4, damage: 10 }],
    lockedSlots: [],
    description: '',
  };

  for (const sc of scenarios) {
    const pipeline = sc.cards.map((id) => {
      const t = ALL_CARD_POOL.find((c) => c.templateId === id)!;
      return toInstance(t);
    });
    const statuses: SlotStatus[] = pipeline.map(() => ({ isLocked: false, statusEffects: [] }));
    const ctx = executePipelineV2(pipeline, { ...INITIAL_CONTEXT, playerHpCurrent: 100, slotArmors: pipeline.map(() => 0), slotDamageContributions: pipeline.map(() => 0) }, statuses);
    const combat = resolveSlotCombat(ctx, dummyIntent, pipeline, 0, []);
    console.log(`  ${sc.name.padEnd(28)} 输出 ${String(ctx.accumulatedDamage + combat.riposteDamage).padStart(3)} | 护盾 ${String(ctx.accumulatedArmor).padStart(3)} | 焚身代价 ${ctx.totalBurnHpCost} | 承伤 ${combat.totalPlayerHpLoss}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('simulate.ts')) main();
