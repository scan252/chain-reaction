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
import { INITIAL_CONTEXT, StatusEffectType, AttackPattern, CardType } from '../types';
import {
  executePipelineV2,
  resolveSlotCombat,
  simulateForDesperateStrike,
  applyRelicEffectsToContext,
} from '../engine/effectRegistry';
import { generateEnemyIntent } from '../data/mapData';
import { useRunStore } from './runStore';
import { ALL_CARD_POOL } from '../data/cardData';

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

    // 处理修饰卡到目标卡的链接
    if (card.type === CardType.MODIFIER) {
      // 共鸣增幅：链接到左右邻居
      if (card.effectId === 'RESONANCE_AMP') {
        if (i > 0 && pipeline[i - 1]) {
          links.push({ from: i, to: i - 1, type: 'RESONANCE' });
        }
        if (i < slots - 1 && pipeline[i + 1]) {
          links.push({ from: i, to: i + 1, type: 'RESONANCE' });
        }
      }
      // 连锁防线：链接到前面所有有卡的槽位
      else if (card.effectId === 'CHAIN_DEFENSE') {
        for (let j = i - 1; j >= 0; j--) {
          if (pipeline[j]) {
            links.push({ from: i, to: j, type: 'CHAIN_DEFENSE' });
            break; // 只链接到最近的一个
          }
        }
      }
      // 其他修饰卡：链接到下一张非空卡
      else {
        for (let j = i + 1; j < slots; j++) {
          if (pipeline[j]) {
            links.push({ from: i, to: j, type: 'MODIFIER' });
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
        if (nextCard.effectId === 'DEAL_DAMAGE' || nextCard.effectId === 'PHASE_SHIFT') {
          // 检查中间是否有其他非空卡阻断
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
        // 如果遇到其他非空卡，停止搜索
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
  maxHp: 40,
  currentHp: 40,
  armor: 0,
  intent: DEFAULT_INTENT,
  attackPatterns: [{ pattern: AttackPattern.SINGLE, weight: 100 }],
  baseDamage: 6,
  damageVariance: 4,
};

interface GameState {
  phase: GamePhase;

  // 牌组
  drawPile: CardInstance[];
  hand: CardInstance[];
  pipeline: (CardInstance | null)[];
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
  slotLinks: SlotLink[]; // 槽位链接（用于显示连锁特效）

  // 结算动画
  executingIndex: number;
  executionLog: string[];
  lastExecutionResult: ExecutionContext | null;
  showExecutionSummary: boolean; // 是否显示结算总结（点击后消失）
  turnSummary: TurnSummary | null; // 本回合总结

  // 回合计数
  turnNumber: number;

  // 技能使用限制（每场战斗只能使用一次）
  skillUsedThisBattle: boolean;

  // 全局buff（共鸣增幅V2触发）
  globalDamageBonus: number; // 所有动作牌基础伤害加成

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
  useClassSkill: () => boolean; // 使用职业技能，返回是否成功
  dismissExecutionSummary: () => void; // 点击关闭结算总结
}

export const useGameStore = create<GameState>()(
  immer((set, get) => ({
    phase: 'DRAW' as GamePhase,
    drawPile: [],
    hand: [],
    pipeline: [],
    discardPile: [],
    exhaustPile: [],
    enemy: { ...DEFAULT_ENEMY },
    playerHp: 120,
    playerMaxHp: 120,
    playerArmor: 0,
    pipelineSlots: 5,
    handDrawCount: 8,
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
    globalDamageBonus: 0,
    battleStats: {
      totalDamage: 0,
      totalArmor: 0,
      effectiveArmor: 0,
    },

    initBattle: (enemy: Enemy) => {
      const runState = useRunStore.getState();
      
      // 检查是否拥有禁忌卡牌
      const forbiddenCardIndex = runState.masterDeck.findIndex(
        (card) => card.templateId === 'forbidden_001'
      );
      const hasForbiddenCard = forbiddenCardIndex !== -1;
      
      // 创建牌组副本
      let deckCards = runState.masterDeck.map(toInstance);
      let forbiddenCardInstance: CardInstance | null = null;
      
      // 如果拥有禁忌卡牌，将其从牌组中移除（稍后单独加入手牌）
      if (hasForbiddenCard) {
        forbiddenCardInstance = deckCards.find(
          (card) => card.templateId === 'forbidden_001'
        ) || null;
        deckCards = deckCards.filter((card) => card.templateId !== 'forbidden_001');
      }
      
      const deck = shuffle(deckCards);

      set((state) => {
        state.drawPile = deck;
        state.hand = [];
        state.pipeline = Array(runState.pipelineSlots).fill(null);
        state.discardPile = [];
        state.exhaustPile = []; // 每次进入战斗重置消耗牌堆为0
        state.skillUsedThisBattle = false; // 重置技能使用状态
        state.globalDamageBonus = 0; // 每场战斗清空全局伤害加成
        state.battleStats = { totalDamage: 0, totalArmor: 0, effectiveArmor: 0 }; // 重置本局统计
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
        state.slotLinks = []; // 初始化槽位链接

        // 初始化槽位状态
        state.slotStatuses = makeEmptySlotStatuses(runState.pipelineSlots);

        // 如果首回合意图包含空间禁锢，锁定对应槽位
        for (const lockedIdx of enemy.intent.lockedSlots) {
          if (lockedIdx >= 0 && lockedIdx < runState.pipelineSlots) {
            state.slotStatuses[lockedIdx].isLocked = true;
          }
        }
        
        // 如果拥有禁忌卡牌，在第一回合将其加入手牌
        if (forbiddenCardInstance) {
          state.hand.push(forbiddenCardInstance);
        }
      });
      get().drawCards();
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

        // 检查空间禁锢
        if (state.slotStatuses[slotIndex]?.isLocked) return;

        const cardIdx = state.hand.findIndex((c) => c.uuid === cardUuid);
        if (cardIdx === -1) return;

        const card = state.hand[cardIdx];
        state.hand.splice(cardIdx, 1);
        state.pipeline[slotIndex] = card;
        state.slotPreviews = []; // 清除旧预览
      });

      // 检查是否所有非锁定槽位已满，触发预览
      get().computeSlotPreviews();
    },

    removeFromPipeline: (slotIndex: number) => {
      set((state) => {
        if (state.phase !== 'PLAY') return;
        const card = state.pipeline[slotIndex];
        if (!card) return;
        state.pipeline[slotIndex] = null;
        state.hand.push(card);
        state.slotPreviews = []; // 清除预览
        state.slotLinks = []; // 清除槽位链接
      });
    },

    reorderPipeline: (fromIndex: number, toIndex: number) => {
      set((state) => {
        if (state.phase !== 'PLAY') return;
        const cardA = state.pipeline[fromIndex];
        const cardB = state.pipeline[toIndex];
        if (!cardA) return;

        // 检查锁定槽位
        if (state.slotStatuses[toIndex]?.isLocked) return;
        if (cardB === null && state.slotStatuses[fromIndex]?.isLocked) return;

        state.pipeline[fromIndex] = cardB;
        state.pipeline[toIndex] = cardA;
        state.slotPreviews = []; // 清除预览
        state.slotLinks = []; // 清除槽位链接
      });
    },

    computeSlotPreviews: () => {
      const state = get();
      // 检查是否所有非锁定槽位已满
      const allFilled = state.pipeline.every((card, i) => {
        if (state.slotStatuses[i]?.isLocked) return true;
        return card !== null;
      });
      if (!allFilled) {
        set((s) => { s.slotPreviews = []; });
        return;
      }

      // 获取玩家破绽层数
      const vulnStacks = state.playerStatusEffects
        .filter((e) => e.type === StatusEffectType.VULNERABLE)
        .reduce((sum, e) => sum + e.stacks, 0);

      const runState = useRunStore.getState();
      const relics = runState.relics;

      // 模拟阶段一
      let simCtx = executePipelineV2(
        state.pipeline,
        { ...INITIAL_CONTEXT, desperateHpLoss: 0, globalDamageBonus: state.globalDamageBonus },
        state.slotStatuses,
      );

      // 应用遗物效果
      simCtx = applyRelicEffectsToContext(simCtx, state.pipeline, relics);

      // 模拟阶段二（传入遗物）
      const result = resolveSlotCombat(simCtx, state.enemy.intent, state.pipeline, vulnStacks, relics);

      // 计算槽位链接
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

      // 获取玩家破绽层数
      const vulnStacks = playerStatusEffects
        .filter((e) => e.type === StatusEffectType.VULNERABLE)
        .reduce((sum, e) => sum + e.stacks, 0);

      // === 阶段零：背水一战预计算 ===
      const hasDesperateStrike = pipeline.some((c) => c?.effectId === 'DESPERATE_STRIKE');
      let estimatedHpLoss = 0;
      if (hasDesperateStrike) {
        estimatedHpLoss = simulateForDesperateStrike(
          pipeline, slotStatuses, enemy.intent, vulnStacks,
        );
      }

      // === 阶段一：管道序列计算 ===
      set((state) => {
        state.phase = 'EXECUTE_PHASE1';
        state.executionLog = [];
        state.lastExecutionResult = null;
        state.slotPreviews = [];
        state.slotLinks = []; // 清除槽位链接
      });

      let ctx: ExecutionContext = {
        ...INITIAL_CONTEXT,
        slotArmors: new Array(pipeline.length).fill(0),
        slotDamageContributions: new Array(pipeline.length).fill(0),
        desperateHpLoss: estimatedHpLoss,
        globalDamageBonus: get().globalDamageBonus,
      };

      // 逐槽位执行动画
      ctx = executePipelineV2(pipeline, ctx, slotStatuses);

      // 应用遗物效果
      const runState = useRunStore.getState();
      ctx = applyRelicEffectsToContext(ctx, pipeline, runState.relics);

      // 逐槽位动画展示
      for (let i = 0; i < pipeline.length; i++) {
        const card = pipeline[i];
        if (!card) continue;
        if (slotStatuses[i]?.isLocked) continue;
        if (card.effectId === 'RESONANCE_AMP') continue;

        set((state) => {
          state.executingIndex = i;
        });

        await new Promise((r) => setTimeout(r, 500));

        // 生成日志
        const slotDmg = ctx.slotDamageContributions[i] ?? 0;
        const slotArmor = ctx.slotArmors[i] ?? 0;

        set((state) => {
          if (slotDmg > 0) {
            state.executionLog.push(`${card.name} -> 伤害 +${slotDmg}`);
          } else if (slotArmor > 0) {
            state.executionLog.push(`${card.name} -> 护甲 +${slotArmor}`);
          } else if (card.effectId === 'MULTIPLY_NEXT') {
            state.executionLog.push(`${card.name} -> 下一张 x${card.baseValue}`);
          } else if (card.effectId === 'REPEAT_NEXT') {
            state.executionLog.push(`${card.name} -> 下一张触发 ${card.baseValue} 次`);
          } else if (card.effectId === 'DESPERATE_STRIKE') {
            state.executionLog.push(`${card.name} -> 预估换血 ${estimatedHpLoss}`);
          } else if (card.effectId === 'CHAIN_DEFENSE') {
            state.executionLog.push(`${card.name} -> 护甲覆盖全槽位`);
          } else if (card.effectId === 'PHASE_SHIFT') {
            state.executionLog.push(`${card.name} -> 伤害转移至右侧`);
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
      await new Promise((r) => setTimeout(r, 600));

      set((state) => {
        state.phase = 'EXECUTE_PHASE2';
      });

      const combatResult = resolveSlotCombat(ctx, enemy.intent, pipeline, vulnStacks, runState.relics);

      // 逐槽位攻击动画
      for (const result of combatResult.slotResults) {
        set((state) => {
          state.executingIndex = result.slotIndex;
        });

        await new Promise((r) => setTimeout(r, 400));

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
      await new Promise((r) => setTimeout(r, 400));

      set((state) => {
        state.phase = 'EXECUTE_PHASE3';
        state.showExecutionSummary = true; // 显示结算总结，等待玩家点击

        // 扣减玩家HP（背水一战：最多扣到1）
        if (combatResult.hasDesperateStrike && combatResult.totalPlayerHpLoss > 0) {
          // 有背水一战时，确保至少保留1点HP
          const newHp = state.playerHp - combatResult.totalPlayerHpLoss;
          state.playerHp = Math.max(1, newHp);
          if (newHp < 1) {
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
            existing.duration = Math.max(existing.duration, 2);
          } else {
            state.playerStatusEffects.push({
              type: StatusEffectType.VULNERABLE,
              stacks: combatResult.newVulnerableStacks,
              duration: 2, // 持续到下回合结束
            });
          }
        }

        // 镜面反射新效果：完全格挡时护盾值加成下张攻击牌（本场战斗）
        if (combatResult.mirrorReflectBonus > 0) {
          state.globalDamageBonus += combatResult.mirrorReflectBonus;
          state.executionLog.push(`镜面反射 -> 下回合攻击牌+${combatResult.mirrorReflectBonus}`);
        }

        // 共鸣增幅V2效果：触发全局buff
        if (combatResult.resonanceTrigger) {
          state.globalDamageBonus += 1;
          state.executionLog.push('共鸣增幅 -> 所有动作牌基础值+1');
        }

        // 应用全局伤害加成到本次伤害
        const totalDmg = ctx.accumulatedDamage + combatResult.reflectDamageBonus + state.globalDamageBonus;

        // 扣敌人血量
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

        // 计算有效护盾（实际抵挡的伤害）
        const effectiveArmor = combatResult.slotResults.reduce((sum, r) => sum + r.blockedDamage, 0);

        // 累计本局战斗统计
        state.battleStats.totalDamage += totalDmg;
        state.battleStats.totalArmor += ctx.accumulatedArmor;
        state.battleStats.effectiveArmor += effectiveArmor;

        // 保存回合总结
        state.turnSummary = {
          totalDamage: totalDmg,
          totalArmor: ctx.accumulatedArmor,
          effectiveArmor,
          hpLoss: combatResult.totalPlayerHpLoss,
          reflectDamageBonus: combatResult.reflectDamageBonus,
        };

        // pipeline 放入弃牌堆（技能卡放入消耗堆）
        for (let i = 0; i < state.pipeline.length; i++) {
          const c = state.pipeline[i];
          if (c) {
            if (c.templateId === 'skill_001') {
              state.exhaustPile.push(c); // 技能卡进入消耗堆
            } else {
              state.discardPile.push(c);
            }
          }
          state.pipeline[i] = null;
        }

        // 手牌弃掉
        state.discardPile.push(...state.hand);
        state.hand = [];

        // 处理燃烧标记（下回合生效）
        for (const burnSlot of combatResult.slotsToMarkBurning) {
          if (burnSlot >= 0 && burnSlot < state.slotStatuses.length) {
            const alreadyBurning = state.slotStatuses[burnSlot].statusEffects.some(
              (e) => e.type === StatusEffectType.BURNING,
            );
            if (!alreadyBurning) {
              state.slotStatuses[burnSlot].statusEffects.push({
                type: StatusEffectType.BURNING,
                stacks: 1,
                duration: 2, // 持续到下回合结束
              });
            }
          }
        }

        // 判定胜利/失败
        if (state.enemy.currentHp <= 0) {
          state.phase = 'VICTORY';
        } else if (state.playerHp <= 0) {
          state.phase = 'DEFEAT';
        } else {
          // 生成下回合怪物意图
          const newIntent = generateEnemyIntent(
            state.enemy,
            state.pipelineSlots,
            state.slotStatuses,
          );
          state.enemy.intent = newIntent;

          // 重置槽位锁定状态
          for (const ss of state.slotStatuses) {
            ss.isLocked = false;
          }

          // 应用新的空间禁锢
          for (const lockedIdx of newIntent.lockedSlots) {
            if (lockedIdx >= 0 && lockedIdx < state.slotStatuses.length) {
              state.slotStatuses[lockedIdx].isLocked = true;
            }
          }
        }
      });

      // 不再自动进入下一回合，等待玩家点击结算结果
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
        state.slotLinks = []; // 清除槽位链接

        // 递减玩家 statusEffects
        state.playerStatusEffects = state.playerStatusEffects
          .map((e) => ({ ...e, duration: e.duration - 1 }))
          .filter((e) => e.duration > 0);

        // 递减槽位 statusEffects
        for (const ss of state.slotStatuses) {
          ss.statusEffects = ss.statusEffects
            .map((e) => ({ ...e, duration: e.duration - 1 }))
            .filter((e) => e.duration > 0);
        }
      });
      get().drawCards();
    },

    useClassSkill: () => {
      const runState = useRunStore.getState();
      const { playerProfile, playerMp, useSkill } = runState;
      const { skillUsedThisBattle, playerHp, playerMaxHp } = get();

      // 检查是否已使用过技能（每场战斗只能使用一次）
      if (skillUsedThisBattle) return false;
      if (!playerProfile || playerMp <= 0) return false;

      // 勇士技能：在手牌中添加一张"强化"卡
      if (playerProfile.class === 'WARRIOR') {
        const skillCardTemplate = ALL_CARD_POOL.find((t) => t.templateId === 'skill_001');
        if (!skillCardTemplate) return false;

        set((state) => {
          // 添加技能卡到手牌
          state.hand.push(toInstance(skillCardTemplate));
          // 标记本场战斗已使用技能
          state.skillUsedThisBattle = true;
        });

        // 消耗MP
        useSkill();
        return true;
      }

      // 牧师技能：回复自身20点生命值
      if (playerProfile.class === 'PRIEST') {
        // 检查是否满血
        if (playerHp >= playerMaxHp) return false;

        set((state) => {
          // 回复20点生命值（不超过最大值）
          state.playerHp = Math.min(state.playerMaxHp, state.playerHp + 20);
          // 标记本场战斗已使用技能
          state.skillUsedThisBattle = true;
        });

        // 消耗MP
        useSkill();
        return true;
      }

      return false;
    },

    dismissExecutionSummary: () => {
      set((state) => {
        state.showExecutionSummary = false;
      });
    },
  })),
);
