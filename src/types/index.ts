// --- 1. 静态数据字典（预留给策划配表，未来从 JSON 读取） ---

export const CardType = {
  ACTION: 'ACTION',
  MODIFIER: 'MODIFIER',
} as const;

// 职业类型
export const PlayerClass = {
  WARRIOR: 'WARRIOR',
  PRIEST: 'PRIEST',
} as const;

export type PlayerClass = (typeof PlayerClass)[keyof typeof PlayerClass];

export interface PlayerProfile {
  id: string;
  name: string;
  class: PlayerClass;
}

export type CardType = (typeof CardType)[keyof typeof CardType];

export interface CardTemplate {
  templateId: string;
  name: string;
  type: CardType;
  baseValue: number;
  effectId: string;
  artPath: string;
  description: string;
  color: string;
  rewardWeight: number; // 奖励出现权重（越高越容易出现，0=不会出现在奖励中）
}

// --- 2. 运行时状态（内存数据） ---

export interface CardInstance extends CardTemplate {
  uuid: string;
}

// --- 3. 攻击模式 ---

export const AttackPattern = {
  SINGLE: 'SINGLE',
  AREA_SWEEP: 'AREA_SWEEP',
  SPREADING_FLAME: 'SPREADING_FLAME',
  WEAK_POINT_SNIPE: 'WEAK_POINT_SNIPE',
  SPATIAL_LOCK: 'SPATIAL_LOCK',
} as const;

export type AttackPattern = (typeof AttackPattern)[keyof typeof AttackPattern];

export interface AttackPatternConfig {
  pattern: AttackPattern;
  slotSpan?: number; // AREA_SWEEP 的覆盖宽度
  weight: number;
}

// --- 4. Buff/Debuff 系统 ---

export const StatusEffectType = {
  VULNERABLE: 'VULNERABLE', // 破绽：受到伤害 +15%
  BURNING: 'BURNING',       // 燃烧：槽位上卡牌 baseValue 减半
} as const;

export type StatusEffectType = (typeof StatusEffectType)[keyof typeof StatusEffectType];

export interface StatusEffect {
  type: StatusEffectType;
  stacks: number;   // 层数
  duration: number; // 剩余回合数
}

// --- 5. 槽位运行时状态 ---

export interface SlotStatus {
  isLocked: boolean;
  statusEffects: StatusEffect[];
}

// --- 6. 怪物意图 ---

export interface SlotAttack {
  slotIndex: number;
  damage: number;
}

export interface EnemyIntent {
  pattern: AttackPattern;
  attacks: SlotAttack[];     // 预锁定的槽位攻击列表（SNIPE 时为空，执行时填充）
  lockedSlots: number[];     // 空间禁锢锁死的槽位索引
  description: string;
}

// --- 7. 怪物 ---

export interface Enemy {
  name: string;
  emoji: string;
  image?: string;
  maxHp: number;
  currentHp: number;
  armor: number;
  intent: EnemyIntent;
  // 用于每回合生成新意图
  attackPatterns: AttackPatternConfig[];
  baseDamage: number;
  damageVariance: number;
}

export interface EnemyTemplate {
  name: string;
  emoji: string;
  image?: string;
  maxHp: number;
  baseDamage: number;
  damageVariance: number;
  attackPatterns: AttackPatternConfig[];
}

// --- 8. 结算上下文 ---

export interface ExecutionContext {
  // 总量（用于日志和最终扣怪物血）
  accumulatedDamage: number;
  accumulatedArmor: number;
  nextCardMultiplier: number;
  nextCardRepeats: number;
  // 槽位级别数据
  slotArmors: number[];
  slotDamageContributions: number[];
  // 特殊卡牌标记
  damageRedirectMap: Record<number, number>; // 移形换影：被攻击槽→转移目标槽
  reflectPendingSlot: number | null;         // 镜面反射所在槽位
  reflectArmorValue: number;                 // 镜面反射槽位的最终护盾值（用于加成下张攻击牌）
  desperateHpLoss: number;                   // 背水一战预计算血量损失
  // 全局加成
  globalDamageBonus: number;                 // 所有动作牌基础伤害加成
}

// --- 9. 槽位战斗结算结果 ---

export interface SlotPreview {
  slotIndex: number;
  incomingDamage: number;
  blockedDamage: number;
  hpLoss: number;
  isVulnerablePenalty: boolean; // 空门大开
}

// 槽位链接（用于显示连锁特效）
export interface SlotLink {
  from: number; // 修饰卡槽位索引
  to: number;   // 目标卡槽位索引
  type: 'MODIFIER' | 'RESONANCE' | 'CHAIN_DEFENSE' | 'DESPERATE_STRIKE';
}

export interface SlotCombatResult {
  slotResults: SlotPreview[];
  totalPlayerHpLoss: number;
  newVulnerableStacks: number;
  slotsToMarkBurning: number[];
  reflectDamageBonus: number;
  // 镜面反射新效果：完全格挡时，将护盾值加到下一张攻击牌
  mirrorReflectBonus: number;
  // 共鸣增幅V2效果：盾完美格挡时触发全局buff
  resonanceTrigger: boolean;
  // 背水一战效果：本回合受到伤害生命值最多扣到1
  hasDesperateStrike: boolean;
  // 槽位链接（用于显示连锁特效）
  slotLinks: SlotLink[];
}

// --- 10. 游戏阶段 ---

export type GamePhase =
  | 'DRAW'
  | 'PLAY'
  | 'EXECUTE_PHASE1'  // 管道序列计算
  | 'EXECUTE_PHASE2'  // 怪物槽位攻击判定
  | 'EXECUTE_PHASE3'  // 伤害结算
  | 'VICTORY'
  | 'DEFEAT';

