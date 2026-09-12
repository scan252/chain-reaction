import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type {
  CardInstance,
  CardTemplate,
  Enemy,
  GamePhase,
  ExecutionContext,
  SlotStatus,
  StatusEffect,
  SlotPreview,
  EnemyIntent,
  SlotLink,
} from '../types';
import { INITIAL_CONTEXT, StatusEffectType, CardType, AttackPattern } from '../types';
import {
  executePipelineV2,
  resolveSlotCombat,
  simulateForDesperateStrike,
  applyRelicEffectsToContext,
  cardKind,
} from '../engine/effectRegistry';
import { generateEnemyIntent } from '../data/mapData';
import { useRunStore } from './runStore';
import { SKILL_CARD } from '../data/cardData';
import { TIMING, STATUS, CLASS, PLAYER, PIPELINE, JUICE, KEYWORD, REST as _REST } from '../config/balance';

const GROWTH_CAP = KEYWORD.GLOBAL_GROWTH_CAP;
const grow = (base: number, delta: number) => Math.min(GROWTH_CAP, base + delta);

void _REST;

// 回合总结信息
export interface TurnSummary {
  totalDamage: number;
  totalArmor: number;
  effectiveArmor: number;
  hpLoss: number;
  burnHpCost: number;
  reflectDamageBonus: number;
  riposteDamage: number;
  comboMax: number;
  overdrive: boolean;
}

// Fisher-Yates 洗牌
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 计算槽位链接（连锁特效展示）
function computeSlotLinks(pipeline: (CardInstance | null)[], slotStatuses: SlotStatus[]): SlotLink[] {
  const links: SlotLink[] = [];
  const slots = pipeline.length;

  for (let i = 0; i < slots; i++) {
    const card = pipeline[i];
    if (!card) continue;
    if (slotStatuses[i]?.isLocked) continue;

    if (card.type === CardType.MODIFIER) {
      if (card.effectId === 'CHAIN_DEFENSE') {
        for (let j = i - 1; j >= 0; j--) {
          if (pipeline[j]) {
            links.push({ from: i, to: j, type: 'CHAIN_DEFENSE' });
            break;
          }
        }
      } else {
        for (let j = i + 1; j < slots; j++) {
          if (pipeline[j]) {
            links.push({
              from: i,
              to: j,
              type: card.effectId === 'RESONANCE_TUNER' ? 'RESONANCE' : 'MODIFIER',
            });
            break;
          }
        }
      }
    }

    // 共鸣卡与相邻同类卡的链接
    if (card.resonance) {
      const kind = cardKind(card);
      if (i > 0 && pipeline[i - 1] && cardKind(pipeline[i - 1]!) === kind) {
        links.push({ from: i, to: i - 1, type: 'RESONANCE' });
      }
      if (i < slots - 1 && pipeline[i + 1] && cardKind(pipeline[i + 1]!) === kind) {
        links.push({ from: i, to: i + 1, type: 'RESONANCE' });
      }
    }

    if (card.effectId === 'DESPERATE_STRIKE') {
      for (let j = i + 1; j < slots; j++) {
        const nextCard = pipeline[j];
        if (!nextCard) continue;
        if (['DEAL_DAMAGE', 'PHASE_SHIFT', 'BLOOD_PRICE', 'PHOENIX_STRIKE', 'CHAIN_STORM', 'GRAND_FINALE'].includes(nextCard.effectId)) {
          let hasBlocker = false;
          for (let k = i + 1; k < j; k++) {
            if (pipeline[k] && pipeline[k]?.effectId !== 'DESPERATE_STRIKE') {
              hasBlocker = true;
              break;
            }
          }
          if (!hasBlocker) {
            links.push({ from: i, to: j, type: 'DESPERATE_STRIKE' });
          }
          break;
        }
        if (nextCard.effectId !== 'DESPERATE_STRIKE') break;
      }
    }
  }

  return links;
}

function toInstance(template: CardTemplate): CardInstance {
  return { ...template, uuid: uuidv4() };
}

function makeEmptySlotStatuses(count: number): SlotStatus[] {
  return Array.from({ length: count }, () => ({
    isLocked: false,
    statusEffects: [],
  }));
}

const DEFAULT_INTENT: EnemyIntent = {
  pattern: AttackPattern.SINGLE,
  attacks: [{ slotIndex: 0, damage: 8 }],
  lockedSlots: [],
  description: '攻击槽位 1（8 伤害）',
};

