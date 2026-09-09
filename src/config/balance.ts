// ============================================================
// 数值与节奏配置（单一数值源）
// 详见 docs/BALANCE.md 数值白皮书
// ============================================================

/** 动画节奏（毫秒） */
export const TIMING = {
  /** 管道单卡执行动画 */
  CARD_EXECUTE: 380,
  /** 阶段一 -> 阶段二 过渡 */
  PHASE_TRANSITION: 450,
  /** 单槽位受击动画 */
  SLOT_UNDER_ATTACK: 300,
  /** 阶段二 -> 阶段三 过渡 */
  PHASE_FINALIZE: 300,
  /** 快速模式下所有时长的乘数 */
  FAST_MODE_MULTIPLIER: 0.35,
} as const;

/** 玩家基础数值 */
export const PLAYER = {
  MAX_HP: 120,
  INITIAL_GOLD: 100,
} as const;

/** 管道与手牌 */
export const PIPELINE = {
  INITIAL_SLOTS: 5,
  MAX_SLOTS: 8,
  HAND_DRAW_COUNT: 8,
} as const;

/** 奖励 */
export const REWARD = {
  /** 战斗胜利金币下限 */
  GOLD_MIN: 15,
  /** 战斗胜利金币随机增量上限（不含） */
  GOLD_VARIANCE: 16,
  /** 额外槽位掉落概率 */
  BONUS_SLOT_CHANCE: 0.1,
} as const;

/** 商店 */
export const SHOP = {
  REMOVE_CARD_COST: 50,
  /** 商品卡数下限 */
  CARD_COUNT_MIN: 4,
  /** 商品卡数随机增量上限（不含） */
  CARD_COUNT_VARIANCE: 2,
  /** 价格下限 */
  PRICE_MIN: 30,
  /** 价格随机增量上限（不含） */
  PRICE_VARIANCE: 50,
} as const;

/** 休息 / 事件 */
export const REST = {
  /** 休息回血比例 */
  HEAL_RATIO: 0.3,
  /** 冥想回复 MP 数 */
  MEDITATE_MP: 2,
} as const;

export const EVENT = {
  /** 事件节点回血比例 */
  HEAL_RATIO: 0.2,
  /** 事件节点金币 */
  GOLD: 100,
} as const;

/** 职业 */
export const CLASS = {
  MAX_MP: { WARRIOR: 5, PRIEST: 5 } as Record<string, number>,
  /** 牧师技能治疗量 */
  PRIEST_HEAL: 20,
} as const;

/** 状态效果 */
export const STATUS = {
  /** 破绽：每层受伤增幅 */
  VULNERABLE_DAMAGE_AMP_PER_STACK: 0.15,
  /** 燃烧：槽位卡牌数值除数 */
  BURNING_DIVISOR: 2,
  /** 默认持续回合 */
  DEFAULT_DURATION: 2,
} as const;

/** 卡组保护 */
export const DECK = {
  /** 商店删卡后卡组最小张数 */
  MIN_SIZE: 5,
} as const;

/** 隐藏彩蛋 */
export const EASTER_EGG = {
  /** 吉祥物触发隐藏对话概率 */
  MASCOT_SECRET_CHANCE: 0.2,
} as const;
