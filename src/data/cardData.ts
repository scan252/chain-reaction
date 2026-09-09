import { v4 as uuidv4 } from 'uuid';
import {
  type CardTemplate, CardType,
  type RewardCard, type ShopItem, ShopItemType,
  Rarity, Archetype,
} from '../types';
import { REWARD, SHOP, FORGE } from '../config/balance';

// ============================================================
// v2 卡池：38 张（通用 10 + 四流派各 7） + 特殊卡 2
// 数值依据 docs/BALANCE.md
// ============================================================

/** 简写构造器 */
function card(t: Partial<CardTemplate> & {
  templateId: string; name: string; type: CardType; baseValue: number; effectId: string; description: string;
}): CardTemplate {
  return {
    color: '#94a3b8',
    rarity: Rarity.COMMON,
    archetype: Archetype.GENERIC,
    ...t,
  } as CardTemplate;
}

// ---------- 通用（10） ----------
const GENERIC_CARDS: CardTemplate[] = [
  card({ templateId: 'atk_stone', name: '小石弹', type: CardType.ACTION, baseValue: 5, effectId: 'DEAL_DAMAGE', description: '造成 5 点伤害', color: '#a8a29e' }),
  card({ templateId: 'atk_fire', name: '火球', type: CardType.ACTION, baseValue: 7, effectId: 'DEAL_DAMAGE', description: '造成 7 点伤害', color: '#e74c3c' }),
  card({ templateId: 'atk_frost', name: '寒冰箭', type: CardType.ACTION, baseValue: 6, effectId: 'DEAL_DAMAGE', description: '造成 6 点伤害', color: '#60a5fa' }),
  card({ templateId: 'atk_thunder', name: '雷击', type: CardType.ACTION, baseValue: 11, effectId: 'DEAL_DAMAGE', description: '造成 11 点伤害', color: '#facc15', rarity: Rarity.UNCOMMON }),
  card({ templateId: 'atk_meteor', name: '陨石术', type: CardType.ACTION, baseValue: 16, effectId: 'DEAL_DAMAGE', description: '造成 16 点伤害', color: '#d35400', rarity: Rarity.UNCOMMON }),
  card({ templateId: 'def_wood', name: '木盾', type: CardType.ACTION, baseValue: 6, effectId: 'GAIN_ARMOR', description: '获得 6 点护盾', color: '#84cc16' }),
  card({ templateId: 'def_iron', name: '铁壁', type: CardType.ACTION, baseValue: 10, effectId: 'GAIN_ARMOR', description: '获得 10 点护盾', color: '#64748b' }),
  card({ templateId: 'def_holy', name: '圣盾术', type: CardType.ACTION, baseValue: 14, effectId: 'GAIN_ARMOR', description: '获得 14 点护盾', color: '#fbbf24', rarity: Rarity.UNCOMMON }),
  card({ templateId: 'mod_x2', name: 'X2', type: CardType.MODIFIER, baseValue: 2, effectId: 'MULTIPLY_NEXT', description: '下一张牌效果 ×2', color: '#9b59b6' }),
  card({ templateId: 'mod_triple', name: '三连发', type: CardType.MODIFIER, baseValue: 3, effectId: 'REPEAT_NEXT', description: '下一张牌触发 3 次', color: '#c084fc', rarity: Rarity.UNCOMMON }),
];

// ---------- 连锁流（7） ----------
const CHAIN_CARDS: CardTemplate[] = [
  card({ templateId: 'ch_arc', name: '电弧', type: CardType.ACTION, baseValue: 5, effectId: 'DEAL_DAMAGE', chain: 1, description: '5 伤害 连锁1：左侧每有一张已执行的攻击牌，多触发 1 次', color: '#fde047', archetype: Archetype.CHAIN }),
  card({ templateId: 'ch_blade', name: '链刃', type: CardType.ACTION, baseValue: 4, effectId: 'DEAL_DAMAGE', chain: 1, description: '4 伤害 连锁1', color: '#fbbf24', archetype: Archetype.CHAIN }),
  card({ templateId: 'ch_reactor', name: '反应堆盾', type: CardType.ACTION, baseValue: 5, effectId: 'GAIN_ARMOR', chain: 1, description: '5 护盾 连锁1', color: '#a3e635', archetype: Archetype.CHAIN }),
  card({ templateId: 'ch_avalanche', name: '雪崩', type: CardType.ACTION, baseValue: 3, effectId: 'DEAL_DAMAGE', chain: 2, description: '3 伤害 连锁2：排序越深滚雪球越狠', color: '#f59e0b', rarity: Rarity.UNCOMMON, archetype: Archetype.CHAIN }),
  card({ templateId: 'ch_super', name: '超导', type: CardType.MODIFIER, baseValue: 2, effectId: 'SUPERCONDUCTOR', description: '本场战斗中，连锁每次触发 +2 伤害', color: '#fde68a', rarity: Rarity.UNCOMMON, archetype: Archetype.CHAIN }),
  card({ templateId: 'ch_imbue', name: '链化', type: CardType.MODIFIER, baseValue: 2, effectId: 'CHAIN_IMBUE', description: '下一张牌获得 连锁2', color: '#fcd34d', rarity: Rarity.UNCOMMON, archetype: Archetype.CHAIN }),
  card({ templateId: 'ch_storm', name: '链式风暴', type: CardType.ACTION, baseValue: 5, effectId: 'CHAIN_STORM', chain: 2, description: '5 伤害 连锁2；若它之前已有 ≥3 张攻击牌执行，伤害再 ×2', color: '#f97316', rarity: Rarity.RARE, archetype: Archetype.CHAIN }),
];

