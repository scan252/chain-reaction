import type {
  ExecutionContext,
  CardInstance,
  SlotStatus,
  EnemyIntent,
  SlotPreview,
  SlotCombatResult,
  SlotAttack,
  RelicId,
} from '../types';
import { CardType, AttackPattern, StatusEffectType, INITIAL_CONTEXT, RelicId as RelicIdConst } from '../types';
import { STATUS, KEYWORD } from '../config/balance';

// --- 效果函数签名 ---

type EffectFunction = (
  context: ExecutionContext,
  card: CardInstance,
  slotIndex: number,
  pipeline: (CardInstance | null)[],
) => ExecutionContext;

// --- 辅助 ---

function updateArr(arr: number[], idx: number, delta: number): number[] {
  return arr.map((v, i) => (i === idx ? v + delta : v));
}

/** 攻击类效果（受攻击修饰/连锁计数影响） */
export function isAttackEffect(effectId: string): boolean {
  return [
    'DEAL_DAMAGE', 'PHASE_SHIFT', 'CHAIN_STORM', 'GRAND_FINALE', 'PHOENIX_STRIKE', 'SCORCH', 'CHAIN_BLADE', 'BLOOD_PRICE',
  ].includes(effectId);
}

/** 护盾类效果 */
export function isShieldEffect(effectId: string): boolean {
  return ['GAIN_ARMOR', 'MIRROR_REFLECT', 'MAGNETIC_SHIELD', 'GOLDEN_BELL', 'BURN_WARD', 'REACTOR_SHIELD', 'RIPOSTE_GUARD'].includes(effectId);
}

/** 卡牌的攻/防类别（共鸣"同类"判定） */
export function cardKind(card: CardInstance): 'ATTACK' | 'SHIELD' | 'OTHER' {
  if (isAttackEffect(card.effectId)) return 'ATTACK';
  if (isShieldEffect(card.effectId)) return 'SHIELD';
  return 'OTHER';
}

/** 计算一张卡的总触发次数（连锁机制：1 + 连锁N × 此前攻击牌数） */
function computeChainRepeats(card: CardInstance, ctx: ExecutionContext): number {
  const chain = (card.chain ?? 0) + ctx.nextCardChainBonus + (ctx.relicChainBonus ?? 0);
  if (chain <= 0) return 1;
  return 1 + chain * ctx.chainAttackCount;
}

/** 焚身付费：每张卡每场战斗只付一次；重复打出时效果 ×0.7（防止免费白板化）。返回新数组避免修改冻结状态。 */
function payBurn(ctx: ExecutionContext, card: CardInstance): { cost: number; paidIds: string[] } {
  if (!card.burnCost) return { cost: 0, paidIds: ctx.paidBurnCardIds };
  const key = card.templateId + ':' + (card.uuid ?? '');
  if (ctx.paidBurnCardIds.includes(key)) return { cost: 0, paidIds: ctx.paidBurnCardIds };
  const cost = Math.max(1, card.burnCost - (ctx.relicBurnDiscount ?? 0));
  return { cost, paidIds: [...ctx.paidBurnCardIds, key] };
}

/** 焚身卡重复打出的衰减乘数 */
function burnRepeatMultiplier(ctx: ExecutionContext, card: CardInstance): number {
  if (!card.burnCost) return 1;
  const key = card.templateId + ':' + (card.uuid ?? '');
  return ctx.paidBurnCardIds.includes(key) ? 0.7 : 1;
}

/** 单次触发的基础数值（含超导加成） */
function perTriggerValue(card: CardInstance, ctx: ExecutionContext): number {
  return card.baseValue + ctx.globalDamageBonus + ctx.chainBonusPerTrigger;
}

// --- 效果注册表 ---

