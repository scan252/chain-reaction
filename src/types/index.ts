// --- 1. 静态数据字典 ---

export const CardType = {
  ACTION: 'ACTION',
  MODIFIER: 'MODIFIER',
} as const;

export type CardType = (typeof CardType)[keyof typeof CardType];

// 稀有度
export const Rarity = {
  COMMON: 'COMMON',     // 普通
  UNCOMMON: 'UNCOMMON', // 罕见
  RARE: 'RARE',         // 稀有
} as const;
export type Rarity = (typeof Rarity)[keyof typeof Rarity];

export const RARITY_META: Record<Rarity, { label: string; color: string; glow: string }> = {
  [Rarity.COMMON]: { label: '普通', color: '#9ca3af', glow: 'rgba(156,163,175,0.35)' },
  [Rarity.UNCOMMON]: { label: '罕见', color: '#38bdf8', glow: 'rgba(56,189,248,0.45)' },
  [Rarity.RARE]: { label: '稀有', color: '#c084fc', glow: 'rgba(192,132,252,0.55)' },
};

// 流派
export const Archetype = {
  GENERIC: 'GENERIC',
  CHAIN: 'CHAIN',
  RESONANCE: 'RESONANCE',
  RIPOSTE: 'RIPOSTE',
  BURN: 'BURN',
} as const;
export type Archetype = (typeof Archetype)[keyof typeof Archetype];

export const ARCHETYPE_META: Record<Archetype, { label: string; icon: string; color: string }> = {
  [Archetype.GENERIC]: { label: '通用', icon: '⚪', color: '#94a3b8' },
  [Archetype.CHAIN]: { label: '连锁', icon: '⚡', color: '#facc15' },
  [Archetype.RESONANCE]: { label: '共鸣', icon: '≋', color: '#22d3ee' },
  [Archetype.RIPOSTE]: { label: '反击', icon: '🛡', color: '#f87171' },
  [Archetype.BURN]: { label: '焚身', icon: '🔥', color: '#fb923c' },
};

// 职业类型
export const PlayerClass = {
  WARRIOR: 'WARRIOR',
  PRIEST: 'PRIEST',
} as const;
export type PlayerClass = (typeof PlayerClass)[keyof typeof PlayerClass];

// 难度
export const Difficulty = {
  NORMAL: 'NORMAL',
  ELITE: 'ELITE',
} as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

export interface PlayerProfile {
  id: string;
  name: string;
  class: PlayerClass;
}

export interface CardTemplate {
  templateId: string;
  name: string;
  type: CardType;
  baseValue: number;
  effectId: string;
  description: string;
  color: string;
  rarity: Rarity;
  /** 连锁 N：效果触发 1+N×(此前本回合已执行的攻击牌数) */
  chain?: number;
  /** 共鸣：与相邻同类卡互相 +50% */
  resonance?: boolean;
  /** 反击 N：所在槽被攻击且未掉血时附加 N 伤害 */
  riposte?: number;
  /** 焚身 X：结算时失去 X 点 HP */
  burnCost?: number;
  /** 流派归属（奖励定向与统计用） */
  archetype: Archetype;
  /** 锻造（升级）标记 */
  upgraded?: boolean;
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
  CHARGE_UP: 'CHARGE_UP',       // 蓄力：本回合不动，下回合伤害×2.5
  FORTIFY: 'FORTIFY',           // 蓄势：自身获得护盾
  DOUBLE_STRIKE: 'DOUBLE_STRIKE', // 双重打击：攻击2个槽位
  ENRAGE: 'ENRAGE',             // 增益：自身攻击+BuffValue（本场）
  WEAKEN: 'WEAKEN',             // 衰弱：玩家下回合卡牌数值-25%
} as const;

export type AttackPattern = (typeof AttackPattern)[keyof typeof AttackPattern];