const DEFAULT_ENEMY: Enemy = {
  name: '史莱姆',
  emoji: '🟢',
  maxHp: 42,
  currentHp: 42,
  armor: 0,
  intent: DEFAULT_INTENT,
  attackPatterns: [{ pattern: AttackPattern.SINGLE, weight: 100 }],
  baseDamage: 6,
  damageVariance: 3,
  chargeMultiplier: 1,
};

interface GameState {
  phase: GamePhase;

  drawPile: CardInstance[];
  hand: CardInstance[];
  pipeline: (CardInstance | null)[];
  /** 结算展示用快照 */
  pipelineSnapshot: (CardInstance | null)[] | null;
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];

  enemy: Enemy;

  playerHp: number;
  playerMaxHp: number;
  playerArmor: number;
  pipelineSlots: number;
  handDrawCount: number;

  slotStatuses: SlotStatus[];
  playerStatusEffects: StatusEffect[];
  slotPreviews: SlotPreview[];
  slotLinks: SlotLink[];

  executingIndex: number;
  executionLog: string[];
  lastExecutionResult: ExecutionContext | null;
  showExecutionSummary: boolean;
  turnSummary: TurnSummary | null;

  turnNumber: number;
  skillUsedThisBattle: boolean;

  // 动画控制
  animationFast: boolean;
  skipRequested: boolean;

  // 成长与爽点层
  globalDamageBonus: number;
  /** 超导：连锁触发额外伤害（本场累计） */
  battleChainBonus: number;
  /** 本场已付焚身代价的卡实例（焚身每场只付一次） */
  battleBurnPaid: string[];
  /** 本场累计损失 HP（复仇誓言） */
  hpLostThisBattle: number;
  /** 上回合总伤害（过载判定基准） */
  lastTurnDamage: number;
  /** 当前连击数（表现层） */
  comboCount: number;
  /** 本回合最高连击 */
  comboMax: number;
  /** 过载特效触发标记 */
  overdriveFlash: boolean;

  battleStats: {
    totalDamage: number;
    totalArmor: number;
    effectiveArmor: number;
  };

  // Actions
  initBattle: (enemy: Enemy) => void;
  drawCards: () => void;
  addToPipeline: (cardUuid: string, slotIndex: number) => void;
  removeFromPipeline: (slotIndex: number) => void;
  reorderPipeline: (fromIndex: number, toIndex: number) => void;
  executePipelineAction: () => Promise<void>;
  nextTurn: () => void;
  computeSlotPreviews: () => void;
  activateClassSkill: () => boolean;
  dismissExecutionSummary: () => void;
  setAnimationFast: (fast: boolean) => void;
  requestSkip: () => void;
}

/** 组装执行上下文的公共预计算 */
function buildContext(state: {
  pipelineLength: number;
  desperateHpLoss: number;
  globalDamageBonus: number;
  battleChainBonus: number;
  playerHp: number;
  playerMaxHp: number;
  hpLostThisBattle: number;
  weakened: boolean;
  attackedSlotCount: number;
  paidBurnCardIds?: string[];
  relics?: string[];
}): ExecutionContext {
  return {
    ...INITIAL_CONTEXT,
    paidBurnCardIds: [...(state.paidBurnCardIds ?? [])],
    relicChainBonus: state.relics?.includes('CHAIN_ENGINE') ? 1 : 0,
    relicBurnDiscount: state.relics?.includes('BURN_ENGINE') ? 1 : 0,
    slotArmors: new Array(state.pipelineLength).fill(0),
    slotDamageContributions: new Array(state.pipelineLength).fill(0),
    desperateHpLoss: state.desperateHpLoss,
    globalDamageBonus: state.globalDamageBonus,
    chainBonusPerTrigger: state.battleChainBonus,
    playerHpCurrent: state.playerHp,
    hpLostThisBattle: state.hpLostThisBattle,
    deadlyEligible: state.playerHp > 0 && state.playerHp <= Math.floor(state.playerMaxHp * KEYWORD.DEADLY_THRESHOLD),
    weakened: state.weakened,
    attackedSlotCount: state.attackedSlotCount,
  };
}