// ---------- 共鸣流（7） ----------
const RESONANCE_CARDS: CardTemplate[] = [
  card({ templateId: 're_fire', name: '双生火', type: CardType.ACTION, baseValue: 5, effectId: 'DEAL_DAMAGE', resonance: true, description: '5 伤害 共鸣：与相邻同类卡互相 +50%', color: '#fb7185', archetype: Archetype.RESONANCE }),
  card({ templateId: 're_ice', name: '双生冰', type: CardType.ACTION, baseValue: 5, effectId: 'GAIN_ARMOR', resonance: true, description: '5 护盾 共鸣：与相邻同类卡互相 +50%', color: '#7dd3fc', archetype: Archetype.RESONANCE }),
  card({ templateId: 're_hammer', name: '和弦锤', type: CardType.ACTION, baseValue: 7, effectId: 'DEAL_DAMAGE', resonance: true, description: '7 伤害 共鸣', color: '#f472b6', rarity: Rarity.UNCOMMON, archetype: Archetype.RESONANCE }),
  card({ templateId: 're_magnet', name: '磁力盾', type: CardType.ACTION, baseValue: 6, effectId: 'MAGNETIC_SHIELD', description: '6 护盾；把等量护盾复制到相邻的无护盾槽位', color: '#38bdf8', rarity: Rarity.UNCOMMON, archetype: Archetype.RESONANCE }),
  card({ templateId: 're_tuner', name: '定位仪', type: CardType.MODIFIER, baseValue: 0, effectId: 'RESONANCE_TUNER', description: '本回合共鸣加成 ×1.5（+50% → +75%）', color: '#22d3ee', rarity: Rarity.UNCOMMON, archetype: Archetype.RESONANCE }),
  card({ templateId: 're_feed', name: '谐振腔', type: CardType.MODIFIER, baseValue: 1, effectId: 'RESONANCE_FEED', description: '本回合每有一对共鸣相邻，全场动作牌本场 +1', color: '#67e8f9', rarity: Rarity.UNCOMMON, archetype: Archetype.RESONANCE }),
  card({ templateId: 're_finale', name: '大合奏', type: CardType.ACTION, baseValue: 10, effectId: 'GRAND_FINALE', resonance: true, description: '10 伤害 共鸣；左右均为攻击卡时再 +10', color: '#e879f9', rarity: Rarity.RARE, archetype: Archetype.RESONANCE }),
];

// ---------- 反击流（7） ----------
const RIPOSTE_CARDS: CardTemplate[] = [
  card({ templateId: 'ri_thorn', name: '荆棘甲', type: CardType.ACTION, baseValue: 6, effectId: 'GAIN_ARMOR', riposte: 8, description: '6 护盾 反击8：本槽被攻击且未掉血时，附加 8 伤害', color: '#fb923c', archetype: Archetype.RIPOSTE }),
  card({ templateId: 'ri_wall', name: '壁垒', type: CardType.ACTION, baseValue: 10, effectId: 'GAIN_ARMOR', description: '获得 10 点护盾', color: '#94a3b8', archetype: Archetype.RIPOSTE }),
  card({ templateId: 'ri_mirror', name: '镜面反射', type: CardType.ACTION, baseValue: 9, effectId: 'MIRROR_REFLECT', description: '9 护盾；本槽完全格挡时，反弹等量盾值的伤害', color: '#f87171', rarity: Rarity.UNCOMMON, archetype: Archetype.RIPOSTE }),
  card({ templateId: 'ri_shift', name: '斗转星移', type: CardType.ACTION, baseValue: 5, effectId: 'PHASE_SHIFT', description: '5 伤害；本槽被攻击时，伤害转移至左侧槽位', color: '#c084fc', rarity: Rarity.UNCOMMON, archetype: Archetype.RIPOSTE }),
  card({ templateId: 'ri_gladiator', name: '角斗士', type: CardType.MODIFIER, baseValue: 10, effectId: 'GLADIATOR', description: '本回合每有 1 个槽位将被攻击，总伤害 +10', color: '#fca5a5', rarity: Rarity.UNCOMMON, archetype: Archetype.RIPOSTE }),
  card({ templateId: 'ri_revenge', name: '复仇誓言', type: CardType.MODIFIER, baseValue: 4, effectId: 'REVENGE_VOW', description: '本场每失去 10 HP，下一张攻击 +4', color: '#ef4444', rarity: Rarity.UNCOMMON, archetype: Archetype.RIPOSTE }),
  card({ templateId: 'ri_bell', name: '黄金钟', type: CardType.ACTION, baseValue: 9, effectId: 'GOLDEN_BELL', description: '9 护盾；本回合任意槽完全格挡时，全场动作牌本场 +2（可叠加）', color: '#fcd34d', rarity: Rarity.RARE, archetype: Archetype.RIPOSTE }),
];

