import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  CardTemplate,
  GameMap,
  MapNode,
  RewardChoice,
  SceneType,
  ShopItem,
  PlayerProfile,
  PlayerClass,
  RelicId,
  EventReward,
  Difficulty,
} from '../types';
import {
  MapNodeType,
  CLASS_MAX_MP,
  RELICS,
  EventRewardType,

} from '../types';
import { buildStarterDeck, generateRewardCards, generateShopItems, upgradeCard } from '../data/cardData';
import { generateGameMap } from '../data/mapData';
import { PLAYER, REWARD, SHOP, REST, EVENT, DECK, PIPELINE } from '../config/balance';

// 事件奖励节点的固定三选一选项
function buildEventRewards(): EventReward[] {
  return [
    {
      type: EventRewardType.GOLD_100,
      name: '100金币',
      description: '获得100金币',
      icon: '💰',
    },
    {
      type: EventRewardType.HEAL_20_MP_1,
      name: '恢复20%血+1MP',
      description: '回复20%生命值和1点MP',
      icon: '💊',
    },
    {
      type: EventRewardType.RANDOM_RELIC,
      name: '随机遗物',
      description: '获得一个随机遗物',
      icon: '🏆',
    },
  ];
}

interface RunState {
  // 场景
  scene: SceneType;
  runActive: boolean;
  /** 本局显式结局（替代场景推断） */
  runResult: 'VICTORY' | 'DEFEAT' | null;

  // 难度
  difficulty: Difficulty;

  // 玩家信息
  playerProfile: PlayerProfile | null;

  // 玩家持久状态
  gold: number;
  playerMaxHp: number;
  playerHp: number;
  playerMp: number;
  playerMaxMp: number;
  masterDeck: CardTemplate[];
  pipelineSlots: number;
  handDrawCount: number;

  // 地图
  map: GameMap;
  currentLayer: number;

  // 奖励
  pendingReward: RewardChoice | null;
  rewardCardCollected: boolean;

  // 商店
  shopItems: ShopItem[];
  /** 本局已删卡次数（价格递增） */
  removeCardCount: number;

  // 休息选择
  showRestChoice: boolean;

  // 遗物
  relics: RelicId[];

  // 事件奖励
  pendingEventRewards: EventReward[] | null;
  eventRewardCollected: boolean;

  // 游戏统计（用于结束页面）
  gameStats: {
    totalDamage: number;
    totalArmor: number;
    effectiveArmor: number;
    defeatedEnemies: string[];
  };

  // Actions
  setPlayerProfile: (name: string, playerClass: PlayerClass) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  startNewRun: (profile?: PlayerProfile) => void;
  selectMapNode: (nodeId: string) => void;
  onBattleVictory: (remainingHp: number, battleStats?: { totalDamage: number; totalArmor: number; effectiveArmor: number; enemyName: string; isElite?: boolean; grantRelic?: boolean }) => void;
  onBattleDefeat: () => void;
  collectRewardCard: (templateId: string) => void;
  collectBonusSlot: () => void;
  skipReward: () => void;
  proceedToMap: () => void;
  buyCard: (itemId: string) => void;
  /** 当前删卡价格（递增） */
  currentRemoveCost: () => number;
  removeCard: (deckIndex: number) => void;
  /** 锻造：升级卡组中指定索引的卡 */
  upgradeCardAt: (deckIndex: number) => void;
  finishRest: () => void;
  restHealHp: () => void;
  restRestoreMp: () => void;
  spendSkillMp: () => void;
  leaveShop: () => void;
  // 事件奖励
  collectEventReward: (rewardType: EventRewardType) => void;
  skipEventReward: () => void;
  // 遗物
  addRelic: (relicId: RelicId) => void;
  // NPC帮助页面
  goToNpcHelp: () => void;
  // 添加卡牌到主牌库
  addCardToMasterDeck: (card: CardTemplate) => void;
  // 返回主页面
  returnToTitle: () => void;
}

