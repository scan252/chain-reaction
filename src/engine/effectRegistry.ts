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
import { STATUS } from '../config/balance';

// --- 效果函数签名 ---

type EffectFunction = (
  context: ExecutionContext,
  card: CardInstance,
  slotIndex: number,
  pipeline: (CardInstance | null)[],
) => ExecutionContext;

// --- 辅助：更新数组中某个索引的值 ---

function updateArr(arr: number[], idx: number, delta: number): number[] {
  return arr.map((v, i) => (i === idx ? v + delta : v));
}

/** 判断效果是否属于"攻击类"（受攻击修饰卡影响） */
export function isAttackEffect(effectId: string): boolean {
  return effectId === 'DEAL_DAMAGE' || effectId === 'PHASE_SHIFT';
}

/** 判断效果是否属于"护盾类"（受护盾修饰卡影响） */
export function isShieldEffect(effectId: string): boolean {
  return effectId === 'GAIN_ARMOR' || effectId === 'MIRROR_REFLECT';
}

// --- 效果注册表 ---

export const EffectRegistry: Record<string, EffectFunction> = {
  DEAL_DAMAGE: (ctx, card, slotIndex, pipeline) => {
    // 基础值 + 全局伤害加成（每张攻击卡各加一次，结算时不再重复加）
    let effectiveValue = card.baseValue + ctx.globalDamageBonus;
    // 背水一战：如果前一个非空槽位是 DESPERATE_STRIKE
    for (let i = slotIndex - 1; i >= 0; i--) {
      const prev = pipeline[i];
      if (!prev) continue;
      if (prev.effectId === 'DESPERATE_STRIKE') {
        effectiveValue += ctx.desperateHpLoss;
      }
      break; // 只看紧邻的前一张非空卡
    }
    const totalDamage = effectiveValue * ctx.nextCardMultiplier * ctx.nextCardRepeats;
    return {
      ...ctx,
      accumulatedDamage: ctx.accumulatedDamage + totalDamage,
      slotDamageContributions: updateArr(ctx.slotDamageContributions, slotIndex, totalDamage),
      nextCardMultiplier: 1,
      nextCardRepeats: 1,
    };
  },

  GAIN_ARMOR: (ctx, card, slotIndex) => {
    const totalArmor = card.baseValue * ctx.nextCardMultiplier * ctx.nextCardRepeats;
    return {
      ...ctx,
      accumulatedArmor: ctx.accumulatedArmor + totalArmor,
      slotArmors: updateArr(ctx.slotArmors, slotIndex, totalArmor),
      nextCardMultiplier: 1,
      nextCardRepeats: 1,
    };
  },

  MULTIPLY_NEXT: (ctx, card) => {
    return {
      ...ctx,
      nextCardMultiplier: ctx.nextCardMultiplier * (card.baseValue || 2),
    };
  },

  REPEAT_NEXT: (ctx, card) => {
    return {
      ...ctx,
      nextCardRepeats: ctx.nextCardRepeats * (card.baseValue || 2),
    };
  },

  // --- 连锁反应（仅对护盾生效）---
  REPEAT_NEXT_SHIELD: (ctx, card, slotIndex, pipeline) => {
    for (let i = slotIndex + 1; i < pipeline.length; i++) {
      const nextCard = pipeline[i];
      if (!nextCard) continue;
      if (isShieldEffect(nextCard.effectId)) {
        return {
          ...ctx,
          nextCardRepeats: ctx.nextCardRepeats * (card.baseValue || 4),
        };
      }
      break;
    }
    return ctx;
  },

  // --- 多次打击（仅对攻击生效）---
  REPEAT_NEXT_ATTACK: (ctx, card, slotIndex, pipeline) => {
    for (let i = slotIndex + 1; i < pipeline.length; i++) {
      const nextCard = pipeline[i];
      if (!nextCard) continue;
      if (isAttackEffect(nextCard.effectId)) {
        return {
          ...ctx,
          nextCardRepeats: ctx.nextCardRepeats * (card.baseValue || 4),
        };
      }
      break;
    }
    return ctx;
  },

  // --- 移形换影：造成伤害，被攻击时伤害转移至左侧槽位 ---
  PHASE_SHIFT: (ctx, card, slotIndex) => {
    const totalDamage = card.baseValue * ctx.nextCardMultiplier * ctx.nextCardRepeats;
    const newRedirect = { ...ctx.damageRedirectMap };
    if (slotIndex > 0) {
      newRedirect[slotIndex] = slotIndex - 1;
    }
    return {
      ...ctx,
      accumulatedDamage: ctx.accumulatedDamage + totalDamage,
      slotDamageContributions: updateArr(ctx.slotDamageContributions, slotIndex, totalDamage),
      damageRedirectMap: newRedirect,
      nextCardMultiplier: 1,
      nextCardRepeats: 1,
    };
  },

  // --- 镜面反射：获得护甲，完全格挡时将护盾值附加到总伤害 ---
  MIRROR_REFLECT: (ctx, card, slotIndex) => {
    const totalArmor = card.baseValue * ctx.nextCardMultiplier * ctx.nextCardRepeats;
    return {
      ...ctx,
      accumulatedArmor: ctx.accumulatedArmor + totalArmor,
      slotArmors: updateArr(ctx.slotArmors, slotIndex, totalArmor),
      reflectPendingSlot: slotIndex,
      reflectArmorValue: totalArmor,
      nextCardMultiplier: 1,
      nextCardRepeats: 1,
    };
  },

  // --- 共鸣增幅：下一张牌 x2；若下张是护盾且完美格挡，全队基础数值+1 ---
  RESONANCE_AMP_V2: (ctx, card) => {
    return {
      ...ctx,
      nextCardMultiplier: ctx.nextCardMultiplier * (card.baseValue || 2),
    };
  },

  // --- 背水一战（标记传递，实际效果在 DEAL_DAMAGE 中） ---
  DESPERATE_STRIKE: (ctx) => {
    return ctx;
  },

  // --- 连锁防线：前面所有槽位中最高的护盾值加到每一个其他槽位上 ---
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

// --- executePipelineV2：单遍主执行（燃烧减益在执行时应用） ---

export function executePipelineV2(
  pipeline: (CardInstance | null)[],
  initialContext: ExecutionContext,
  slotStatuses: SlotStatus[],
): ExecutionContext {
  const slots = pipeline.length;

  const ctx: ExecutionContext = {
    ...initialContext,
    slotArmors: new Array(slots).fill(0),
    slotDamageContributions: new Array(slots).fill(0),
    damageRedirectMap: {},
    reflectPendingSlot: null,
  };

  for (let i = 0; i < slots; i++) {
    const card = pipeline[i];
    if (!card) continue;
    if (slotStatuses[i]?.isLocked) continue;

    // 燃烧减益：被标记槽位上的卡牌数值减半
    const burning = slotStatuses[i]?.statusEffects.some((e) => e.type === StatusEffectType.BURNING);
    const effectiveBaseValue = burning
      ? Math.floor(card.baseValue / STATUS.BURNING_DIVISOR)
      : card.baseValue;

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

  // 遗物1：坚固壁垒 - 结算前每个槽位+2护甲
  if (relics.includes(RelicIdConst.SLOT_ARMOR_2)) {
    newCtx.slotArmors = newCtx.slotArmors.map((armor) => armor + 2);
    newCtx.accumulatedArmor += newCtx.slotArmors.length * 2;
  }

  // 遗物2：狂战士之怒 - 无护盾牌时总伤害+20%
  if (relics.includes(RelicIdConst.NO_ARMOR_DAMAGE_20)) {
    const hasArmorCard = pipeline.some((card) => card && isShieldEffect(card.effectId));
    if (!hasArmorCard) {
      newCtx.accumulatedDamage = Math.floor(newCtx.accumulatedDamage * 1.2);
    }
  }

  // 遗物4：防御反击 - 无攻击牌时总伤害+10
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

  // 预扫描：找到所有共鸣增幅的位置及其目标槽位；检测背水一战
  const resonanceAmpTargets = new Set<number>();
  let hasDesperateStrike = false;
  for (let i = 0; i < pipeline.length; i++) {
    const card = pipeline[i];
    if (card?.effectId === 'RESONANCE_AMP_V2') {
      for (let j = i + 1; j < pipeline.length; j++) {
        if (pipeline[j]) {
          if (isShieldEffect(pipeline[j]!.effectId)) {
            resonanceAmpTargets.add(j);
          }
          break;
        }
      }
    }
    if (card?.effectId === 'DESPERATE_STRIKE') {
      hasDesperateStrike = true;
    }
  }

  // 可修改的护甲数组（用于遗物效果）
  const slotArmors = [...ctx.slotArmors];

  // 遗物3：危险预警 - 将被攻击的最高伤害槽位+5护甲
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

  // 遗物5：侧翼防护 - 最左或最右槽位被攻击时，所有被攻击槽位+8护甲
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

  // 遍历每个被攻击的槽位
  for (const attack of resolvedAttacks) {
    // 检查伤害转移（移形换影）
    let actualSlot = attack.slotIndex;
    if (ctx.damageRedirectMap[actualSlot] !== undefined) {
      actualSlot = ctx.damageRedirectMap[actualSlot];
    }

    if (actualSlot < 0 || actualSlot >= pipeline.length) continue;

    let incomingDamage = attack.damage;

    // 应用破绽加成
    if (playerVulnerableStacks > 0) {
      incomingDamage = Math.floor(incomingDamage * (1 + STATUS.VULNERABLE_DAMAGE_AMP_PER_STACK * playerVulnerableStacks));
    }

    const card = pipeline[actualSlot];
    let armor = slotArmors[actualSlot] ?? 0;

    // 连锁防线：叠加上它应分发的护甲
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
      // 情况C：空门大开
      hpLoss = incomingDamage;
      isVulnerablePenalty = true;
      newVulnerableStacks += 1;
    } else if (card.type === CardType.MODIFIER && !isCardUseful(card, actualSlot, pipeline)) {
      // 情况C：无效修饰卡（右侧没有后续卡可修饰）
      hpLoss = incomingDamage;
      isVulnerablePenalty = true;
      newVulnerableStacks += 1;
    } else if (armor > 0) {
      // 情况A：防御抵消
      blockedDamage = Math.min(armor, incomingDamage);
      hpLoss = incomingDamage - blockedDamage;

      // 镜面反射：完全格挡时，将此格护盾值附加到总伤害
      if (ctx.reflectPendingSlot === actualSlot && hpLoss === 0) {
        reflectDamageBonus += ctx.reflectArmorValue;
      }

      // 共鸣增幅：完美格挡触发全局增益
      if (resonanceAmpTargets.has(actualSlot) && hpLoss === 0) {
        resonanceTrigger = true;
      }
    } else {
      // 情况B：换血拼刀
      hpLoss = incomingDamage;
    }

    totalPlayerHpLoss += hpLoss;

    // 蔓延型：未完全格挡则标记燃烧
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

  return {
    slotResults,
    totalPlayerHpLoss,
    newVulnerableStacks,
    slotsToMarkBurning,
    reflectDamageBonus,
    resonanceTrigger,
    hasDesperateStrike,
    slotLinks: [], // 在 gameStore 中单独计算
  };
}

// 判断修饰卡是否有效（右侧是否有后续卡可修饰）
function isCardUseful(card: CardInstance, slotIndex: number, pipeline: (CardInstance | null)[]): boolean {
  if (card.type !== CardType.MODIFIER) return true;
  // 连锁防线只要前面有护甲卡就有效
  if (card.effectId === 'CHAIN_DEFENSE') {
    for (let i = slotIndex - 1; i >= 0; i--) {
      if (pipeline[i]) return true;
    }
    return false;
  }
  // 其他修饰卡：右侧需要有后续非空卡
  for (let i = slotIndex + 1; i < pipeline.length; i++) {
    if (pipeline[i]) return true;
  }
  return false;
}

// --- 模拟预计算（用于背水一战） ---

export function simulateForDesperateStrike(
  pipeline: (CardInstance | null)[],
  slotStatuses: SlotStatus[],
  intent: EnemyIntent,
  playerVulnerableStacks: number,
): number {
  const simCtx = executePipelineV2(pipeline, { ...INITIAL_CONTEXT, desperateHpLoss: 0 }, slotStatuses);
  const simResult = resolveSlotCombat(simCtx, intent, pipeline, playerVulnerableStacks);
  return simResult.totalPlayerHpLoss;
}