// ---------- 焚身流（7） ----------
const BURN_CARDS: CardTemplate[] = [
  card({ templateId: 'bu_price', name: '血偿', type: CardType.ACTION, baseValue: 20, effectId: 'BLOOD_PRICE', burnCost: 3, description: '焚身3：20 伤害（本场首次打出失去 3 HP）', color: '#dc2626', archetype: Archetype.BURN }),
  card({ templateId: 'bu_ward', name: '燃烧意志', type: CardType.ACTION, baseValue: 13, effectId: 'BURN_WARD', burnCost: 2, description: '焚身2：13 护盾（本场首次打出失去 2 HP）', color: '#b91c1c', archetype: Archetype.BURN }),
  card({ templateId: 'bu_rage', name: '血怒', type: CardType.MODIFIER, baseValue: 2, effectId: 'BLOOD_RAGE', description: '本回合每有一张焚身卡，全场动作牌本场 +2', color: '#ea580c', rarity: Rarity.UNCOMMON, archetype: Archetype.BURN }),
  card({ templateId: 'bu_scorch', name: '焦土', type: CardType.ACTION, baseValue: 12, effectId: 'BLOOD_PRICE', burnCost: 0, description: '12 伤害；点燃此槽 3 回合（该槽数值 +100%）', color: '#f97316', rarity: Rarity.UNCOMMON, archetype: Archetype.BURN }),
  card({ templateId: 'bu_deadly', name: '亡命', type: CardType.MODIFIER, baseValue: 0, effectId: 'DEADLY', description: '若 HP ≤ 50%，本回合后续攻击 ×1.5', color: '#7f1d1d', rarity: Rarity.UNCOMMON, archetype: Archetype.BURN }),
  card({ templateId: 'bu_sacrifice', name: '献祭', type: CardType.ACTION, baseValue: 4, effectId: 'SACRIFICE', burnCost: 4, description: '焚身4：全场动作牌本场 +4（首次打出失去 4 HP）', color: '#991b1b', rarity: Rarity.UNCOMMON, archetype: Archetype.BURN }),
  card({ templateId: 'bu_phoenix', name: '不死鸟', type: CardType.ACTION, baseValue: 32, effectId: 'PHOENIX_STRIKE', burnCost: 6, description: '焚身6：32 伤害；HP≤10 时 47（首次打出失去 6 HP）', color: '#fbbf24', rarity: Rarity.RARE, archetype: Archetype.BURN }),
];

// ---------- 保留的特殊卡 ----------
/** 勇士技能卡（不进奖励池，打出后消耗） */
export const SKILL_CARD: CardTemplate = card({
  templateId: 'skill_001', name: '强化', type: CardType.MODIFIER, baseValue: 4, effectId: 'MULTIPLY_NEXT',
  description: '下一张牌效果 ×4（消耗）', color: '#e17055',
});

/** 禁忌卡：吉祥物彩蛋（不进奖励池，整局限 1 张） */
export const FORBIDDEN_CARD: CardTemplate = card({
  templateId: 'forbidden_001', name: '我的王之力', type: CardType.ACTION, baseValue: 999, effectId: 'DEAL_DAMAGE',
  description: '造成 999 点伤害', color: '#8b0000', rarity: Rarity.RARE,
});

/** 奖励/商店卡池 */
export const ALL_CARD_POOL: CardTemplate[] = [
  ...GENERIC_CARDS, ...CHAIN_CARDS, ...RESONANCE_CARDS, ...RIPOSTE_CARDS, ...BURN_CARDS,
];