export const useRunStore = create<RunState>()(
  immer((set, get) => ({
    scene: 'TITLE',
    runActive: false,
    runResult: null,
    difficulty: 'NORMAL' as Difficulty,
    playerProfile: null,
    gold: PLAYER.INITIAL_GOLD,
    playerMaxHp: PLAYER.MAX_HP,
    playerHp: PLAYER.MAX_HP,
    playerMp: 0,
    playerMaxMp: 0,
    masterDeck: [],
    pipelineSlots: PIPELINE.INITIAL_SLOTS,
    handDrawCount: PIPELINE.HAND_DRAW_COUNT,
    map: { layers: [], currentNodeId: null },
    currentLayer: -1,
    pendingReward: null,
    rewardCardCollected: false,
    shopItems: [],
    removeCardCount: 0,
    showRestChoice: false,
    relics: [],
    pendingEventRewards: null,
    eventRewardCollected: false,
    gameStats: {
      totalDamage: 0,
      totalArmor: 0,
      effectiveArmor: 0,
      defeatedEnemies: [],
    },

    setPlayerProfile: (name: string, playerClass: PlayerClass) => {
      set((state) => {
        state.playerProfile = {
          id: Date.now().toString(),
          name,
          class: playerClass,
        };
      });
    },

    setDifficulty: (difficulty: Difficulty) => {
      set((state) => {
        state.difficulty = difficulty;
      });
    },

    startNewRun: (profile?: PlayerProfile) => {
      const { playerProfile, scene, masterDeck } = get();
      const effectiveProfile = profile || playerProfile;
      
      if (!effectiveProfile) return;
      
      const map = generateGameMap();
      const maxMp = CLASS_MAX_MP[effectiveProfile.class];
      
      set((state) => {
        // 如果没有playerProfile，先设置
        if (!state.playerProfile) {
          state.playerProfile = effectiveProfile;
        }
        state.runActive = true;
        state.runResult = null;
        // 如果从NPC_HELP场景开始且已有卡组（奖励卡牌已添加），则在初始卡组基础上添加
        if (scene === 'NPC_HELP' && masterDeck.length > 0) {
          // 已有奖励卡牌，追加初始卡组
          const starterDeck = buildStarterDeck();
          state.masterDeck = [...state.masterDeck, ...starterDeck];
        } else {
          // 正常开始，初始化卡组
          state.masterDeck = buildStarterDeck();
        }
        state.scene = 'MAP';
        state.gold = PLAYER.INITIAL_GOLD;
        state.playerMaxHp = PLAYER.MAX_HP;
        state.playerHp = PLAYER.MAX_HP;
        state.playerMaxMp = maxMp;
        state.playerMp = maxMp;
        state.pipelineSlots = PIPELINE.INITIAL_SLOTS;
        state.handDrawCount = PIPELINE.HAND_DRAW_COUNT;
        state.map = map;
        state.currentLayer = -1;
        state.pendingReward = null;
        state.rewardCardCollected = false;
        state.shopItems = [];
        state.removeCardCount = 0;
        state.showRestChoice = false;
        // 跨局状态彻底重置
        state.relics = [];
        state.pendingEventRewards = null;
        state.eventRewardCollected = false;
        state.gameStats = {
          totalDamage: 0,
          totalArmor: 0,
          effectiveArmor: 0,
          defeatedEnemies: [],
        };
      });
    },

    selectMapNode: (nodeId: string) => {
      const { map } = get();
      let targetNode: MapNode | null = null;

      for (const layer of map.layers) {
        for (const node of layer) {
          if (node.id === nodeId) {
            targetNode = node;
            break;
          }
        }
      }

      if (!targetNode || !targetNode.available) return;

      // 检查当前层是否已经有节点被访问过
      const targetLayer = targetNode.layer;
      const hasVisitedNodeInLayer = map.layers[targetLayer].some((n) => n.visited);
      if (hasVisitedNodeInLayer) return;

      set((state) => {
        // 标记节点已访问
        for (const layer of state.map.layers) {
          for (const node of layer) {
            if (node.id === nodeId) {
              node.visited = true;
              node.available = false;
            }
          }
        }

        state.map.currentNodeId = nodeId;
        state.currentLayer = targetNode!.layer;

        // 更新下一层节点的可用性
        const nextLayerIdx = targetNode!.layer + 1;
        if (nextLayerIdx < state.map.layers.length) {
          // 先将所有下一层节点标记为不可用
          for (const node of state.map.layers[nextLayerIdx]) {
            node.available = false;
          }
          // 仅标记当前节点连接的下层节点为可用
          for (const connId of targetNode!.connections) {
            for (const node of state.map.layers[nextLayerIdx]) {
              if (node.id === connId) {
                node.available = true;
              }
            }
          }
        }

        // 根据节点类型切换场景
        switch (targetNode!.type) {
          case MapNodeType.BATTLE:
          case MapNodeType.ELITE:
          case MapNodeType.BOSS:
            state.scene = 'BATTLE';
            break;
          case MapNodeType.SHOP:
            state.shopItems = generateShopItems();
            state.scene = 'SHOP';
            break;
          case MapNodeType.REST:
            // 休息：显示选择界面
            state.showRestChoice = true;
            break;
          case MapNodeType.REWARD:
            // 奖励节点：生成三选一奖励
            state.pendingEventRewards = buildEventRewards();
            state.eventRewardCollected = false;
            state.scene = 'EVENT_REWARD';
            break;
        }
      });
    },

    onBattleVictory: (remainingHp: number, battleStats?: { totalDamage: number; totalArmor: number; effectiveArmor: number; enemyName: string; isElite?: boolean; grantRelic?: boolean }) => {
      // 防重复：仅当仍处于战斗场景时结算（快速双击/竞态保护）
      if (get().scene !== 'BATTLE') return;

      const { difficulty, pipelineSlots } = get();
      const isElite = battleStats?.isElite ?? false;
      const rareOdds = difficulty === 'ELITE'
        ? REWARD.ELITE_DIFF_RARITY_RARE
        : REWARD.RARITY_ODDS.RARE;

      // 生成两轮卡牌奖励（精英：每轮保底 1 稀有）
      const round1Cards = generateRewardCards(3, { guaranteeRare: isElite, rareOdds });
      const round2Cards = generateRewardCards(3, { guaranteeRare: isElite, rareOdds });

      let gold = REWARD.GOLD_MIN + Math.floor(Math.random() * REWARD.GOLD_VARIANCE);
      if (isElite) gold += REWARD.ELITE_GOLD_BONUS;

      const reward: RewardChoice = {
        cards: round1Cards,
        gold,
        bonusSlot: Math.random() < (isElite ? 0.35 : REWARD.BONUS_SLOT_CHANCE) && pipelineSlots < PIPELINE.MAX_SLOTS,
        currentRound: 1,
        totalRounds: 2,
        allCards: [round1Cards, round2Cards],
      };

      set((state) => {
        state.playerHp = remainingHp;
        state.pendingReward = reward;
        state.rewardCardCollected = false;
        state.scene = 'REWARD';

        // 精英：必掉未持有遗物
        if (isElite || battleStats?.grantRelic) {
          const allRelicIds = Object.keys(RELICS) as RelicId[];
          const available = allRelicIds.filter((id) => !state.relics.includes(id));
          if (available.length > 0) {
            state.relics.push(available[Math.floor(Math.random() * available.length)]);
          }
        }

        if (battleStats) {
          state.gameStats.totalDamage += battleStats.totalDamage;
          state.gameStats.totalArmor += battleStats.totalArmor;
          state.gameStats.effectiveArmor += battleStats.effectiveArmor;
          state.gameStats.defeatedEnemies.push(battleStats.enemyName);
        }
      });
    },

    onBattleDefeat: () => {
      set((state) => {
        state.runActive = false;
        state.runResult = 'DEFEAT';
        state.scene = 'GAME_END';
      });
    },

    collectRewardCard: (templateId: string) => {
      set((state) => {
        if (!state.pendingReward) return;
        
        const rewardCard = state.pendingReward.cards.find((rc) => rc.card.templateId === templateId);
        if (!rewardCard) return;
        
        // 将选中的卡牌加入牌组
        state.masterDeck.push({ ...rewardCard.card });
        
        // 检查是否还有下一轮
        if (state.pendingReward.currentRound < state.pendingReward.totalRounds) {
          // 进入下一轮
          state.pendingReward.currentRound += 1;
          state.pendingReward.cards = state.pendingReward.allCards[state.pendingReward.currentRound - 1];
          // 重置选择状态，允许再次选择
          state.rewardCardCollected = false;
        } else {
          // 所有轮次完成
          state.rewardCardCollected = true;
        }
      });
    },

    collectBonusSlot: () => {
      set((state) => {
        if (!state.pendingReward?.bonusSlot) return;
        if (state.pipelineSlots < PIPELINE.MAX_SLOTS) {
          state.pipelineSlots += 1;
        }
        // 无论是否达到上限都消耗掉本次奖励，避免按钮无限点击
        state.pendingReward.bonusSlot = false;
      });
    },

    skipReward: () => {
      set((state) => {
        if (!state.pendingReward) return;

        // 跳过补偿：对冲"必须拿卡"的负反馈
        state.gold += REWARD.SKIP_COMPENSATION_GOLD;

        // 检查是否还有下一轮
        if (state.pendingReward.currentRound < state.pendingReward.totalRounds) {
          state.pendingReward.currentRound += 1;
          state.pendingReward.cards = state.pendingReward.allCards[state.pendingReward.currentRound - 1];
          state.rewardCardCollected = false;
        } else {
          state.rewardCardCollected = true;
        }
      });
    },

    proceedToMap: () => {
      set((state) => {
        // 领取金币
        if (state.pendingReward) {
          state.gold += state.pendingReward.gold;
          state.pendingReward = null;
        }

        // 检查是否通关（Boss已访问）
        const bossLayer = state.map.layers[state.map.layers.length - 1];
        const bossDefeated = bossLayer?.some((n) => n.visited && n.type === MapNodeType.BOSS);

        if (bossDefeated) {
          state.scene = 'GAME_END';
          state.runActive = false;
          state.runResult = 'VICTORY';
        } else {
          state.scene = 'MAP';
        }
      });
    },

    buyCard: (itemId: string) => {
      set((state) => {
        const item = state.shopItems.find((i) => i.id === itemId);
        if (!item || !item.card || state.gold < item.cost) return;
        state.gold -= item.cost;
        state.masterDeck.push({ ...item.card });
        state.shopItems = state.shopItems.filter((i) => i.id !== itemId);
      });
    },

    /** 当前删卡价格（随次数递增，有上限） */
    currentRemoveCost: () => {
      const count = get().removeCardCount;
      return Math.min(
        SHOP.REMOVE_CARD_BASE_COST + count * SHOP.REMOVE_CARD_COST_STEP,
        SHOP.REMOVE_CARD_COST_MAX,
      );
    },

    removeCard: (deckIndex: number) => {
      set((state) => {
        const cost = Math.min(
          SHOP.REMOVE_CARD_BASE_COST + state.removeCardCount * SHOP.REMOVE_CARD_COST_STEP,
          SHOP.REMOVE_CARD_COST_MAX,
        );
        if (state.gold < cost) return;
        if (state.masterDeck.length <= DECK.MIN_SIZE) return;
        if (deckIndex < 0 || deckIndex >= state.masterDeck.length) return;
        state.gold -= cost;
        state.removeCardCount += 1;
        state.masterDeck.splice(deckIndex, 1);
      });
    },

    upgradeCardAt: (deckIndex: number) => {
      set((state) => {
        if (deckIndex < 0 || deckIndex >= state.masterDeck.length) return;
        const target = state.masterDeck[deckIndex];
        if (target.upgraded) return; // 每张卡只能锻造一次
        state.masterDeck[deckIndex] = upgradeCard(target);
      });
    },

    finishRest: () => {
      set((state) => {
        state.showRestChoice = false;
        state.scene = 'MAP';
      });
    },

    restHealHp: () => {
      set((state) => {
        state.playerHp = Math.min(state.playerMaxHp, state.playerHp + Math.floor(state.playerMaxHp * REST.HEAL_RATIO));
        state.showRestChoice = false;
        state.scene = 'MAP';
      });
    },

    restRestoreMp: () => {
      set((state) => {
        state.playerMp = Math.min(state.playerMaxMp, state.playerMp + REST.MEDITATE_MP);
        state.showRestChoice = false;
        state.scene = 'MAP';
      });
    },

    spendSkillMp: () => {
      set((state) => {
        if (state.playerMp > 0) {
          state.playerMp -= 1;
        }
      });
    },

    leaveShop: () => {
      set((state) => {
        state.scene = 'MAP';
      });
    },

    collectEventReward: (rewardType: EventRewardType) => {
      set((state) => {
        if (state.eventRewardCollected) return;

        switch (rewardType) {
          case EventRewardType.GOLD_100: {
            state.gold += EVENT.GOLD;
            break;
          }
          case EventRewardType.HEAL_20_MP_1: {
            state.playerHp = Math.min(state.playerMaxHp, state.playerHp + Math.floor(state.playerMaxHp * EVENT.HEAL_RATIO));
            state.playerMp = Math.min(state.playerMaxMp, state.playerMp + 1);
            break;
          }
          case EventRewardType.RANDOM_RELIC: {
            const allRelicIds = Object.keys(RELICS) as RelicId[];
            const availableRelics = allRelicIds.filter(id => !state.relics.includes(id));
            if (availableRelics.length > 0) {
              const randomRelic = availableRelics[Math.floor(Math.random() * availableRelics.length)];
              state.relics.push(randomRelic);
            }
            break;
          }
        }
        state.eventRewardCollected = true;
      });
    },

    skipEventReward: () => {
      set((state) => {
        state.eventRewardCollected = true;
      });
    },

    // 遗物
    addRelic: (relicId: RelicId) => {
      set((state) => {
        if (!state.relics.includes(relicId)) {
          state.relics.push(relicId);
        }
      });
    },

    // NPC帮助页面
    goToNpcHelp: () => {
      set((state) => {
        state.scene = 'NPC_HELP';
      });
    },
    
    // 添加卡牌到主牌库
    addCardToMasterDeck: (card: CardTemplate) => {
      set((state) => {
        state.masterDeck.push({ ...card });
      });
    },

    // 返回主页面
    returnToTitle: () => {
      set((state) => {
        state.scene = 'TITLE';
        state.runActive = false;
        state.runResult = null;
      });
    },
  }))
);

// 辅助：获取当前选中节点
export function getCurrentMapNode(): MapNode | null {
  const { map } = useRunStore.getState();
  if (!map.currentNodeId) return null;
  for (const layer of map.layers) {
    for (const node of layer) {
      if (node.id === map.currentNodeId) return node;
    }
  }
  return null;
}

// 开发/测试调试钩子：浏览器控制台可直接检查 store
declare global {
  interface Window {
    __runStore?: typeof useRunStore;
    __gameStore?: object;
  }
}
if (import.meta.env.DEV) {
  (window as Window).__runStore = useRunStore;
}