// --- 11. Roguelike 地图系统 ---

export const MapNodeType = {
  BATTLE: 'BATTLE',
  SHOP: 'SHOP',
  REST: 'REST',
  REWARD: 'REWARD',
  BOSS: 'BOSS',
} as const;

export type MapNodeType = (typeof MapNodeType)[keyof typeof MapNodeType];

export interface MapNode {
  id: string;
  layer: number;
  column: number;
  type: MapNodeType;
  connections: string[];
  visited: boolean;
  available: boolean;
}

export interface GameMap {
  layers: MapNode[][];
  currentNodeId: string | null;
}

// --- 12. 奖励系统 ---

export interface RewardCard {
  card: CardTemplate;
  isRare: boolean;
}

export interface RewardChoice {
  cards: RewardCard[]; // 当前轮次的卡牌选择
  gold: number;
  bonusSlot: boolean;
  currentRound: number; // 当前是第几轮选择（1 或 2）
  totalRounds: number; // 总轮次数（固定为2）
  allCards: RewardCard[][]; // 所有轮次的卡牌选项，用于记录已选择的卡牌
}

// --- 13. 商店系统 ---

export const ShopItemType = {
  BUY_CARD: 'BUY_CARD',
  REMOVE_CARD: 'REMOVE_CARD',
} as const;

export type ShopItemType = (typeof ShopItemType)[keyof typeof ShopItemType];

export interface ShopItem {
  id: string;
  type: ShopItemType;
  card?: CardTemplate;
  cost: number;
}

// --- 14. 场景路由 ---

export type SceneType = 'TITLE' | 'NPC_HELP' | 'MAP' | 'BATTLE' | 'REWARD' | 'SHOP' | 'EVENT_REWARD' | 'GAME_END';

// --- 15. 常量 ---

export const INITIAL_CONTEXT: ExecutionContext = {
  accumulatedDamage: 0,
  accumulatedArmor: 0,
  nextCardMultiplier: 1,
  nextCardRepeats: 1,
  slotArmors: [],
  slotDamageContributions: [],
  damageRedirectMap: {},
  reflectPendingSlot: null,
  reflectArmorValue: 0,
  desperateHpLoss: 0,
  globalDamageBonus: 0,
};

// 职业技能配置
export const CLASS_MAX_MP: Record<PlayerClass, number> = {
  WARRIOR: 5,
  PRIEST: 5,
};

export const CLASS_SKILL_COST: Record<PlayerClass, number> = {
  WARRIOR: 1,
  PRIEST: 1,
};

// --- 16. 遗物系统 ---

export const RelicId = {
  SLOT_ARMOR_2: 'SLOT_ARMOR_2',           // 每个槽位+2护甲
  NO_ARMOR_DAMAGE_20: 'NO_ARMOR_DAMAGE_20', // 无护盾牌时伤害+20%
  HIGH_DMG_SLOT_ARMOR_5: 'HIGH_DMG_SLOT_ARMOR_5', // 最高伤害槽位+5护甲
  NO_ATTACK_DAMAGE_10: 'NO_ATTACK_DAMAGE_10', // 无攻击牌时伤害+10
  EDGE_SLOT_ARMOR_8: 'EDGE_SLOT_ARMOR_8', // 边缘槽位被攻击时所有槽位+8护甲
} as const;

export type RelicId = (typeof RelicId)[keyof typeof RelicId];

export interface Relic {
  id: RelicId;
  name: string;
  description: string;
  icon: string;
}

export const RELICS: Record<RelicId, Relic> = {
  [RelicId.SLOT_ARMOR_2]: {
    id: RelicId.SLOT_ARMOR_2,
    name: '坚固壁垒',
    description: '回合结算前，给每个槽位+2护盾',
    icon: '🛡️',
  },
  [RelicId.NO_ARMOR_DAMAGE_20]: {
    id: RelicId.NO_ARMOR_DAMAGE_20,
    name: '狂战士之怒',
    description: '当序列中不包含任何护盾牌时，结算总伤害+20%',
    icon: '⚔️',
  },
  [RelicId.HIGH_DMG_SLOT_ARMOR_5]: {
    id: RelicId.HIGH_DMG_SLOT_ARMOR_5,
    name: '危险预警',
    description: '给每回合将要被攻击的伤害最高的槽位+5护盾',
    icon: '👁️',
  },
  [RelicId.NO_ATTACK_DAMAGE_10]: {
    id: RelicId.NO_ATTACK_DAMAGE_10,
    name: '防御反击',
    description: '当序列中不包含任何攻击牌时，结算总伤害+10',
    icon: '🔄',
  },
  [RelicId.EDGE_SLOT_ARMOR_8]: {
    id: RelicId.EDGE_SLOT_ARMOR_8,
    name: '侧翼防护',
    description: '当最左侧或最右侧槽位被攻击时，给要被攻击的所有槽位附加8护盾',
    icon: '🏰',
  },
};

// --- 17. 事件奖励类型 ---

export const EventRewardType = {
  GOLD_100: 'GOLD_100',
  HEAL_20_MP_1: 'HEAL_20_MP_1',
  RANDOM_RELIC: 'RANDOM_RELIC',
} as const;

export type EventRewardType = (typeof EventRewardType)[keyof typeof EventRewardType];

export interface EventReward {
  type: EventRewardType;
  name: string;
  description: string;
  icon: string;
}

export const DEFAULT_PIPELINE_SLOTS = 5;
export const DEFAULT_HAND_DRAW_COUNT = 8;
export const PLAYER_MAX_HP = 120;
export const REMOVE_CARD_COST = 50;