/** 按 templateId 查模板 */
export const TEMPLATE_INDEX: Record<string, CardTemplate> = Object.fromEntries(
  [...ALL_CARD_POOL, SKILL_CARD, FORBIDDEN_CARD].map((c) => [c.templateId, c]),
);

// ============================================================
// 升级（锻造）
// ============================================================

/** 锻造一张卡：数值 +40%；连锁+1 / 反击+3 */
export function upgradeCard(c: CardTemplate): CardTemplate {
  const u: CardTemplate = { ...c, upgraded: true };
  if (u.chain) u.chain += 1;
  if (u.riposte) u.riposte += FORGE.RIPOSTE_STEP;
  if (u.baseValue > 0) u.baseValue = Math.floor(u.baseValue * FORGE.VALUE_MULTIPLIER);
  u.name = c.name + '+';
  if (u.type === CardType.ACTION) u.description = describeUpgraded(u);
  return u;
}

function describeUpgraded(u: CardTemplate): string {
  const burnTxt = u.burnCost ? `焚身${u.burnCost}：` : '';
  const chainTxt = u.chain ? ` 连锁${u.chain}` : '';
  const resoTxt = u.resonance ? ' 共鸣' : '';
  const ripTxt = u.riposte ? ` 反击${u.riposte}` : '';
  if (u.effectId === 'GAIN_ARMOR' || u.effectId === 'MAGNETIC_SHIELD' || u.effectId === 'MIRROR_REFLECT' || u.effectId === 'GOLDEN_BELL' || u.effectId === 'BURN_WARD') {
    return `${burnTxt}${u.baseValue} 护盾${chainTxt}${resoTxt}${ripTxt}`;
  }
  return `${burnTxt}造成 ${u.baseValue} 点伤害${chainTxt}${resoTxt}`;
}

// ============================================================
// 初始卡组：5 小石弹 + 5 木盾 + 2 X2
// ============================================================

export function buildStarterDeck(): CardTemplate[] {
  const deck: CardTemplate[] = [];
  const stone = TEMPLATE_INDEX['atk_stone'];
  const wood = TEMPLATE_INDEX['def_wood'];
  const x2 = TEMPLATE_INDEX['mod_x2'];
  for (let i = 0; i < 5; i++) deck.push({ ...stone });
  for (let i = 0; i < 5; i++) deck.push({ ...wood });
  for (let i = 0; i < 2; i++) deck.push({ ...x2 });
  return deck;
}

// ============================================================
// 奖励生成（稀有度分级 → 类内均匀）
// ============================================================

function rollRarity(rareOdds: number): Rarity {
  const roll = Math.random();
  if (roll < rareOdds) return Rarity.RARE;
  if (roll < rareOdds + REWARD.RARITY_ODDS.UNCOMMON) return Rarity.UNCOMMON;
  return Rarity.COMMON;
}

function sampleFrom<T>(arr: T[], count: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

/** 生成一轮三选一奖励。guaranteeRare: 至少 1 张稀有（精英奖励） */
export function generateRewardCards(count = 3, opts?: { guaranteeRare?: boolean; rareOdds?: number }): RewardCard[] {
  const rareOdds = opts?.rareOdds ?? REWARD.RARITY_ODDS.RARE;
  const picks: CardTemplate[] = [];
  for (let i = 0; i < count; i++) {
    const forceRare = opts?.guaranteeRare && i === 0;
    const rarity = forceRare ? Rarity.RARE : rollRarity(rareOdds);
    const tierPool = ALL_CARD_POOL.filter((c) => c.rarity === rarity);
    if (tierPool.length > 0) picks.push(...sampleFrom(tierPool, 1));
  }
  return picks.map((c) => ({ card: { ...c }, isRare: c.rarity === Rarity.RARE }));
}

// ============================================================
// 商店
// ============================================================

function priceFor(c: CardTemplate): number {
  let price = SHOP.PRICE_MIN + Math.floor(Math.random() * SHOP.PRICE_VARIANCE);
  if (c.rarity === Rarity.UNCOMMON) price += SHOP.UNCOMMON_PRICE_EXTRA;
  if (c.rarity === Rarity.RARE) price += SHOP.RARE_PRICE_EXTRA;
  return price;
}

export function generateShopItems(): ShopItem[] {
  const pool = [...ALL_CARD_POOL];
  const items: ShopItem[] = [];

  const cardCount = SHOP.CARD_COUNT_MIN + Math.floor(Math.random() * SHOP.CARD_COUNT_VARIANCE);
  for (let i = 0; i < cardCount && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const [c] = pool.splice(idx, 1);
    items.push({
      id: uuidv4(),
      type: ShopItemType.BUY_CARD,
      card: { ...c },
      cost: priceFor(c),
    });
  }

  return items;
}