export interface AttackPatternConfig {
  pattern: AttackPattern;
  slotSpan?: number;  // AREA_SWEEP 的覆盖宽度
  weight: number;
  buffValue?: number; // FORTIFY 护盾量 / ENRAGE 攻击增量
}

// --- 4. Buff/Debuff 系统 ---

export const StatusEffectType = {
  VULNERABLE: 'VULNERABLE', // 破绽：受到伤害 +15%/层
  BURNING: 'BURNING',       // 燃烧：槽位上卡牌数值减半
  WEAKENED: 'WEAKENED',     // 衰弱：卡牌数值 -25%（玩家，1回合）
  IGNITED: 'IGNITED',       // 焦土点燃：槽位卡牌数值 +100%
} as const;

export type StatusEffectType = (typeof StatusEffectType)[keyof typeof StatusEffectType];

export interface StatusEffect {
  type: StatusEffectType;
  stacks: number;
  duration: number;
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
  attacks: SlotAttack[];
  lockedSlots: number[];
  description: string;
  /** 蓄力倍率提示（CHARGE_UP 后的下一击） */
  chargeMultiplier?: number;
  buffValue?: number;
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
  attackPatterns: AttackPatternConfig[];
  baseDamage: number;
  damageVariance: number;
  isBoss?: boolean;
  isElite?: boolean;
  /** 蓄力累计倍率（下一次攻击伤害乘数） */
  chargeMultiplier: number;
  /** 二阶段意图组（Boss 50% 血切换） */
  phase2Patterns?: AttackPatternConfig[];
}

export interface EnemyTemplate {
  name: string;
  emoji: string;
  image?: string;
  maxHp: number;
  baseDamage: number;
  damageVariance: number;
  attackPatterns: AttackPatternConfig[];
  phase2Patterns?: AttackPatternConfig[];
  isElite?: boolean;
}

// --- 8. 结算上下文 ---

export interface ExecutionContext {
  accumulatedDamage: number;
  accumulatedArmor: number;
  nextCardMultiplier: number;
  nextCardRepeats: number;
  slotArmors: number[];
  slotDamageContributions: number[];
  damageRedirectMap: Record<number, number>;
  reflectPendingSlot: number | null;
  reflectArmorValue: number;
  desperateHpLoss: number;
  globalDamageBonus: number;
  // ===== v2 关键词引擎 =====
  /** 本回合已执行的攻击牌数（连锁基础） */
  chainAttackCount: number;
  /** 本回合焚身总 HP 代价（结算后统一扣除） */
  totalBurnHpCost: number;
  /** 定位仪：共鸣加成 ×1.5 → ×2.25 */
  resonanceAmpMultiplier: number;
  /** 超导：连锁每次触发额外伤害（本场成长，经 globalDamageBonus 类似通道） */
  chainBonusPerTrigger: number;
  /** 链化：下一张牌临时获得连锁 N */
  nextCardChainBonus: number;
  /** 亡命：HP≤50% 时攻击 ×1.5 */
  deadlyMultiplier: number;
  /** 衰弱：本回合卡牌数值 -25% */
  weakened: boolean;
  /** 执行时玩家当前 HP（不死鸟等条件卡） */
  playerHpCurrent: number;
  /** 本场累计已损失 HP（复仇誓言） */
  hpLostThisBattle: number;
  /** 亡命条件预计算：HP≤50% */
  deadlyEligible: boolean;
  /** 本回合被攻击槽位数（角斗士） */
  attackedSlotCount: number;
  /** 复仇誓言等：下一张攻击卡附加固定伤害 */
  nextCardFlatBonus: number;
  /** 焦土：本回合要点燃的槽位 */
  slotsToIgnite: number[];
  /** 反击伤害累计（阶段二结算后附加） */
  riposteDamage: number;
}

// --- 9. 槽位战斗结算结果 ---

export interface SlotPreview {
  slotIndex: number;
  incomingDamage: number;
  blockedDamage: number;
  hpLoss: number;
  isVulnerablePenalty: boolean;
}

