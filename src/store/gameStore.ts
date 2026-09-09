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

// 回合总结信息
export interface TurnSummary {
  totalDamage: number;
  totalArmor: number;
  effectiveArmor: number;
  hpLoss: number;
  reflectDamageBonus: number;
}
import { INITIAL_CONTEXT, StatusEffectType, CardType } from '../types';
import {
  executePipelineV2,
  resolveSlotCombat,
  simulateForDesperateStrike,
  applyRelicEffectsToContext,
  isAttackEffect,
} from '../engine/effectRegistry';
import { generateEnemyIntent } from '../data/mapData';
import { useRunStore } from './runStore';
import { ALL_CARD_POOL } from '../data/cardData';
import { TIMING, STATUS, CLASS, PLAYER, PIPELINE } from '../config/balance';

// Fisher-Yates 洗牌
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 计算槽位链接（用于显示连锁特效）
function computeSlotLinks(pipeline: (CardInstance | null)[], slotStatuses: SlotStatus[]): SlotLink[] {
  const links: SlotLink[] = [];
  const slots = pipeline.length;

  for (let i = 0; i < slots; i++) {
    const card = pipeline[i];
    if (!card) continue;
    if (slotStatuses[i]?.isLocked) continue;

    if (card.type === CardType.MODIFIER) {
      // 连锁防线：链接到前面最近的卡
      if (card.effectId === 'CHAIN_DEFENSE') {
        for (let j = i - 1; j >= 0; j--) {
          if (pipeline[j]) {
            links.push({ from: i, to: j, type: 'CHAIN_DEFENSE' });
            break;
          }
        }
      }
      // 其他修饰卡（含共鸣增幅）：链接到下一张非空卡
      else {
        for (let j = i + 1; j < slots; j++) {
          if (pipeline[j]) {
            links.push({ from: i, to: j, type: card.effectId === 'RESONANCE_AMP_V2' ? 'RESONANCE' : 'MODIFIER' });
            break;
          }
        }
      }
    }

    // 背水一战：检查是否有攻击卡在其后使用其效果
    if (card.effectId === 'DESPERATE_STRIKE') {
      for (let j = i + 1; j < slots; j++) {
        const nextCard = pipeline[j];
        if (!nextCard) continue;
        if (isAttackEffect(nextCard.effectId)) {
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
  pattern: 'SINGLE',
  attacks: [{ slotIndex: 0, damage: 8 }],
  lockedSlots: [],
  description: '攻击槽位 1（8 伤害）',
};

const DEFAULT_ENEMY: Enemy = {
  name: '史莱姆',
  emoji: '🟢',
  maxHp: 40,
  currentHp: 40,
  armor: 0,
  intent: DEFAULT_INTENT,
  attackPatterns: [{ pattern: 'SINGLE', weight: 100 }],
  baseDamage: 6,
  damageVariance: 4,
};

interface GameState {
  phase: GamePhase;

  // 牌组
  drawPile: CardInstance[];
  hand: CardInstance[];
  pipeline: (CardInstance | null)[];
  /** 结算展示用的管道快照（EXECUTE_PHASE3 期间 pipeline 已清空） */
  pipelineSnapshot: (CardInstance | null)[] | null;
  discardPile: CardInstance[];
  exhaustPile: CardInstance[]; // 消耗牌堆

  // 敌人
  enemy: Enemy;

  // 玩家（战斗中实时值）
  playerHp: number;
  playerMaxHp: number;
  playerArmor: number;
  pipelineSlots: number;
  handDrawCount: number;

  // 槽位状态
  slotStatuses: SlotStatus[];
  playerStatusEffects: StatusEffect[];
  slotPreviews: SlotPreview[];
  slotLinks: SlotLink[];

  // 结算动画
  executingIndex: number;
  executionLog: string[];
  lastExecutionResult: ExecutionContext | null;
  showExecutionSummary: boolean;
  turnSummary: TurnSummary | null;

  // 回合计数
  turnNumber: number;

  // 技能使用限制（每场战斗只能使用一次）
  skillUsedThisBattle: boolean;

  // 动画控制
  animationFast: boolean;
  skipRequested: boolean;

  // 全局buff（共鸣增幅触发）
  globalDamageBonus: number;

  // 本局战斗统计（累计）
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
    battleStats: {
      totalDamage: 0,
      totalArmor: 0,
      effectiveArmor: 0,
    },

    initBattle: (enemy: Enemy) => {
      const runState = useRunStore.getState();

      // 检查是否拥有禁忌卡牌
      const forbiddenCardInstance = runState.masterDeck.some((c) => c.templateId === 'forbidden_001')
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

        // 首回合意图若包含空间禁锢，锁定对应槽位
        for (const lockedIdx of enemy.intent.lockedSlots) {
          if (lockedIdx >= 0 && lockedIdx < runState.pipelineSlots) {
            state.slotStatuses[lockedIdx].isLocked = true;
          }
        }
      });
      get().drawCards();

      // 禁忌卡在抽牌后加入手牌（保证手牌数不超过 handDrawCount）
      if (forbiddenCardInstance) {
        set((state) => {
          state.hand.push(forbiddenCardInstance);
        });
      }
    },

    drawCards: () => {
      set((state) => {
        let needed = state.handDrawCount;
        while (needed > 0) {
          if (state.drawPile.length === 0) {
            if (state.discardPile.length === 0) break;
            state.drawPile = shuffle(state.discardPile.map((c) => ({ ...c, uuid: uuidv4() })));
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

      const relics = useRunStore.getState().relics;

      let simCtx = executePipelineV2(
        state.pipeline,
        { ...INITIAL_CONTEXT, desperateHpLoss: 0, globalDamageBonus: state.globalDamageBonus },
        state.slotStatuses,
      );

      simCtx = applyRelicEffectsToContext(simCtx, state.pipeline, relics);

      const result = resolveSlotCombat(simCtx, state.enemy.intent, state.pipeline, vulnStacks, relics);
      const links = computeSlotLinks(state.pipeline, state.slotStatuses);

      set((s) => {
        s.slotPreviews = result.slotResults;
        s.slotLinks = links;
      });
    },

    executePipelineAction: async () => {
      const { pipeline, slotStatuses, enemy, playerStatusEffects } = get();
      const cardsInPipeline = pipeline.filter((c): c is CardInstance => c !== null);
      if (cardsInPipeline.length === 0) return;

      const vulnStacks = playerStatusEffects
        .filter((e) => e.type === StatusEffectType.VULNERABLE)
        .reduce((sum, e) => sum + e.stacks, 0);

      // === 阶段零：背水一战预计算 ===
      const hasDesperate = pipeline.some((c) => c?.effectId === 'DESPERATE_STRIKE');
      let estimatedHpLoss = 0;
      if (hasDesperate) {
        estimatedHpLoss = simulateForDesperateStrike(
          pipeline, slotStatuses, enemy.intent, vulnStacks,
        );
      }

      // 动画控制：每次执行开始时清除跳过标记
      set((state) => {
        state.phase = 'EXECUTE_PHASE1';
        state.executionLog = [];
        state.lastExecutionResult = null;
        state.slotPreviews = [];
        state.slotLinks = [];
        state.skipRequested = false;
      });

      // 可跳过的等待：点击"跳过"后剩余延时归零
      const wait = (ms: number) =>
        new Promise<void>((r) => {
          const { skipRequested, animationFast } = get();
          const delay = skipRequested ? 0 : Math.round(ms * (animationFast ? TIMING.FAST_MODE_MULTIPLIER : 1));
          setTimeout(r, delay);
        });

      let ctx: ExecutionContext = {
        ...INITIAL_CONTEXT,
        slotArmors: new Array(pipeline.length).fill(0),
        slotDamageContributions: new Array(pipeline.length).fill(0),
        desperateHpLoss: estimatedHpLoss,
        globalDamageBonus: get().globalDamageBonus,
      };

      // === 阶段一：管道序列计算 ===
      ctx = executePipelineV2(pipeline, ctx, slotStatuses);

      const runState = useRunStore.getState();
      ctx = applyRelicEffectsToContext(ctx, pipeline, runState.relics);

      // 逐槽位动画展示
      for (let i = 0; i < pipeline.length; i++) {
        const card = pipeline[i];
        if (!card) continue;
        if (slotStatuses[i]?.isLocked) continue;

        set((state) => {
          state.executingIndex = i;
        });

        await wait(TIMING.CARD_EXECUTE);

        const slotDmg = ctx.slotDamageContributions[i] ?? 0;
        const slotArmor = ctx.slotArmors[i] ?? 0;

        set((state) => {
          if (slotDmg > 0) {
            state.executionLog.push(`${card.name} -> 伤害 +${slotDmg}`);
          } else if (slotArmor > 0) {
            state.executionLog.push(`${card.name} -> 护甲 +${slotArmor}`);
          } else if (card.effectId === 'MULTIPLY_NEXT' || card.effectId === 'RESONANCE_AMP_V2') {
            state.executionLog.push(`${card.name} -> 下一张 x${card.baseValue}`);
          } else if (card.effectId === 'REPEAT_NEXT') {
            state.executionLog.push(`${card.name} -> 下一张触发 ${card.baseValue} 次`);
          } else if (card.effectId === 'REPEAT_NEXT_ATTACK') {
            state.executionLog.push(`${card.name} -> 下一张攻击牌触发 ${card.baseValue} 次`);
          } else if (card.effectId === 'REPEAT_NEXT_SHIELD') {
            state.executionLog.push(`${card.name} -> 下一张护盾牌触发 ${card.baseValue} 次`);
          } else if (card.effectId === 'DESPERATE_STRIKE') {
            state.executionLog.push(`${card.name} -> 预估换血 ${estimatedHpLoss}`);
          } else if (card.effectId === 'CHAIN_DEFENSE') {
            state.executionLog.push(`${card.name} -> 护甲覆盖全槽位`);
          } else if (card.effectId === 'PHASE_SHIFT') {
            state.executionLog.push(`${card.name} -> 伤害转移至左侧`);
          } else {
            state.executionLog.push(`${card.name} -> 已激活`);
          }
        });
      }

      set((state) => {
        state.lastExecutionResult = ctx;
        state.executingIndex = -1;
      });

      // === 阶段二：怪物攻击与槽位判定 ===
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
              `槽位 ${result.slotIndex + 1}: 受击 ${result.incomingDamage} -> 完全格挡！`,
            );
          } else if (result.blockedDamage > 0) {
            state.executionLog.push(
              `槽位 ${result.slotIndex + 1}: 受击 ${result.incomingDamage} -> 格挡 ${result.blockedDamage} -> 掉血 ${result.hpLoss}`,
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

      set((state) => {
        state.executingIndex = -1;
      });

      // === 阶段三：伤害结算与清理 ===
      await wait(TIMING.PHASE_FINALIZE);

      set((state) => {
        state.phase = 'EXECUTE_PHASE3';
        state.showExecutionSummary = true;
        state.pipelineSnapshot = [...state.pipeline];

        // 扣减玩家HP（背水一战：最多扣到1）
        let actualHpLoss = combatResult.totalPlayerHpLoss;
        if (combatResult.hasDesperateStrike && combatResult.totalPlayerHpLoss > 0) {
          const targetHp = Math.max(1, state.playerHp - combatResult.totalPlayerHpLoss);
          actualHpLoss = state.playerHp - targetHp;
          state.playerHp = targetHp;
          if (actualHpLoss < combatResult.totalPlayerHpLoss) {
            state.executionLog.push('背水一战 -> 生命值锁定在1点');
          }
        } else {
          state.playerHp = Math.max(0, state.playerHp - combatResult.totalPlayerHpLoss);
        }

        // 处理破绽 debuff
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

        // 共鸣增幅：完美格挡触发全局增益（本场战斗）
        if (combatResult.resonanceTrigger) {
          state.globalDamageBonus += 1;
          state.executionLog.push('共鸣增幅 -> 所有动作牌基础值+1');
        }

        // 总伤害 = 管道累计伤害 + 镜面反射反弹（globalDamageBonus 已在每张攻击卡上分别加过，不重复加）
        const totalDmg = ctx.accumulatedDamage + combatResult.reflectDamageBonus;

        let dmg = totalDmg;
        if (state.enemy.armor > 0) {
          const absorbedByArmor = Math.min(state.enemy.armor, dmg);
          state.enemy.armor -= absorbedByArmor;
          dmg -= absorbedByArmor;
        }
        state.enemy.currentHp = Math.max(0, state.enemy.currentHp - dmg);

        if (combatResult.reflectDamageBonus > 0) {
          state.executionLog.push(`镜面反射反弹 -> 附加伤害 +${combatResult.reflectDamageBonus}`);
        }

        state.executionLog.push(`总伤害: ${totalDmg} -> 敌人剩余 HP: ${state.enemy.currentHp}`);

        const effectiveArmor = combatResult.slotResults.reduce((sum, r) => sum + r.blockedDamage, 0);

        state.battleStats.totalDamage += totalDmg;
        state.battleStats.totalArmor += ctx.accumulatedArmor;
        state.battleStats.effectiveArmor += effectiveArmor;

        state.turnSummary = {
          totalDamage: totalDmg,
          totalArmor: ctx.accumulatedArmor,
          effectiveArmor,
          hpLoss: actualHpLoss,
          reflectDamageBonus: combatResult.reflectDamageBonus,
        };

        // pipeline 放入弃牌堆（技能卡放入消耗堆）
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

        // 燃烧标记（下回合生效）
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

        if (state.enemy.currentHp <= 0) {
          state.phase = 'VICTORY';
        } else if (state.playerHp <= 0) {
          state.phase = 'DEFEAT';
        } else {
          const newIntent = generateEnemyIntent(
            state.enemy,
            state.pipelineSlots,
          );
          state.enemy.intent = newIntent;

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

      // 勇士技能：在手牌中添加一张"强化"卡
      if (playerProfile.class === 'WARRIOR') {
        const skillCardTemplate = ALL_CARD_POOL.find((t) => t.templateId === 'skill_001');
        if (!skillCardTemplate) return false;

        set((state) => {
          state.hand.push(toInstance(skillCardTemplate));
          state.skillUsedThisBattle = true;
        });

        spendSkillMp();
        return true;
      }

      // 牧师技能：回复自身生命值
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