export const EffectRegistry: Record<string, EffectFunction> = {
  // ===== 通用 =====
  DEAL_DAMAGE: (ctx, card, slotIndex) => {
    const repeats = ctx.nextCardRepeats * computeChainRepeats(card, ctx);
    const per = perTriggerValue(card, ctx) * ctx.nextCardMultiplier;
    const total = Math.floor((per * repeats + ctx.nextCardFlatBonus) * ctx.deadlyMultiplier);
    return {
      ...ctx,
      accumulatedDamage: ctx.accumulatedDamage + total,
      slotDamageContributions: updateArr(ctx.slotDamageContributions, slotIndex, total),
      chainAttackCount: ctx.chainAttackCount + 1,
      nextCardMultiplier: 1,
      nextCardRepeats: 1,
      nextCardChainBonus: 0,
      nextCardFlatBonus: 0,
      deadlyMultiplier: 1,
      deadlyArmed: false,
    };
  },

  GAIN_ARMOR: (ctx, card, slotIndex) => {
    // 反应堆盾等护盾卡同样吃连锁（护盾连锁计数同样基于此前攻击牌数）
    const repeats = ctx.nextCardRepeats * computeChainRepeats(card, ctx);
    const total = Math.floor(card.baseValue * ctx.nextCardMultiplier * repeats);
    return {
      ...ctx,
      accumulatedArmor: ctx.accumulatedArmor + total,
      slotArmors: updateArr(ctx.slotArmors, slotIndex, total),
      nextCardMultiplier: 1,
      nextCardRepeats: 1,
      nextCardChainBonus: 0,
    };
  },

  MULTIPLY_NEXT: (ctx, card) => ({
    ...ctx,
    nextCardMultiplier: ctx.nextCardMultiplier * (card.baseValue || 2),
  }),

  REPEAT_NEXT: (ctx, card) => ({
    ...ctx,
    nextCardRepeats: ctx.nextCardRepeats * (card.baseValue || 2),
  }),

  // ===== 连锁流 =====
  // 链式风暴：6 伤连锁2；连锁计数≥3 时再 ×2（毕业combo）
  CHAIN_STORM: (ctx, card, slotIndex) => {
    const repeats = ctx.nextCardRepeats * computeChainRepeats(card, ctx);
    const per = perTriggerValue(card, ctx) * ctx.nextCardMultiplier;
    let total = Math.floor(per * repeats + ctx.nextCardFlatBonus);
    if (ctx.chainAttackCount >= 3) total *= 2;
    total = Math.floor(total * ctx.deadlyMultiplier);
    return {
      ...ctx,
      accumulatedDamage: ctx.accumulatedDamage + total,
      slotDamageContributions: updateArr(ctx.slotDamageContributions, slotIndex, total),
      chainAttackCount: ctx.chainAttackCount + 1,
      nextCardMultiplier: 1,
      nextCardRepeats: 1,
      nextCardChainBonus: 0,
      nextCardFlatBonus: 0,
      deadlyMultiplier: 1,
      deadlyArmed: false,
    };
  },

  // 链化：下一张牌获得连锁 N
  CHAIN_IMBUE: (ctx, card) => ({
    ...ctx,
    nextCardChainBonus: ctx.nextCardChainBonus + card.baseValue,
  }),

  // 超导：连锁触发时每次额外伤害（本场成长，经 battleChainBonus 通道由 gameStore 结算）
  SUPERCONDUCTOR: (ctx, card) => ({
    ...ctx,
    chainBonusPerTrigger: ctx.chainBonusPerTrigger + card.baseValue,
  }),

  // ===== 共鸣流 =====
  // 定位仪：本回合共鸣加成提升（在预扫描中按在场检测应用，此处仅占位）
  RESONANCE_TUNER: (ctx) => ctx,

  // 谐振腔：本回合每有一对共鸣相邻连接，全局伤害本场 +baseValue（无序对去重）
  RESONANCE_FEED: (ctx, card, _slotIndex, pipeline) => {
    let pairs = 0;
    for (let i = 0; i < pipeline.length - 1; i++) {
      const a = pipeline[i];
      const b = pipeline[i + 1];
      if (a && b && cardKind(a) === cardKind(b) && (a.resonance || b.resonance)) pairs++;
    }
    return {
      ...ctx,
      globalDamageBonus: ctx.globalDamageBonus + pairs * card.baseValue,
    };
  },

  // 磁力盾：获得护甲，并把等量护甲复制到相邻的无护甲槽位
  MAGNETIC_SHIELD: (ctx, card, slotIndex, pipeline) => {
    const repeats = ctx.nextCardRepeats * computeChainRepeats(card, ctx);
    const total = Math.floor(card.baseValue * ctx.nextCardMultiplier * repeats);
    const slotArmors = updateArr(ctx.slotArmors, slotIndex, total);
    let copied = 0;
    for (const nb of [slotIndex - 1, slotIndex + 1]) {
      if (nb < 0 || nb >= pipeline.length) continue;
      if (pipeline[nb] && (slotArmors[nb] ?? 0) === 0) {
        slotArmors[nb] += total;
        copied += total;
      }
    }
    return {
      ...ctx,
      slotArmors,
      accumulatedArmor: ctx.accumulatedArmor + total + copied,
      nextCardMultiplier: 1,
      nextCardRepeats: 1,
      nextCardChainBonus: 0,
    };
  },

  // 反应堆盾：获得护盾；本回合每有一张已执行的攻击牌额外 +3（线性成长，不与倍率链叠乘）
  REACTOR_SHIELD: (ctx, card, slotIndex) => {
    const base = Math.floor(card.baseValue * ctx.nextCardMultiplier);
    const bonus = ctx.chainAttackCount * 3;
    const total = base + bonus;
    return {
      ...ctx,
      accumulatedArmor: ctx.accumulatedArmor + total,
      slotArmors: updateArr(ctx.slotArmors, slotIndex, total),
      nextCardMultiplier: 1,
      nextCardRepeats: 1,
      nextCardChainBonus: 0,
    };
  },

  // 受身：获得护盾；本槽每被攻击一次（结算后），本场全局伤害 +2
  RIPOSTE_GUARD: (ctx, card, slotIndex) => {
    const total = Math.floor(card.baseValue * ctx.nextCardMultiplier * ctx.nextCardRepeats);
    return {
      ...ctx,
      accumulatedArmor: ctx.accumulatedArmor + total,
      slotArmors: updateArr(ctx.slotArmors, slotIndex, total),
      nextCardMultiplier: 1,
      nextCardRepeats: 1,
      nextCardChainBonus: 0,
    };
  },

  // 链刃：伤害；每次连锁触发额外获得 1 护盾
  CHAIN_BLADE: (ctx, card, slotIndex) => {
    const repeats = ctx.nextCardRepeats * computeChainRepeats(card, ctx);
    const per = perTriggerValue(card, ctx) * ctx.nextCardMultiplier * burnRepeatMultiplier(ctx, card);
    const total = Math.floor((per * repeats + ctx.nextCardFlatBonus) * ctx.deadlyMultiplier);
    const chainTriggers = repeats - 1;
    const shieldGain = chainTriggers > 0 ? chainTriggers : 0;
    return {
      ...ctx,
      accumulatedDamage: ctx.accumulatedDamage + total,
      slotDamageContributions: updateArr(ctx.slotDamageContributions, slotIndex, total),
      accumulatedArmor: ctx.accumulatedArmor + shieldGain,
      slotArmors: updateArr(ctx.slotArmors, slotIndex, shieldGain),
      chainAttackCount: ctx.chainAttackCount + 1,
      nextCardMultiplier: 1,
      nextCardRepeats: 1,
      nextCardChainBonus: 0,
      nextCardFlatBonus: 0,
      deadlyMultiplier: 1,
      deadlyArmed: false,
    };
  },

  // 大合奏：10 伤共鸣；左右均为攻击卡时再 +10
  GRAND_FINALE: (ctx, card, slotIndex, pipeline) => {
    const repeats = ctx.nextCardRepeats * computeChainRepeats(card, ctx);
    const per = perTriggerValue(card, ctx) * ctx.nextCardMultiplier;
    let total = Math.floor(per * repeats + ctx.nextCardFlatBonus);
    const left = pipeline[slotIndex - 1];
    const right = pipeline[slotIndex + 1];
    if (left && right && cardKind(left) === 'ATTACK' && cardKind(right) === 'ATTACK') {
      total += 10;
    }
    total = Math.floor(total * ctx.deadlyMultiplier);
    return {
      ...ctx,
      accumulatedDamage: ctx.accumulatedDamage + total,
      slotDamageContributions: updateArr(ctx.slotDamageContributions, slotIndex, total),
      chainAttackCount: ctx.chainAttackCount + 1,
      nextCardMultiplier: 1,
      nextCardRepeats: 1,
      nextCardChainBonus: 0,
      nextCardFlatBonus: 0,
      deadlyMultiplier: 1,
      deadlyArmed: false,
    };
  },

  // ===== 反击流 =====
  PHASE_SHIFT: (ctx, card, slotIndex) => {
    const total = Math.floor(card.baseValue * ctx.nextCardMultiplier * ctx.nextCardRepeats * ctx.deadlyMultiplier);
    const newRedirect = { ...ctx.damageRedirectMap };
    if (slotIndex > 0) {
      newRedirect[slotIndex] = slotIndex - 1;
    }
    return {
      ...ctx,
      accumulatedDamage: ctx.accumulatedDamage + total,
      slotDamageContributions: updateArr(ctx.slotDamageContributions, slotIndex, total),
      damageRedirectMap: newRedirect,
      chainAttackCount: ctx.chainAttackCount + 1,
      nextCardMultiplier: 1,
      nextCardRepeats: 1,
      nextCardChainBonus: 0,
      nextCardFlatBonus: 0,
      deadlyMultiplier: 1,
      deadlyArmed: false,
    };
  },

  // 镜面反射：获得护甲，完全格挡时反弹等盾值伤害（反击=盾值）
  MIRROR_REFLECT: (ctx, card, slotIndex) => {
    const total = Math.floor(card.baseValue * ctx.nextCardMultiplier * ctx.nextCardRepeats);
    return {
      ...ctx,
      accumulatedArmor: ctx.accumulatedArmor + total,
      slotArmors: updateArr(ctx.slotArmors, slotIndex, total),
      reflectPendingSlot: slotIndex,
      reflectArmorValue: total,
      nextCardMultiplier: 1,
      nextCardRepeats: 1,
      nextCardChainBonus: 0,
    };
  },

  // 角斗士：本回合每有 1 个槽位将被攻击，总伤害 +N
  GLADIATOR: (ctx, card) => ({
    ...ctx,
    accumulatedDamage: ctx.accumulatedDamage + card.baseValue * ctx.attackedSlotCount,
  }),

  // 复仇誓言：本场每失去 10 HP，下一张攻击 +N
  REVENGE_VOW: (ctx, card) => ({
    ...ctx,
    nextCardFlatBonus: ctx.nextCardFlatBonus + card.baseValue * Math.floor(ctx.hpLostThisBattle / 10),
  }),

  // 黄金钟：获得护甲；本回合任意槽完全格挡 → 全局伤害本场+2（在阶段二结算）
  GOLDEN_BELL: (ctx, card, slotIndex) => {
    const total = Math.floor(card.baseValue * ctx.nextCardMultiplier * ctx.nextCardRepeats);
    return {
      ...ctx,
      accumulatedArmor: ctx.accumulatedArmor + total,
      slotArmors: updateArr(ctx.slotArmors, slotIndex, total),
      nextCardMultiplier: 1,
      nextCardRepeats: 1,
      nextCardChainBonus: 0,
    };
  },

  // ===== 焚身流 =====
  // 血偿 / 燃烧意志：数值卡 + 焚身代价（baseValue 已含翻倍后数值，burnCost 在此登记）
  BLOOD_PRICE: (ctx, card, slotIndex) => {
    const pay = { paid: payBurn(ctx, card) };
    const repeats = ctx.nextCardRepeats * computeChainRepeats(card, ctx);
    const per = perTriggerValue(card, ctx) * ctx.nextCardMultiplier * burnRepeatMultiplier(ctx, card);
    const total = Math.floor((per * repeats + ctx.nextCardFlatBonus) * ctx.deadlyMultiplier);
    return {
      ...ctx,
      accumulatedDamage: ctx.accumulatedDamage + total,
      slotDamageContributions: updateArr(ctx.slotDamageContributions, slotIndex, total),
      chainAttackCount: ctx.chainAttackCount + 1,
      totalBurnHpCost: ctx.totalBurnHpCost + pay.paid.cost,
      paidBurnCardIds: pay.paid.paidIds,
      nextCardMultiplier: 1,
      nextCardRepeats: 1,
      nextCardChainBonus: 0,
      nextCardFlatBonus: 0,
      deadlyMultiplier: 1,
      deadlyArmed: false,
    };
  },

  BURN_WARD: (ctx, card, slotIndex) => {
    const paid = payBurn(ctx, card);
    const repeats = ctx.nextCardRepeats * computeChainRepeats(card, ctx);
    const total = Math.floor(card.baseValue * ctx.nextCardMultiplier * repeats * burnRepeatMultiplier(ctx, card));
    return {
      ...ctx,
      accumulatedArmor: ctx.accumulatedArmor + total,
      slotArmors: updateArr(ctx.slotArmors, slotIndex, total),
      paidBurnCardIds: paid.paidIds,
      totalBurnHpCost: ctx.totalBurnHpCost + paid.cost,
      nextCardMultiplier: 1,
      nextCardRepeats: 1,
      nextCardChainBonus: 0,
    };
  },

  // 血怒：本回合每有一张焚身卡，全局伤害本场 +baseValue
  BLOOD_RAGE: (ctx, card, _slotIndex, pipeline) => {
    const burnCards = pipeline.filter((c) => c?.burnCost).length;
    return {
      ...ctx,
      globalDamageBonus: ctx.globalDamageBonus + burnCards * card.baseValue,
    };
  },

  // 焦土：造成伤害并点燃此槽 3 回合（该槽卡牌数值+100%）
  SCORCH: (ctx, card, slotIndex) => {
    const repeats = ctx.nextCardRepeats * computeChainRepeats(card, ctx);
    const per = perTriggerValue(card, ctx) * ctx.nextCardMultiplier;
    const total = Math.floor((per * repeats + ctx.nextCardFlatBonus) * ctx.deadlyMultiplier);
    return {
      ...ctx,
      accumulatedDamage: ctx.accumulatedDamage + total,
      slotDamageContributions: updateArr(ctx.slotDamageContributions, slotIndex, total),
      chainAttackCount: ctx.chainAttackCount + 1,
      slotsToIgnite: [...ctx.slotsToIgnite, slotIndex],
      nextCardMultiplier: 1,
      nextCardRepeats: 1,
      nextCardChainBonus: 0,
      nextCardFlatBonus: 0,
      deadlyMultiplier: 1,
      deadlyArmed: false,
    };
  },

  // 亡命：HP≤50% 时下一张攻击 ×1.5（一次性）
  DEADLY: (ctx) => ({
    ...ctx,
    deadlyMultiplier: ctx.deadlyEligible ? KEYWORD.DEADLY_MULTIPLIER : 1,
    deadlyArmed: ctx.deadlyEligible,
  }),

  // 献祭：焚身5，全场动作牌本场 +N
  SACRIFICE: (ctx, card) => {
    const paid = payBurn(ctx, card);
    return {
      ...ctx,
      globalDamageBonus: ctx.globalDamageBonus + card.baseValue,
      paidBurnCardIds: paid.paidIds,
      totalBurnHpCost: ctx.totalBurnHpCost + paid.cost,
    };
  },

  // 不死鸟：焚身6：38 伤；HP≤10 时 55 伤
  PHOENIX_STRIKE: (ctx, card, slotIndex) => {
    const paid = payBurn(ctx, card);
    const lowHp = ctx.playerHpCurrent > 0 && ctx.playerHpCurrent <= 10;
    const value = lowHp ? card.baseValue + 17 : card.baseValue;
    const repeats = ctx.nextCardRepeats * computeChainRepeats(card, ctx);
    const per = (value + ctx.globalDamageBonus + ctx.chainBonusPerTrigger) * ctx.nextCardMultiplier * burnRepeatMultiplier(ctx, card);
    const total = Math.floor((per * repeats + ctx.nextCardFlatBonus) * ctx.deadlyMultiplier);
    return {
      ...ctx,
      accumulatedDamage: ctx.accumulatedDamage + total,
      slotDamageContributions: updateArr(ctx.slotDamageContributions, slotIndex, total),
      chainAttackCount: ctx.chainAttackCount + 1,
      paidBurnCardIds: paid.paidIds,
      totalBurnHpCost: ctx.totalBurnHpCost + paid.cost,
      nextCardMultiplier: 1,
      nextCardRepeats: 1,
      nextCardChainBonus: 0,
      nextCardFlatBonus: 0,
      deadlyMultiplier: 1,
      deadlyArmed: false,
    };
  },

  // ===== 保留的特殊机制 =====
  DESPERATE_STRIKE: (ctx) => ctx,

  CHAIN_DEFENSE: (ctx, _card, slotIndex, pipeline) => {
    let sourceArmor = 0;
    for (let i = slotIndex - 1; i >= 0; i--) {
      if (pipeline[i]) {
        sourceArmor = Math.max(sourceArmor, ctx.slotArmors[i]);
      }
    }
    if (sourceArmor <= 0) return ctx;

    const newSlotArmors = [...ctx.slotArmors];
    for (let i = 0; i < pipeline.length; i++) {
      if (i === slotIndex) continue;
      newSlotArmors[i] = (newSlotArmors[i] || 0) + sourceArmor;
    }

    const totalArmorAdded = newSlotArmors.reduce((s, v) => s + v, 0) - ctx.slotArmors.reduce((s, v) => s + v, 0);

    return {
      ...ctx,
      slotArmors: newSlotArmors,
      accumulatedArmor: ctx.accumulatedArmor + totalArmorAdded,
    };
  },
};

