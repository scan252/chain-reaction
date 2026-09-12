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
  MAX_HP: 100,
  INITIAL_GOLD: 100,
} as const;

/** 管道与手牌 */
export const PIPELINE = {
  INITIAL_SLOTS: 5,
  MAX_SLOTS: 8,
  HAND_DRAW_COUNT: 9,
} as const;

/** 奖励 */
export const REWARD = {
  /** 战斗胜利金币下限 */
  GOLD_MIN: 15,
  /** 战斗胜利金币随机增量上限（不含） */
  GOLD_VARIANCE: 16,
  /** 精英战斗额外金币 */
  ELITE_GOLD_BONUS: 35,
  /** 额外槽位掉落概率 */
  BONUS_SLOT_CHANCE: 0.1,
  /** 稀有度掉率 */
  RARITY_ODDS: { COMMON: 0.6, UNCOMMON: 0.33, RARE: 0.07 } as Record<string, number>,
  /** 精英难度稀有率提升 */
  ELITE_DIFF_RARITY_RARE: 0.12,
  /** 跳过卡牌奖励的补偿金币 */
  SKIP_COMPENSATION_GOLD: 10,
} as const;

/** 商店 */
export const SHOP = {
  /** 删卡基础价 */
  REMOVE_CARD_BASE_COST: 50,
  /** 每次删卡后价格增量 */
  REMOVE_CARD_COST_STEP: 25,
  /** 删卡价格上限 */
  REMOVE_CARD_COST_MAX: 100,
  CARD_COUNT_MIN: 4,
  CARD_COUNT_VARIANCE: 2,
  PRICE_MIN: 40,
  PRICE_VARIANCE: 45,
  /** 罕见卡加价 */
  UNCOMMON_PRICE_EXTRA: 15,
  /** 稀有卡加价 */
  RARE_PRICE_EXTRA: 35,
} as const;

/** 休息 / 事件 */
export const REST = {
  /** 休息回血比例 */
  HEAL_RATIO: 0.4,
  /** 冥想回复 MP 数 */
  MEDITATE_MP: 2,
} as const;

export const EVENT = {
  HEAL_RATIO: 0.3,
  GOLD: 100,
} as const;

/** 职业 */
export const CLASS = {
  MAX_MP: { WARRIOR: 5, PRIEST: 5 } as Record<string, number>,
  PRIEST_HEAL: 20,
} as const;

/** 状态效果 */
export const STATUS = {
  VULNERABLE_DAMAGE_AMP_PER_STACK: 0.15,
  BURNING_DIVISOR: 2,
  /** 衰弱：卡牌数值乘数 */
  WEAKENED_MULTIPLIER: 0.75,
  /** 焦土点燃：槽位卡牌数值乘数 */
  IGNITED_MULTIPLIER: 2,
  DEFAULT_DURATION: 2,
} as const;

/** 关键词参数 */
export const KEYWORD = {
  /** 全局成长类效果的单场封顶（防"体积即乘法"指数膨胀） */
  GLOBAL_GROWTH_CAP: 14,
  /** 共鸣：相邻同类互相加成比例 */
  RESONANCE_BONUS: 0.5,
  /** 永动链轮遗物的共鸣加成 */
  RESONANCE_ENGINE_BONUS: 0.75,
  /** 蓄力：下一击倍率 */
  CHARGE_UP_MULTIPLIER: 1.75,
  /** 亡命阈值（HP 百分比） */
  DEADLY_THRESHOLD: 0.5,
  DEADLY_MULTIPLIER: 1.5,
  /** 反击遗器加成 */
  RIPOSTE_ENGINE_MULTIPLIER: 1.5,
} as const;

/** 敌人难度系数（v3.2：方差收敛后用系数回填全局威胁度） */
export const DIFFICULTY = {
  NORMAL: { hpMul: 1.12, dmgMul: 1.06 },
  ELITE: { hpMul: 1.28, dmgMul: 1.16 },
} as const;

/** 升级（锻造） */
export const FORGE = {
  /** 数值型升级倍率 */
  VALUE_MULTIPLIER: 1.4,
  /** 反击升级增量 */
  RIPOSTE_STEP: 3,
} as const;

/** 卡组保护 */
export const DECK = {
  MIN_SIZE: 5,
} as const;

/** 隐藏彩蛋 */
export const EASTER_EGG = {
  MASCOT_SECRET_CHANCE: 0.2,
} as const;

/** 爽点层 */
export const JUICE = {
  /** 过载阈值：单回合总伤 ≥ max(此值, 上回合×2) 触发特效 */
  OVERDRIVE_BASE: 60,
  OVERDRIVE_RATIO: 2,
  /** 伤害飘字分级阈值 */
  DAMAGE_TIERS: [40, 85, 130, 180] as const,
} as const;