export interface SlotLink {
  from: number;
  to: number;
  type: 'MODIFIER' | 'RESONANCE' | 'CHAIN_DEFENSE' | 'DESPERATE_STRIKE';
}

export interface SlotCombatResult {
  slotResults: SlotPreview[];
  totalPlayerHpLoss: number;
  newVulnerableStacks: number;
  slotsToMarkBurning: number[];
  reflectDamageBonus: number;
  resonanceTrigger: boolean;
  hasDesperateStrike: boolean;
  slotLinks: SlotLink[];
  /** 反击触发的总伤害（完美格挡奖励） */
  riposteDamage: number;
  /** 黄金钟：本回合存在完美格挡 */
  perfectBlockTrigger: boolean;
}

// --- 10. 游戏阶段 ---

export type GamePhase =
  | 'DRAW'
  | 'PLAY'
  | 'EXECUTE_PHASE1'
  | 'EXECUTE_PHASE2'
  | 'EXECUTE_PHASE3'
  | 'VICTORY'
  | 'DEFEAT';

// --- 11. Roguelike 地图系统 ---

export const MapNodeType = {
  BATTLE: 'BATTLE',
  ELITE: 'ELITE',
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
  cards: RewardCard[];
  gold: number;
  bonusSlot: boolean;
  currentRound: number;
  totalRounds: number;
  allCards: RewardCard[][];
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
  chainAttackCount: 0,
  totalBurnHpCost: 0,
  resonanceAmpMultiplier: 1,
  chainBonusPerTrigger: 0,
  nextCardChainBonus: 0,
  deadlyMultiplier: 1,
  weakened: false,
  playerHpCurrent: 0,
  hpLostThisBattle: 0,
  deadlyEligible: false,
  attackedSlotCount: 0,
  nextCardFlatBonus: 0,
  slotsToIgnite: [],
  riposteDamage: 0,
};

export const CLASS_MAX_MP: Record<PlayerClass, number> = {
  WARRIOR: 5,
  PRIEST: 5,
};

// --- 16. 遗物系统 ---

export const RelicId = {
  SLOT_ARMOR_2: 'SLOT_ARMOR_2',
  NO_ARMOR_DAMAGE_20: 'NO_ARMOR_DAMAGE_20',
  HIGH_DMG_SLOT_ARMOR_5: 'HIGH_DMG_SLOT_ARMOR_5',
  NO_ATTACK_DAMAGE_10: 'NO_ATTACK_DAMAGE_10',
  EDGE_SLOT_ARMOR_8: 'EDGE_SLOT_ARMOR_8',
  CHAIN_ENGINE: 'CHAIN_ENGINE',
  RESONANCE_ENGINE: 'RESONANCE_ENGINE',
  RIPOSTE_ENGINE: 'RIPOSTE_ENGINE',
  BURN_ENGINE: 'BURN_ENGINE',
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
    description: '当最左或最右槽位被攻击时，给要被攻击的所有槽位附加8护盾',
    icon: '🏰',
  },
  [RelicId.CHAIN_ENGINE]: {
    id: RelicId.CHAIN_ENGINE,
    name: '永动链轮',
    description: '连锁触发时，每次额外+1伤害（本场战斗）',
    icon: '⛓️',
  },
  [RelicId.RESONANCE_ENGINE]: {
    id: RelicId.RESONANCE_ENGINE,
    name: '共鸣腔体',
    description: '共鸣加成从+50%提高到+75%',
    icon: '≋',
  },
  [RelicId.RIPOSTE_ENGINE]: {
    id: RelicId.RIPOSTE_ENGINE,
    name: '荆棘纹章',
    description: '所有反击伤害+50%',
    icon: '🌵',
  },
  [RelicId.BURN_ENGINE]: {
    id: RelicId.BURN_ENGINE,
    name: '不死鸟羽',
    description: '焚身的生命消耗-1（最低1）',
    icon: '🔥',
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