// --- executePipelineV2：预扫描（共鸣/燃烧/焦土/衰弱）+ 主执行 ---

export function executePipelineV2(
  pipeline: (CardInstance | null)[],
  initialContext: ExecutionContext,
  slotStatuses: SlotStatus[],
  resonanceBonusRate: number = KEYWORD.RESONANCE_BONUS,
): ExecutionContext {
  const slots = pipeline.length;

  const ctx: ExecutionContext = {
    ...initialContext,
    slotArmors: new Array(slots).fill(0),
    slotDamageContributions: new Array(slots).fill(0),
    damageRedirectMap: {},
    reflectPendingSlot: null,
    slotsToIgnite: [],
  };

  // === 预扫描：共鸣乘区 ===
  // 共鸣卡与左右相邻同类卡互相 +bonus（×定位仪倍率；定位仪在场即生效，与位置无关）
  const resonanceMult = new Array(slots).fill(1);
  const tunerPresent = pipeline.some((c) => c?.effectId === 'RESONANCE_TUNER');
  const rate = resonanceBonusRate * (tunerPresent ? 2 : 1);
  for (let i = 0; i < slots; i++) {
    const card = pipeline[i];
    if (!card?.resonance) continue;
    const kind = cardKind(card);
    // 只统计与"非共鸣同类邻居"的连接；共鸣-共鸣相邻由各自扫描计一次，避免双重叠加
    let bonus = 0;
    if (i > 0 && pipeline[i - 1] && cardKind(pipeline[i - 1]!) === kind && !pipeline[i - 1]!.resonance) {
      bonus += rate;
      resonanceMult[i - 1] += rate;
    }
    if (i < slots - 1 && pipeline[i + 1] && cardKind(pipeline[i + 1]!) === kind && !pipeline[i + 1]!.resonance) {
      bonus += rate;
      resonanceMult[i + 1] += rate;
    }
    // 共鸣-共鸣相邻：互相加成，每对只算一次（由左侧卡发起）
    if (i < slots - 1 && pipeline[i + 1]?.resonance && cardKind(pipeline[i + 1]!) === kind) {
      bonus += rate;
      resonanceMult[i + 1] += rate;
    }
    if (bonus > 0) {
      resonanceMult[i] += bonus;
    }
  }

  // === 主执行 ===
  for (let i = 0; i < slots; i++) {
    const card = pipeline[i];
    if (!card) continue;
    if (slotStatuses[i]?.isLocked) continue;

    // 状态乘区：燃烧减半 / 焦土翻倍
    let statusMult = 1;
    if (slotStatuses[i]?.statusEffects.some((e) => e.type === StatusEffectType.BURNING)) {
      statusMult /= STATUS.BURNING_DIVISOR;
    }
    if (slotStatuses[i]?.statusEffects.some((e) => e.type === StatusEffectType.IGNITED)) {
      statusMult *= STATUS.IGNITED_MULTIPLIER;
    }
    // 衰弱
    if (ctx.weakened) statusMult *= STATUS.WEAKENED_MULTIPLIER;

    const effectiveBaseValue = Math.max(0, Math.floor(card.baseValue * resonanceMult[i] * statusMult));

    const tempCard: CardInstance = { ...card, baseValue: effectiveBaseValue };

    const effectFn = EffectRegistry[card.effectId];
    if (!effectFn) {
      console.warn(`Unknown effect: ${card.effectId}`);
      continue;
    }

    Object.assign(ctx, effectFn(ctx, tempCard, i, pipeline));
  }

  return ctx;
}

