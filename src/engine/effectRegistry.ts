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

// --- 效果注册表 ---

export const EffectRegistry: Record<string, EffectFunction> = {
  DEAL_DAMAGE: (ctx, card, slotIndex, pipeline) => {
    // 基础值 + 全局伤害加成
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

  // --- 新效果：连锁反应（仅对盾牌有效）---
  REPEAT_NEXT_SHIELD: (ctx, card, slotIndex, pipeline) => {
    // 检查下一张非空卡牌是否是盾牌
    for (let i = slotIndex + 1; i < pipeline.length; i++) {
      const nextCard = pipeline[i];
      if (!nextCard) continue;
      // 如果是盾牌效果才生效
      if (nextCard.effectId === 'GAIN_ARMOR' || nextCard.effectId === 'MIRROR_REFLECT') {
        return {
          ...ctx,
          nextCardRepeats: ctx.nextCardRepeats * (card.baseValue || 4),
        };
      }
      break;
    }
    // 下一张不是盾牌，效果不生效
    return ctx;
  },

  // --- 新效果：多次打击（仅对攻击有效）---
  REPEAT_NEXT_ATTACK: (ctx, card, slotIndex, pipeline) => {
    // 检查下一张非空卡牌是否是攻击
    for (let i = slotIndex + 1; i < pipeline.length; i++) {
      const nextCard = pipeline[i];
      if (!nextCard) continue;
      // 如果是攻击效果才生效
      if (nextCard.effectId === 'DEAL_DAMAGE' || nextCard.effectId === 'PHASE_SHIFT') {
        return {
          ...ctx,
          nextCardRepeats: ctx.nextCardRepeats * (card.baseValue || 4),
        };
      }
      break;
    }
    // 下一张不是攻击，效果不生效
    return ctx;
  },

  // --- 新效果：移形换影 ---
  PHASE_SHIFT: (ctx, card, slotIndex, _pipeline) => {
    const totalDamage = card.baseValue * ctx.nextCardMultiplier * ctx.nextCardRepeats;
    // 注册伤害转移：传递给前一格（左侧槽位）
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

  // --- 新效果：镜面反射 ---
  MIRROR_REFLECT: (ctx, card, slotIndex) => {
    const totalArmor = card.baseValue * ctx.nextCardMultiplier * ctx.nextCardRepeats;
    return {
      ...ctx,
      accumulatedArmor: ctx.accumulatedArmor + totalArmor,
      slotArmors: updateArr(ctx.slotArmors, slotIndex, totalArmor),
      reflectPendingSlot: slotIndex,
      reflectArmorValue: totalArmor, // 记录最终护盾值，用于完全格挡时加成下张攻击牌
      nextCardMultiplier: 1,
      nextCardRepeats: 1,
    };
  },

  // --- 新效果：共鸣增幅V2 ---
  RESONANCE_AMP_V2: (ctx, card) => {
    // 下一张牌 x2
    return {
      ...ctx,
      nextCardMultiplier: ctx.nextCardMultiplier * (card.baseValue || 2),
    };
  },

  // --- 旧效果：共鸣增幅（预扫描阶段处理，主执行中跳过）---
  RESONANCE_AMP: (ctx) => {
    // 不消耗 multiplier/repeats，不产出数值
    return ctx;
  },

  // --- 新效果：背水一战（标记传递，实际效果在 DEAL_DAMAGE 中） ---
  DESPERATE_STRIKE: (ctx) => {
    // 不消耗 multiplier/repeats，保持传递
    return ctx;
  },

  // --- 新效果：连锁防线 ---
  CHAIN_DEFENSE: (ctx, _card, slotIndex, pipeline) => {
    // 读取前面所有槽位中最高的护甲值（包括动作牌生成的护甲）
    let sourceArmor = 0;
    for (let i = slotIndex - 1; i >= 0; i--) {
      // 只要有卡牌（无论类型），就取其护甲值
      if (pipeline[i]) {
        sourceArmor = Math.max(sourceArmor, ctx.slotArmors[i]);
      }
    }
    if (sourceArmor <= 0) return ctx;

    // 将最高护盾值加到每一个槽位上（包括有防御卡的槽位）
    const newSlotArmors = [...ctx.slotArmors];
    for (let i = 0; i < pipeline.length; i++) {
      if (i === slotIndex) continue; // 跳过自己
      // 给每个槽位添加最高护盾值
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

// --- executePipelineV2：两遍扫描 ---

export function executePipelineV2(
  pipeline: (CardInstance | null)[],
  initialContext: ExecutionContext,
  slotStatuses: SlotStatus[],
): ExecutionContext {
  const slots = pipeline.length;

  // 初始化槽位级别数组
  let ctx: ExecutionContext = {
    ...initialContext,
    slotArmors: new Array(slots).fill(0),
    slotDamageContributions: new Array(slots).fill(0),
    damageRedirectMap: {},
    reflectPendingSlot: null,
  };

  // === 第一遍：预扫描（标记共鸣位、收集燃烧槽位） ===
  const resonanceSlots = new Set<number>();
  const burningSlots = new Set<number>();

  for (let i = 0; i < slots; i++) {
    const card = pipeline[i];
    // 预扫描标记旧版共鸣增幅（左右加成效果）
    if (card && card.effectId === 'RESONANCE_AMP') {
      resonanceSlots.add(i);
    }
    if (slotStatuses[i]?.statusEffects.some((e) => e.type === StatusEffectType.BURNING)) {
      burningSlots.add(i);
    }
  }

  // === 第二遍：主执行 ===
  for (let i = 0; i < slots; i++) {
    const card = pipeline[i];
    if (!card) continue;
    if (slotStatuses[i]?.isLocked) continue;

    // 旧版共鸣增幅卡本身不执行效果（已在预扫描中标记）
    if (card.effectId === 'RESONANCE_AMP') continue;

    // 计算旧版共鸣加成（左右都得有数值卡才生效）
    let resonanceMultiplier = 1;
    const hasLeftResonance = resonanceSlots.has(i - 1);
    const hasRightResonance = resonanceSlots.has(i + 1);
    const leftHasValue = i > 0 && pipeline[i - 1] !== null && pipeline[i - 1]?.effectId !== 'RESONANCE_AMP';
    const rightHasValue = i < pipeline.length - 1 && pipeline[i + 1] !== null && pipeline[i + 1]?.effectId !== 'RESONANCE_AMP';
    
    if (hasLeftResonance && leftHasValue) resonanceMultiplier *= 2;
    if (hasRightResonance && rightHasValue) resonanceMultiplier *= 2;

    // 计算燃烧减益
    let burningDivisor = 1;
    if (burningSlots.has(i)) burningDivisor = 2;

    // 创建临时卡牌副本（应用共鸣和燃烧）
    let effectiveBaseValue = card.baseValue;
    effectiveBaseValue = Math.floor(effectiveBaseValue * resonanceMultiplier / burningDivisor);

    const tempCard: CardInstance = { ...card, baseValue: effectiveBaseValue };

    const effectFn = EffectRegistry[card.effectId];
    if (!effectFn) {
      console.warn(`Unknown effect: ${card.effectId}`);
      continue;
    }

    ctx = effectFn(ctx, tempCard, i, pipeline);
  }

  return ctx;
}

// --- 应用遗物效果到执行上下文 ---

export function applyRelicEffectsToContext(
  ctx: ExecutionContext,
  pipeline: (CardInstance | null)[],
  relics: RelicId[],
): ExecutionContext {
  let newCtx = { ...ctx };

  // 遗物1：坚固壁垒 - 结算前每个槽位+2护甲
  if (relics.includes(RelicIdConst.SLOT_ARMOR_2)) {
    newCtx.slotArmors = newCtx.slotArmors.map((armor) => armor + 2);
    newCtx.accumulatedArmor += newCtx.slotArmors.length * 2;
  }

  // 遗物2：狂战士之怒 - 无护盾牌时总伤害+20%
  if (relics.includes(RelicIdConst.NO_ARMOR_DAMAGE_20)) {
    const hasArmorCard = pipeline.some(
      (card) => card && card.effectId === 'GAIN_ARMOR'
    );
    if (!hasArmorCard) {
      newCtx.accumulatedDamage = Math.floor(newCtx.accumulatedDamage * 1.2);
    }
  }

  // 遗物4：防御反击 - 无攻击牌时总伤害+10
  if (relics.includes(RelicIdConst.NO_ATTACK_DAMAGE_10)) {
    const hasAttackCard = pipeline.some(
      (card) => card && card.effectId === 'DEAL_DAMAGE'
    );
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
  let mirrorReflectBonus = 0;
  let resonanceTrigger = false;

  // 预扫描：找到所有共鸣增幅V2的位置及其目标槽位
  const resonanceAmpV2Targets = new Set<number>();
  // 检测是否有背水一战
  let hasDesperateStrike = false;
  for (let i = 0; i < pipeline.length; i++) {
    const card = pipeline[i];
    if (card?.effectId === 'RESONANCE_AMP_V2') {
      // 找到下一张非空卡牌的位置
      for (let j = i + 1; j < pipeline.length; j++) {
        if (pipeline[j]) {
          // 如果下一张是盾，记录这个位置
          const nextCard = pipeline[j];
          if (nextCard?.effectId === 'GAIN_ARMOR' || nextCard?.effectId === 'MIRROR_REFLECT') {
            resonanceAmpV2Targets.add(j);
          }
          break;
        }
      }
    }
    if (card?.effectId === 'DESPERATE_STRIKE') {
      hasDesperateStrike = true;
    }
  }

  // 创建可修改的护甲数组（用于遗物效果）
  let slotArmors = [...ctx.slotArmors];

  // 遗物3：危险预警 - 给最高伤害槽位+5护甲
  if (relics.includes(RelicIdConst.HIGH_DMG_SLOT_ARMOR_5)) {
    // 找出将被攻击的最高伤害槽位
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

  // 遗物5：侧翼防护 - 当最左或最右槽位被攻击时，给所有被攻击槽位+8护甲
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
    // 找 pipeline 中 baseValue 最高的非空卡所在 slotIndex
    let maxBaseValue = -1;
    let targetSlot = 0;
    for (let i = 0; i < pipeline.length; i++) {
      const card = pipeline[i];
      if (card && card.baseValue > maxBaseValue) {
        maxBaseValue = card.baseValue;
        targetSlot = i;
      }
    }
    // 从 intent.attacks 中读取 damage（存在 slotIndex=-1 的占位项）
    const damage = intent.attacks.length > 0 ? intent.attacks[0].damage : 0;
    resolvedAttacks = maxBaseValue >= 0 ? [{ slotIndex: targetSlot, damage }] : [];
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

    // 确保 actualSlot 在范围内
    if (actualSlot < 0 || actualSlot >= pipeline.length) continue;

    let incomingDamage = attack.damage;

    // 应用破绽加成
    if (playerVulnerableStacks > 0) {
      incomingDamage = Math.floor(incomingDamage * (1 + 0.15 * playerVulnerableStacks));
    }

    const card = pipeline[actualSlot];
    let armor = slotArmors[actualSlot] ?? 0;
    
    // 特殊处理：连锁防线卡 - 计算它应该获得的额外护甲值
    if (card?.effectId === 'CHAIN_DEFENSE') {
      // 找到前面所有槽位中最高的护甲值
      let sourceArmor = 0;
      for (let i = actualSlot - 1; i >= 0; i--) {
        if (pipeline[i]) {
          sourceArmor = Math.max(sourceArmor, slotArmors[i]);
        }
      }
      if (sourceArmor > 0) {
        armor += sourceArmor; // 添加最高护盾值到当前护甲
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

      // 镜面反射效果：完全格挡时，给总伤害加上此格的护盾值
      if (ctx.reflectPendingSlot === actualSlot && hpLoss === 0) {
        reflectDamageBonus += ctx.reflectArmorValue;
      }

      // 共鸣增幅V2效果：若此格是共鸣增幅的下一张盾且完美格挡，触发全局buff
      if (resonanceAmpV2Targets.has(actualSlot) && hpLoss === 0) {
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
    mirrorReflectBonus,
    resonanceTrigger,
    hasDesperateStrike,
    slotLinks: [], // 在 gameStore 中单独计算
  };
}

// 判断修饰卡是否有效（右侧是否有后续卡可修饰）
function isCardUseful(card: CardInstance, slotIndex: number, pipeline: (CardInstance | null)[]): boolean {
  if (card.type !== CardType.MODIFIER) return true;
  // 共鸣增幅只要左右有邻居就有效
  if (card.effectId === 'RESONANCE_AMP') {
    const hasLeft = slotIndex > 0 && pipeline[slotIndex - 1] !== null;
    const hasRight = slotIndex < pipeline.length - 1 && pipeline[slotIndex + 1] !== null;
    return hasLeft || hasRight;
  }
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
  // 做一次快速模拟（desperateHpLoss = 0）
  const simCtx = executePipelineV2(pipeline, { ...INITIAL_CONTEXT, desperateHpLoss: 0 }, slotStatuses);
  const simResult = resolveSlotCombat(simCtx, intent, pipeline, playerVulnerableStacks);
  return simResult.totalPlayerHpLoss;
}