export const useGameStore = create<GameState>()(
  immer((set, get) => ({
    phase: 'DRAW' as GamePhase,
    drawPile: [],
    hand: [],
    pipeline: [],
    pipelineSnapshot: null,
    discardPile: [],
    exhaustPile: [],
    enemy: { ...DEFAULT_ENEMY },
    playerHp: PLAYER.MAX_HP,
    playerMaxHp: PLAYER.MAX_HP,
    playerArmor: 0,
    pipelineSlots: PIPELINE.INITIAL_SLOTS,
    handDrawCount: PIPELINE.HAND_DRAW_COUNT,
    slotStatuses: [],
    playerStatusEffects: [],
    slotPreviews: [],
    slotLinks: [],
    executingIndex: -1,
    executionLog: [],
    lastExecutionResult: null,
    showExecutionSummary: false,
    turnSummary: null,
    turnNumber: 1,
    skillUsedThisBattle: false,
    animationFast: false,
    skipRequested: false,
    globalDamageBonus: 0,
    battleChainBonus: 0,
    battleBurnPaid: [],
    hpLostThisBattle: 0,
    lastTurnDamage: 0,
    comboCount: 0,
    comboMax: 0,
    overdriveFlash: false,
    battleStats: { totalDamage: 0, totalArmor: 0, effectiveArmor: 0 },

    initBattle: (enemy: Enemy) => {
      const runState = useRunStore.getState();

      const forbiddenInstance = runState.masterDeck.some((c) => c.templateId === 'forbidden_001')
        ? toInstance(runState.masterDeck.find((c) => c.templateId === 'forbidden_001')!)
        : null;

      const deckCards = runState.masterDeck
        .filter((c) => c.templateId !== 'forbidden_001')
        .map(toInstance);
      const deck = shuffle(deckCards);

      set((state) => {
        state.drawPile = deck;
        state.hand = [];
        state.pipeline = Array(runState.pipelineSlots).fill(null);
        state.pipelineSnapshot = null;
        state.discardPile = [];
        state.exhaustPile = [];
        state.skillUsedThisBattle = false;
        state.globalDamageBonus = 0;
        state.battleChainBonus = 0;
        state.hpLostThisBattle = Math.max(0, runState.playerMaxHp - runState.playerHp);
        state.lastTurnDamage = 0;
        state.comboCount = 0;
        state.comboMax = 0;
        state.overdriveFlash = false;
        state.battleStats = { totalDamage: 0, totalArmor: 0, effectiveArmor: 0 };
        state.enemy = { ...enemy };
        state.playerHp = runState.playerHp;
        state.playerMaxHp = runState.playerMaxHp;
        state.playerArmor = 0;
        state.pipelineSlots = runState.pipelineSlots;
        state.handDrawCount = runState.handDrawCount;
        state.phase = 'DRAW';
        state.executingIndex = -1;
        state.executionLog = [];
        state.lastExecutionResult = null;
        state.turnNumber = 1;
        state.playerStatusEffects = [];
        state.slotPreviews = [];
        state.slotLinks = [];
        state.slotStatuses = makeEmptySlotStatuses(runState.pipelineSlots);

        for (const lockedIdx of enemy.intent.lockedSlots) {
          if (lockedIdx >= 0 && lockedIdx < runState.pipelineSlots) {
            state.slotStatuses[lockedIdx].isLocked = true;
          }
        }
      });
      get().drawCards();

      if (forbiddenInstance) {
        set((state) => {
          state.hand.push(forbiddenInstance);
        });
      }
    },

    drawCards: () => {
      set((state) => {
        let needed = state.handDrawCount;
        while (needed > 0) {
          if (state.drawPile.length === 0) {
            if (state.discardPile.length === 0) break;
            state.drawPile = shuffle([...state.discardPile]);
            state.discardPile = [];
          }
          const card = state.drawPile.pop();
          if (card) {
            state.hand.push(card);
            needed--;
          }
        }
        state.phase = 'PLAY';
      });
    },

    addToPipeline: (cardUuid: string, slotIndex: number) => {
      set((state) => {
        if (state.phase !== 'PLAY') return;
        if (slotIndex < 0 || slotIndex >= state.pipelineSlots) return;
        if (state.pipeline[slotIndex] !== null) return;
        if (state.slotStatuses[slotIndex]?.isLocked) return;

        const cardIdx = state.hand.findIndex((c) => c.uuid === cardUuid);
        if (cardIdx === -1) return;

        const card = state.hand[cardIdx];
        state.hand.splice(cardIdx, 1);
        state.pipeline[slotIndex] = card;
        state.slotPreviews = [];
      });

      get().computeSlotPreviews();
    },

    removeFromPipeline: (slotIndex: number) => {
      set((state) => {
        if (state.phase !== 'PLAY') return;
        const card = state.pipeline[slotIndex];
        if (!card) return;
        state.pipeline[slotIndex] = null;
        state.hand.push(card);
        state.slotPreviews = [];
        state.slotLinks = [];
      });
    },

    reorderPipeline: (fromIndex: number, toIndex: number) => {
      set((state) => {
        if (state.phase !== 'PLAY') return;
        const cardA = state.pipeline[fromIndex];
        const cardB = state.pipeline[toIndex];
        if (!cardA) return;

        if (state.slotStatuses[toIndex]?.isLocked) return;
        if (cardB === null && state.slotStatuses[fromIndex]?.isLocked) return;

        state.pipeline[fromIndex] = cardB;
        state.pipeline[toIndex] = cardA;
        state.slotPreviews = [];
        state.slotLinks = [];
      });
    },

    computeSlotPreviews: () => {
      const state = get();
      const allFilled = state.pipeline.every((card, i) => {
        if (state.slotStatuses[i]?.isLocked) return true;
        return card !== null;
      });
      if (!allFilled) {
        set((s) => { s.slotPreviews = []; });
        return;
      }

      const vulnStacks = state.playerStatusEffects
        .filter((e) => e.type === StatusEffectType.VULNERABLE)
        .reduce((sum, e) => sum + e.stacks, 0);

      const weakened = state.playerStatusEffects.some((e) => e.type === StatusEffectType.WEAKENED);
      const runState = useRunStore.getState();
      const relics = runState.relics;
      const attackedSlotCount = new Set(
        state.enemy.intent.attacks.map((a) => a.slotIndex).filter((i) => i >= 0),
      ).size + (state.enemy.intent.pattern === AttackPattern.WEAK_POINT_SNIPE ? 1 : 0);

      const ctx = buildContext({
        pipelineLength: state.pipeline.length,
        desperateHpLoss: 0,
        globalDamageBonus: state.globalDamageBonus,
        battleChainBonus: state.battleChainBonus,
        playerHp: state.playerHp,
        playerMaxHp: state.playerMaxHp,
        hpLostThisBattle: state.hpLostThisBattle,
        weakened,
        attackedSlotCount,
        paidBurnCardIds: [...state.battleBurnPaid],
        relics: runState.relics as unknown as string[],
      });

      const resonanceRate = relics.includes('RESONANCE_ENGINE')
        ? KEYWORD.RESONANCE_ENGINE_BONUS
        : KEYWORD.RESONANCE_BONUS;

      let simCtx = executePipelineV2(state.pipeline, ctx, state.slotStatuses, resonanceRate);
      simCtx = applyRelicEffectsToContext(simCtx, state.pipeline, relics);
      const result = resolveSlotCombat(simCtx, state.enemy.intent, state.pipeline, vulnStacks, relics);
      const links = computeSlotLinks(state.pipeline, state.slotStatuses);

      set((s) => {
        s.slotPreviews = result.slotResults;
        s.slotLinks = links;
      });
    },

    executePipelineAction: async () => {
      const { pipeline, slotStatuses, enemy, playerStatusEffects, playerHp, playerMaxHp, phase } = get();
      if (phase !== 'PLAY') return; // 重入保护
      const cardsInPipeline = pipeline.filter((c): c is CardInstance => c !== null);
      if (cardsInPipeline.length === 0) return;

      const vulnStacks = playerStatusEffects
        .filter((e) => e.type === StatusEffectType.VULNERABLE)
        .reduce((sum, e) => sum + e.stacks, 0);

      // === 阶段零：预计算 ===
      const hasDesperate = pipeline.some((c) => c?.effectId === 'DESPERATE_STRIKE');
      let estimatedHpLoss = 0;
      if (hasDesperate) {
        estimatedHpLoss = simulateForDesperateStrike(pipeline, slotStatuses, enemy.intent, vulnStacks);
      }

      const weakened = playerStatusEffects.some((e) => e.type === StatusEffectType.WEAKENED);
      const attackedSlotCount = new Set(
        enemy.intent.attacks.map((a) => a.slotIndex).filter((i) => i >= 0),
      ).size + (enemy.intent.pattern === AttackPattern.WEAK_POINT_SNIPE ? 1 : 0);

      set((state) => {
        state.phase = 'EXECUTE_PHASE1';
        state.executionLog = [];
        state.lastExecutionResult = null;
        state.slotPreviews = [];
        state.slotLinks = [];
        state.skipRequested = false;
        state.comboCount = 0;
        state.comboMax = 0;
      });

      const wait = (ms: number) =>
        new Promise<void>((r) => {
          const { skipRequested, animationFast } = get();
          const delay = skipRequested ? 0 : Math.round(ms * (animationFast ? TIMING.FAST_MODE_MULTIPLIER : 1));
          setTimeout(r, delay);
        });

      const runState = useRunStore.getState();
      const resonanceRate = runState.relics.includes('RESONANCE_ENGINE')
        ? KEYWORD.RESONANCE_ENGINE_BONUS
        : KEYWORD.RESONANCE_BONUS;

      let ctx = buildContext({
        pipelineLength: pipeline.length,
        desperateHpLoss: estimatedHpLoss,
        globalDamageBonus: get().globalDamageBonus,
        battleChainBonus: get().battleChainBonus,
        playerHp,
        playerMaxHp,
        hpLostThisBattle: get().hpLostThisBattle,
        weakened,
        attackedSlotCount,
        paidBurnCardIds: [...get().battleBurnPaid],
        relics: runState.relics as unknown as string[],
      });

      // === 阶段一：管道执行 ===
      ctx = executePipelineV2(pipeline, ctx, slotStatuses, resonanceRate);
      ctx = applyRelicEffectsToContext(ctx, pipeline, runState.relics);

      // 逐槽位动画 + 连击计数
      let lastKind: string | null = null;
      for (let i = 0; i < pipeline.length; i++) {
        const card = pipeline[i];
        if (!card) continue;
        if (slotStatuses[i]?.isLocked) continue;

        set((state) => {
          state.executingIndex = i;
          // 连击：与上一张执行卡同类 +1
          const kind = cardKind(card);
          if (kind !== 'OTHER' && kind === lastKind) {
            state.comboCount += 1;
            state.comboMax = Math.max(state.comboMax, state.comboCount);
          } else if (kind !== 'OTHER') {
            state.comboCount = 1;
            state.comboMax = Math.max(state.comboMax, state.comboCount);
          }
        });
        const kindNow = cardKind(card);
        if (kindNow !== 'OTHER') lastKind = kindNow;

        // 超导是本场成长：结算到 battleChainBonus
        if (card.effectId === 'SUPERCONDUCTOR') {
          set((state) => {
            state.battleChainBonus = Math.min(GROWTH_CAP, state.battleChainBonus + card.baseValue);
          });
        }

        await wait(TIMING.CARD_EXECUTE);

        const slotDmg = ctx.slotDamageContributions[i] ?? 0;
        const slotArmor = ctx.slotArmors[i] ?? 0;

        set((state) => {
          if (slotDmg > 0) {
            state.executionLog.push(`${card.name} → 伤害 +${slotDmg}`);
          } else if (slotArmor > 0) {
            state.executionLog.push(`${card.name} → 护盾 +${slotArmor}`);
          } else if (card.effectId === 'MULTIPLY_NEXT') {
            state.executionLog.push(`${card.name} → 下一张 ×${card.baseValue}`);
          } else if (card.effectId === 'REPEAT_NEXT') {
            state.executionLog.push(`${card.name} → 下一张触发 ${card.baseValue} 次`);
          } else if (card.effectId === 'CHAIN_IMBUE') {
            state.executionLog.push(`${card.name} → 下一张获得连锁${card.baseValue}`);
          } else if (card.effectId === 'SUPERCONDUCTOR') {
            state.executionLog.push(`${card.name} → 连锁触发+${card.baseValue}（本场）`);
          } else if (card.effectId === 'DESPERATE_STRIKE') {
            state.executionLog.push(`${card.name} → 预估换血 ${estimatedHpLoss}`);
          } else if (card.effectId === 'CHAIN_DEFENSE') {
            state.executionLog.push(`${card.name} → 护甲覆盖全槽位`);
          } else if (card.effectId === 'PHASE_SHIFT') {
            state.executionLog.push(`${card.name} → 伤害转移至左侧`);
          } else if (card.effectId === 'SCORCH') {
            state.executionLog.push(`${card.name} → 伤害+点燃槽位 ${i + 1}`);
          } else if (card.effectId === 'DEADLY') {
            state.executionLog.push(`${card.name} → ${ctx.deadlyEligible ? '亡命 ×1.5 生效！' : 'HP 高于 50%，未生效'}`);
          } else {
            state.executionLog.push(`${card.name} → 已激活`);
          }
        });
      }

      set((state) => {
        state.lastExecutionResult = ctx;
        state.executingIndex = -1;
      });

      // === 阶段二：敌方行动 ===
      await wait(TIMING.PHASE_TRANSITION);

      set((state) => {
        state.phase = 'EXECUTE_PHASE2';
      });

      const combatResult = resolveSlotCombat(ctx, enemy.intent, pipeline, vulnStacks, runState.relics);

      for (const result of combatResult.slotResults) {
        set((state) => {
          state.executingIndex = result.slotIndex;
        });

        await wait(TIMING.SLOT_UNDER_ATTACK);

        set((state) => {
          if (result.blockedDamage > 0 && result.hpLoss === 0) {
            state.executionLog.push(
              `槽位 ${result.slotIndex + 1}: 受击 ${result.incomingDamage} → 完全格挡！`,
            );
          } else if (result.blockedDamage > 0) {
            state.executionLog.push(
              `槽位 ${result.slotIndex + 1}: 受击 ${result.incomingDamage} → 格挡 ${result.blockedDamage} → 掉血 ${result.hpLoss}`,
            );
          } else if (result.isVulnerablePenalty) {
            state.executionLog.push(
              `槽位 ${result.slotIndex + 1}: 空门大开！受击 ${result.incomingDamage} + 破绽`,
            );
          } else {
            state.executionLog.push(
              `槽位 ${result.slotIndex + 1}: 换血拼刀！受击 ${result.incomingDamage}`,
            );
          }
        });
      }

      // 非攻击意图（蓄力/蓄势/增益/衰弱）的结算提示
      const intent = enemy.intent;
      if (intent.pattern === AttackPattern.CHARGE_UP) {
        set((state) => {
          state.executionLog.push(`敌方蓄力完成 → 下回合攻击 ×${intent.chargeMultiplier ?? KEYWORD.CHARGE_UP_MULTIPLIER}`);
        });
      }

      set((state) => {
        state.executingIndex = -1;
      });

      // === 阶段三：伤害结算与清理 ===
      await wait(TIMING.PHASE_FINALIZE);

      set((state) => {
        state.phase = 'EXECUTE_PHASE3';
        state.showExecutionSummary = true;
        state.pipelineSnapshot = [...state.pipeline];

        // ---- 敌方非攻击意图生效 ----
        if (intent.pattern === AttackPattern.FORTIFY) {
          state.enemy.armor += intent.buffValue ?? 10;
          state.executionLog.push(`敌方蓄势 → 自身护盾 +${intent.buffValue ?? 10}`);
        } else if (intent.pattern === AttackPattern.ENRAGE) {
          state.enemy.baseDamage += intent.buffValue ?? 3;
          state.executionLog.push(`敌方增益 → 攻击永久 +${intent.buffValue ?? 3}`);
        } else if (intent.pattern === AttackPattern.WEAKEN) {
          const existing = state.playerStatusEffects.find((e) => e.type === StatusEffectType.WEAKENED);
          if (existing) {
            existing.duration = STATUS.DEFAULT_DURATION;
          } else {
            state.playerStatusEffects.push({
              type: StatusEffectType.WEAKENED,
              stacks: 1,
              duration: STATUS.DEFAULT_DURATION,
            });
          }
          state.executionLog.push('敌方衰弱 → 下回合卡牌数值 -25%');
        } else if (intent.pattern === AttackPattern.CHARGE_UP) {
          state.enemy.chargeMultiplier = intent.chargeMultiplier ?? KEYWORD.CHARGE_UP_MULTIPLIER;
        }

        // ---- 玩家扣血（受击 + 焚身） ----
        let actualHpLoss = combatResult.totalPlayerHpLoss;
        if (combatResult.hasDesperateStrike && combatResult.totalPlayerHpLoss > 0) {
          const targetHp = Math.max(1, state.playerHp - combatResult.totalPlayerHpLoss);
          actualHpLoss = state.playerHp - targetHp;
          state.playerHp = targetHp;
          if (actualHpLoss < combatResult.totalPlayerHpLoss) {
            state.executionLog.push('背水一战 → 生命值锁定在 1 点');
          }
        } else {
          state.playerHp = Math.max(0, state.playerHp - combatResult.totalPlayerHpLoss);
        }

        // 焚身代价（每场只付一次，最多扣到 1）
        for (const id of ctx.paidBurnCardIds) {
          if (!state.battleBurnPaid.includes(id)) state.battleBurnPaid.push(id);
        }
        const burnCost = Math.min(ctx.totalBurnHpCost, Math.max(0, state.playerHp - 1));
        if (burnCost > 0) {
          state.playerHp -= burnCost;
          actualHpLoss += burnCost;
          state.executionLog.push(`焚身 → 生命 -${burnCost}`);
        }

        state.hpLostThisBattle += actualHpLoss;

        // ---- 破绽 ----
        if (combatResult.newVulnerableStacks > 0) {
          const existing = state.playerStatusEffects.find(
            (e) => e.type === StatusEffectType.VULNERABLE,
          );
          if (existing) {
            existing.stacks += combatResult.newVulnerableStacks;
            existing.duration = Math.max(existing.duration, STATUS.DEFAULT_DURATION);
          } else {
            state.playerStatusEffects.push({
              type: StatusEffectType.VULNERABLE,
              stacks: combatResult.newVulnerableStacks,
              duration: STATUS.DEFAULT_DURATION,
            });
          }
        }

        // ---- 反击/黄金钟/共鸣成长 ----
        if (combatResult.riposteDamage > 0) {
          state.executionLog.push(`反击 → 附加伤害 +${combatResult.riposteDamage}`);
        }
        if (combatResult.riposteGuardHits > 0) {
          state.globalDamageBonus = grow(state.globalDamageBonus, 2 * combatResult.riposteGuardHits);
          state.executionLog.push(`受身 → 被击 ${combatResult.riposteGuardHits} 次，全场动作牌本场 +${2 * combatResult.riposteGuardHits}`);
        }
        if (combatResult.perfectBlockTrigger) {
          state.globalDamageBonus = grow(state.globalDamageBonus, 4);
          state.executionLog.push('黄金钟 → 全场动作牌本场 +4');
        }
        if (combatResult.resonanceTrigger) {
          state.globalDamageBonus = grow(state.globalDamageBonus, 1);
          state.executionLog.push('共鸣增幅 → 全场动作牌本场 +1');
        }

        // ---- 总伤害与敌方扣血 ----
        const totalDmg = ctx.accumulatedDamage + combatResult.reflectDamageBonus + combatResult.riposteDamage;

        let dmg = totalDmg;
        if (state.enemy.armor > 0) {
          const absorbed = Math.min(state.enemy.armor, dmg);
          state.enemy.armor -= absorbed;
          dmg -= absorbed;
        }
        state.enemy.currentHp = Math.max(0, state.enemy.currentHp - dmg);

        if (combatResult.reflectDamageBonus > 0) {
          state.executionLog.push(`镜面反射 → 反弹 +${combatResult.reflectDamageBonus}`);
        }

        state.executionLog.push(`总伤害: ${totalDmg} → 敌方剩余 HP: ${state.enemy.currentHp}`);

        // ---- 过载判定（爽点） ----
        const overdrive = totalDmg >= Math.max(JUICE.OVERDRIVE_BASE, state.lastTurnDamage * JUICE.OVERDRIVE_RATIO);
        if (overdrive) {
          state.overdriveFlash = true;
          state.executionLog.push('⚡ 过载！连击超越了极限！');
        }
        state.lastTurnDamage = totalDmg;

        const effectiveArmor = combatResult.slotResults.reduce((sum, r) => sum + r.blockedDamage, 0);

        state.battleStats.totalDamage += totalDmg;
        state.battleStats.totalArmor += ctx.accumulatedArmor;
        state.battleStats.effectiveArmor += effectiveArmor;

        state.turnSummary = {
          totalDamage: totalDmg,
          totalArmor: ctx.accumulatedArmor,
          effectiveArmor,
          hpLoss: actualHpLoss,
          burnHpCost: burnCost,
          reflectDamageBonus: combatResult.reflectDamageBonus,
          riposteDamage: combatResult.riposteDamage,
          comboMax: state.comboMax,
          overdrive,
        };

        // ---- 焦土点燃 ----
        for (const slotIdx of ctx.slotsToIgnite) {
          if (slotIdx >= 0 && slotIdx < state.slotStatuses.length) {
            const existing = state.slotStatuses[slotIdx].statusEffects.find((e) => e.type === StatusEffectType.IGNITED);
            if (existing) {
              existing.duration = 3;
            } else {
              state.slotStatuses[slotIdx].statusEffects.push({
                type: StatusEffectType.IGNITED,
                stacks: 1,
                duration: 3,
              });
            }
          }
        }

        // ---- 弃牌 ----
        for (let i = 0; i < state.pipeline.length; i++) {
          const c = state.pipeline[i];
          if (c) {
            if (c.templateId === 'skill_001') {
              state.exhaustPile.push(c);
            } else {
              state.discardPile.push(c);
            }
          }
          state.pipeline[i] = null;
        }

        state.discardPile.push(...state.hand);
        state.hand = [];

        // ---- 燃烧标记 ----
        for (const burnSlot of combatResult.slotsToMarkBurning) {
          if (burnSlot >= 0 && burnSlot < state.slotStatuses.length) {
            const alreadyBurning = state.slotStatuses[burnSlot].statusEffects.some(
              (e) => e.type === StatusEffectType.BURNING,
            );
            if (!alreadyBurning) {
              state.slotStatuses[burnSlot].statusEffects.push({
                type: StatusEffectType.BURNING,
                stacks: 1,
                duration: STATUS.DEFAULT_DURATION,
              });
            }
          }
        }

        // ---- 胜负判定 ----
        if (state.enemy.currentHp <= 0) {
          state.phase = 'VICTORY';
          // 同时击杀玩家时判胜利，并保证存活（否则下一场带着 0 HP 必败）
          state.playerHp = Math.max(1, state.playerHp);
        } else if (state.playerHp <= 0) {
          state.phase = 'DEFEAT';
        } else {
          // Boss 二阶段
          const e = state.enemy;
          if (e.isBoss && e.phase2Patterns && e.currentHp <= Math.floor(e.maxHp / 2)) {
            const changed = e.attackPatterns !== e.phase2Patterns;
            if (changed) {
              e.attackPatterns = e.phase2Patterns;
              state.executionLog.push('⚠ Boss 进入狂怒阶段！');
            }
          }

          // 生成下回合意图（应用蓄力倍率）
          const newIntent = generateEnemyIntent(
            {
              baseDamage: state.enemy.baseDamage,
              damageVariance: state.enemy.damageVariance,
              attackPatterns: state.enemy.attackPatterns,
              chargeMultiplier: state.enemy.chargeMultiplier,
            },
            state.pipelineSlots,
          );
          state.enemy.intent = newIntent;
          state.enemy.chargeMultiplier =
            newIntent.pattern === AttackPattern.CHARGE_UP ? (newIntent.chargeMultiplier ?? 1) : 1;

          for (const ss of state.slotStatuses) {
            ss.isLocked = false;
          }

          for (const lockedIdx of newIntent.lockedSlots) {
            if (lockedIdx >= 0 && lockedIdx < state.slotStatuses.length) {
              state.slotStatuses[lockedIdx].isLocked = true;
            }
          }
        }
      });
    },

    nextTurn: () => {
      set((state) => {
        state.turnNumber += 1;
        state.playerArmor = 0;
        state.phase = 'DRAW';
        state.executionLog = [];
        state.lastExecutionResult = null;
        state.turnSummary = null;
        state.slotPreviews = [];
        state.slotLinks = [];
        state.pipelineSnapshot = null;
        state.comboCount = 0;
        state.comboMax = 0;
        state.overdriveFlash = false;

        state.playerStatusEffects = state.playerStatusEffects
          .map((e) => ({ ...e, duration: e.duration - 1 }))
          .filter((e) => e.duration > 0);

        for (const ss of state.slotStatuses) {
          ss.statusEffects = ss.statusEffects
            .map((e) => ({ ...e, duration: e.duration - 1 }))
            .filter((e) => e.duration > 0);
        }
      });
      get().drawCards();
    },

    activateClassSkill: () => {
      const runState = useRunStore.getState();
      const { playerProfile, playerMp, spendSkillMp } = runState;
      const { skillUsedThisBattle, playerHp, playerMaxHp } = get();

      if (skillUsedThisBattle) return false;
      if (!playerProfile || playerMp <= 0) return false;

      if (playerProfile.class === 'WARRIOR') {
        set((state) => {
          state.hand.push(toInstance(SKILL_CARD));
          state.skillUsedThisBattle = true;
        });
        spendSkillMp();
        return true;
      }

      if (playerProfile.class === 'PRIEST') {
        if (playerHp >= playerMaxHp) return false;

        set((state) => {
          state.playerHp = Math.min(state.playerMaxHp, state.playerHp + CLASS.PRIEST_HEAL);
          state.skillUsedThisBattle = true;
        });
        spendSkillMp();
        return true;
      }

      return false;
    },

    dismissExecutionSummary: () => {
      set((state) => {
        state.showExecutionSummary = false;
      });
    },

    setAnimationFast: (fast: boolean) => {
      set((state) => {
        state.animationFast = fast;
      });
    },

    requestSkip: () => {
      set((state) => {
        state.skipRequested = true;
      });
    },
  })),
);

// 开发/测试调试钩子
if (import.meta.env.DEV) {
  (window as Window & { __gameStore?: typeof useGameStore }).__gameStore = useGameStore;
}