// --- 应用遗物效果到执行上下文 ---

export function applyRelicEffectsToContext(
  ctx: ExecutionContext,
  pipeline: (CardInstance | null)[],
  relics: RelicId[],
): ExecutionContext {
  const newCtx = { ...ctx };

  if (relics.includes(RelicIdConst.SLOT_ARMOR_2)) {
    newCtx.slotArmors = newCtx.slotArmors.map((armor) => armor + 2);
    newCtx.accumulatedArmor += newCtx.slotArmors.length * 2;
  }

  if (relics.includes(RelicIdConst.NO_ARMOR_DAMAGE_20)) {
    const hasArmorCard = pipeline.some((card) => card && isShieldEffect(card.effectId));
    if (!hasArmorCard) {
      newCtx.accumulatedDamage = Math.floor(newCtx.accumulatedDamage * 1.2);
    }
  }

  if (relics.includes(RelicIdConst.NO_ATTACK_DAMAGE_10)) {
    const hasAttackCard = pipeline.some((card) => card && isAttackEffect(card.effectId));
    if (!hasAttackCard) {
      newCtx.accumulatedDamage += 10;
    }
  }

  return newCtx;
}

// --- resolveSlotCombat：阶段二槽位战斗判定 ---

export function resolveSlotCombat(
  ctx: ExecutionContext,
  intent: EnemyIntent,
  pipeline: (CardInstance | null)[],
  playerVulnerableStacks: number,
  relics: RelicId[] = [],
): SlotCombatResult {
  const slotResults: SlotPreview[] = [];
  let totalPlayerHpLoss = 0;
  let newVulnerableStacks = 0;
  const slotsToMarkBurning: number[] = [];
  let reflectDamageBonus = 0;
  let resonanceTrigger = false;
  let riposteDamage = 0;
  let perfectBlockTrigger = false;

  // 预扫描
  const resonanceAmpTargets = new Set<number>();
  const hasDesperateStrike = pipeline.some((c) => c?.effectId === 'DESPERATE_STRIKE');
  const hasGoldenBell = pipeline.some((c) => c?.effectId === 'GOLDEN_BELL');
  for (let i = 0; i < pipeline.length; i++) {
    const card = pipeline[i];
    if (card?.effectId === 'RESONANCE_TUNER') {
      for (let j = i + 1; j < pipeline.length; j++) {
        if (pipeline[j]) {
          if (isShieldEffect(pipeline[j]!.effectId)) resonanceAmpTargets.add(j);
          break;
        }
      }
    }
  }

  const slotArmors = [...ctx.slotArmors];

  // 遗物3：危险预警
  if (relics.includes(RelicIdConst.HIGH_DMG_SLOT_ARMOR_5)) {
    let maxDamage = -1;
    let targetSlot = -1;
    for (const attack of intent.attacks) {
      if (attack.damage > maxDamage) {
        maxDamage = attack.damage;
        targetSlot = attack.slotIndex;
      }
    }
    if (targetSlot >= 0 && targetSlot < pipeline.length) {
      slotArmors[targetSlot] = (slotArmors[targetSlot] ?? 0) + 5;
    }
  }

  // 遗物5：侧翼防护
  if (relics.includes(RelicIdConst.EDGE_SLOT_ARMOR_8)) {
    const isLeftEdgeAttacked = intent.attacks.some((a) => a.slotIndex === 0);
    const isRightEdgeAttacked = intent.attacks.some((a) => a.slotIndex === pipeline.length - 1);
    if (isLeftEdgeAttacked || isRightEdgeAttacked) {
      for (const attack of intent.attacks) {
        const slotIdx = attack.slotIndex;
        if (slotIdx >= 0 && slotIdx < pipeline.length) {
          slotArmors[slotIdx] = (slotArmors[slotIdx] ?? 0) + 8;
        }
      }
    }
  }

  // 解析实际攻击目标
  let resolvedAttacks: SlotAttack[];

  if (intent.pattern === AttackPattern.WEAK_POINT_SNIPE) {
    let maxBaseValue = -1;
    let targetSlot = 0;
    let hasCard = false;
    for (let i = 0; i < pipeline.length; i++) {
      const card = pipeline[i];
      if (card && card.baseValue > maxBaseValue) {
        maxBaseValue = card.baseValue;
        targetSlot = i;
        hasCard = true;
      }
    }
    const damage = intent.attacks.length > 0 ? intent.attacks[0].damage : 0;
    resolvedAttacks = hasCard ? [{ slotIndex: targetSlot, damage }] : [];
  } else {
    resolvedAttacks = intent.attacks;
  }

  // 反击遗器
  const riposteMultiplier = relics.includes(RelicIdConst.RIPOSTE_ENGINE)
    ? KEYWORD.RIPOSTE_ENGINE_MULTIPLIER
    : 1;

  for (const attack of resolvedAttacks) {
    let actualSlot = attack.slotIndex;
    if (ctx.damageRedirectMap[actualSlot] !== undefined) {
      actualSlot = ctx.damageRedirectMap[actualSlot];
    }

    if (actualSlot < 0 || actualSlot >= pipeline.length) continue;

    let incomingDamage = attack.damage;

    if (playerVulnerableStacks > 0) {
      incomingDamage = Math.floor(incomingDamage * (1 + STATUS.VULNERABLE_DAMAGE_AMP_PER_STACK * playerVulnerableStacks));
    }

    const card = pipeline[actualSlot];
    let armor = slotArmors[actualSlot] ?? 0;

    if (card?.effectId === 'CHAIN_DEFENSE') {
      let sourceArmor = 0;
      for (let i = actualSlot - 1; i >= 0; i--) {
        if (pipeline[i]) {
          sourceArmor = Math.max(sourceArmor, slotArmors[i]);
        }
      }
      if (sourceArmor > 0) {
        armor += sourceArmor;
      }
    }

    let blockedDamage = 0;
    let hpLoss = 0;
    let isVulnerablePenalty = false;

    if (card === null) {
      hpLoss = incomingDamage;
      isVulnerablePenalty = true;
      newVulnerableStacks += 1;
    } else if (card.type === CardType.MODIFIER && !isCardUseful(card, actualSlot, pipeline)) {
      hpLoss = incomingDamage;
      isVulnerablePenalty = true;
      newVulnerableStacks += 1;
    } else if (armor > 0) {
      blockedDamage = Math.min(armor, incomingDamage);
      hpLoss = incomingDamage - blockedDamage;

      if (hpLoss === 0) {
        perfectBlockTrigger = true;

        // 镜面反射：反弹等盾值伤害
        if (ctx.reflectPendingSlot === actualSlot) {
          reflectDamageBonus += ctx.reflectArmorValue;
        }

        // 反击关键词：完美格挡触发
        if (card.riposte && card.riposte > 0) {
          riposteDamage += Math.floor(card.riposte * riposteMultiplier);
        }

        // 共鸣增幅（定位仪链）
        if (resonanceAmpTargets.has(actualSlot)) {
          resonanceTrigger = true;
        }
      }
    } else {
      // 无护甲但有有效卡：换血拼刀（反击不触发——只有完美格挡触发）
      hpLoss = incomingDamage;
    }

    totalPlayerHpLoss += hpLoss;

    if (intent.pattern === AttackPattern.SPREADING_FLAME && hpLoss > 0) {
      slotsToMarkBurning.push(actualSlot);
    }

    slotResults.push({
      slotIndex: actualSlot,
      incomingDamage,
      blockedDamage,
      hpLoss,
      isVulnerablePenalty,
    });
  }

  // 受身：统计受身槽被攻击次数（无论格挡与否），供 gameStore 转化全局成长
  let riposteGuardHits = 0;
  for (let i = 0; i < pipeline.length; i++) {
    if (pipeline[i]?.effectId === 'RIPOSTE_GUARD') {
      riposteGuardHits += slotResults.filter((r) => r.slotIndex === i).length;
    }
  }

  // 黄金钟：本回合存在完美格挡 → 触发标记（gameStore 转化为全局成长）
  const goldenBellTrigger = perfectBlockTrigger && hasGoldenBell;

  return {
    slotResults,
    totalPlayerHpLoss,
    newVulnerableStacks,
    slotsToMarkBurning,
    reflectDamageBonus,
    resonanceTrigger,
    hasDesperateStrike,
    slotLinks: [],
    riposteDamage,
    riposteGuardHits,
    perfectBlockTrigger: goldenBellTrigger,
  };
}

// 判断修饰卡是否有效（右侧是否有后续卡可修饰）
function isCardUseful(card: CardInstance, slotIndex: number, pipeline: (CardInstance | null)[]): boolean {
  if (card.type !== CardType.MODIFIER) return true;
  if (card.effectId === 'CHAIN_DEFENSE') {
    for (let i = slotIndex - 1; i >= 0; i--) {
      if (pipeline[i]) return true;
    }
    return false;
  }
  for (let i = slotIndex + 1; i < pipeline.length; i++) {
    if (pipeline[i]) return true;
  }
  return false;
}

// --- 模拟预计算（用于背水一战/预览） ---

export function simulateForDesperateStrike(
  pipeline: (CardInstance | null)[],
  slotStatuses: SlotStatus[],
  intent: EnemyIntent,
  playerVulnerableStacks: number,
): number {
  const simCtx = executePipelineV2(pipeline, { ...INITIAL_CONTEXT, desperateHpLoss: 0, playerHpCurrent: 100 }, slotStatuses);
  const simResult = resolveSlotCombat(simCtx, intent, pipeline, playerVulnerableStacks);
  return simResult.totalPlayerHpLoss;
}
