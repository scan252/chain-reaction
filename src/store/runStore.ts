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
} from '../types';
import {
  DEFAULT_PIPELINE_SLOTS,
  DEFAULT_HAND_DRAW_COUNT,
  PLAYER_MAX_HP,
  MapNodeType,
  CLASS_MAX_MP,
  RELICS,
  EventRewardType,
} from '../types';
import { buildStarterDeck, generateRewardCards, generateShopItems } from '../data/cardData';
import { generateGameMap } from '../data/mapData';

interface RunState {
  // 场景
  scene: SceneType;
  runActive: boolean;

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
  startNewRun: (profile?: PlayerProfile) => void;
  selectMapNode: (nodeId: string) => void;
  onBattleVictory: (remainingHp: number, battleStats?: { totalDamage: number; totalArmor: number; effectiveArmor: number; enemyName: string }) => void;
  onBattleDefeat: () => void;
  collectRewardCard: (templateId: string) => void;
  collectBonusSlot: () => void;
  skipReward: () => void;
  proceedToMap: () => void;
  buyCard: (itemId: string) => void;
  removeCard: (templateId: string) => void;
  healPlayer: (amount: number) => void;
  restHealHp: () => void;
  restRestoreMp: () => void;
  useSkill: () => void;
  leaveShop: () => void;
  // 事件奖励
  generateEventRewards: () => void;
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
    playerProfile: null,
    gold: 100,
    playerMaxHp: PLAYER_MAX_HP,
    playerHp: PLAYER_MAX_HP,
    playerMp: 0,
    playerMaxMp: 0,
    masterDeck: [],
    pipelineSlots: DEFAULT_PIPELINE_SLOTS,
    handDrawCount: DEFAULT_HAND_DRAW_COUNT,
    map: { layers: [], currentNodeId: null },
    currentLayer: -1,
    pendingReward: null,
    rewardCardCollected: false,
    shopItems: [],
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
        state.gold = 100;
        state.playerMaxHp = PLAYER_MAX_HP;
        state.playerHp = PLAYER_MAX_HP;
        state.playerMaxMp = maxMp;
        state.playerMp = maxMp;
        state.pipelineSlots = DEFAULT_PIPELINE_SLOTS;
        state.handDrawCount = DEFAULT_HAND_DRAW_COUNT;
        state.map = map;
        state.currentLayer = -1;
        state.pendingReward = null;
        state.rewardCardCollected = false;
        state.shopItems = [];
        state.showRestChoice = false;
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
            const rewards: EventReward[] = [
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
            state.pendingEventRewards = rewards;
            state.eventRewardCollected = false;
            state.scene = 'EVENT_REWARD';
            break;
        }
      });
    },

    onBattleVictory: (remainingHp: number, battleStats?: { totalDamage: number; totalArmor: number; effectiveArmor: number; enemyName: string }) => {
      // 生成两轮卡牌奖励
      const round1Cards = generateRewardCards(3);
      const round2Cards = generateRewardCards(3);
      
      const reward: RewardChoice = {
        cards: round1Cards, // 第一轮显示的卡牌
        gold: 15 + Math.floor(Math.random() * 16),
        bonusSlot: Math.random() < 0.1 && get().pipelineSlots < 8,
        currentRound: 1,
        totalRounds: 2,
        allCards: [round1Cards, round2Cards], // 保存所有轮次的卡牌
      };

      set((state) => {
        state.playerHp = remainingHp;
        state.pendingReward = reward;
        state.rewardCardCollected = false;
        state.scene = 'REWARD';
        
        // 累加战斗统计
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
        if (state.pipelineSlots < 8) {
          state.pipelineSlots += 1;
          state.pendingReward.bonusSlot = false;
        }
      });
    },

    skipReward: () => {
      set((state) => {
        if (!state.pendingReward) return;
        
        // 检查是否还有下一轮
        if (state.pendingReward.currentRound < state.pendingReward.totalRounds) {
          // 进入下一轮
          state.pendingReward.currentRound += 1;
          state.pendingReward.cards = state.pendingReward.allCards[state.pendingReward.currentRound - 1];
          // 重置选择状态
          state.rewardCardCollected = false;
        } else {
          // 所有轮次完成
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

        // 检查是否通关（Boss已击败，第4层）
        const bossLayer = state.map.layers[state.map.layers.length - 1];
        const bossDefeated = bossLayer?.some((n) => n.visited && n.type === MapNodeType.BOSS);

        if (bossDefeated) {
          // 通关显示结算页面
          state.scene = 'GAME_END';
          state.runActive = false;
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

    removeCard: (templateId: string) => {
      set((state) => {
        if (state.gold < state.shopItems.find((i) => i.type === 'REMOVE_CARD')?.cost!) return;
        const idx = state.masterDeck.findIndex((c) => c.templateId === templateId);
        if (idx === -1) return;
        const removeItem = state.shopItems.find((i) => i.type === 'REMOVE_CARD');
        if (!removeItem) return;
        state.gold -= removeItem.cost;
        state.masterDeck.splice(idx, 1);
      });
    },

    healPlayer: (amount: number) => {
      set((state) => {
        state.playerHp = Math.min(state.playerMaxHp, state.playerHp + amount);
      });
    },

    restHealHp: () => {
      set((state) => {
        state.playerHp = Math.min(state.playerMaxHp, state.playerHp + Math.floor(state.playerMaxHp * 0.3));
        state.showRestChoice = false;
        state.scene = 'MAP';
      });
    },

    restRestoreMp: () => {
      set((state) => {
        state.playerMp = Math.min(state.playerMaxMp, state.playerMp + 2);
        state.showRestChoice = false;
        state.scene = 'MAP';
      });
    },

    useSkill: () => {
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

    // 事件奖励
    generateEventRewards: () => {
      const rewards: EventReward[] = [
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
      set((state) => {
        state.pendingEventRewards = rewards;
        state.eventRewardCollected = false;
        state.scene = 'EVENT_REWARD';
      });
    },

    collectEventReward: (rewardType: EventRewardType) => {
      set((state) => {
        if (state.eventRewardCollected) return;
        
        switch (rewardType) {
          case EventRewardType.GOLD_100:
            state.gold += 100;
            break;
          case EventRewardType.HEAL_20_MP_1:
            state.playerHp = Math.min(state.playerMaxHp, state.playerHp + Math.floor(state.playerMaxHp * 0.2));
            state.playerMp = Math.min(state.playerMaxMp, state.playerMp + 1);
            break;
          case EventRewardType.RANDOM_RELIC:
            const allRelicIds = Object.keys(RELICS) as RelicId[];
            const availableRelics = allRelicIds.filter(id => !state.relics.includes(id));
            if (availableRelics.length > 0) {
              const randomRelic = availableRelics[Math.floor(Math.random() * availableRelics.length)];
              state.relics.push(randomRelic);
            }
            break;
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
