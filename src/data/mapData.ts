import { v4 as uuidv4 } from 'uuid';
import type {
  EnemyTemplate,
  Enemy,
  EnemyIntent,
  SlotAttack,
  AttackPatternConfig,
  MapNode,
  GameMap,
  MapNodeType as MapNodeTypeT,
  Difficulty,
} from '../types';
import { MapNodeType, AttackPattern } from '../types';
import { DIFFICULTY, KEYWORD } from '../config/balance';

// ============================================================
// 敌人模板池
// 数值依据 docs/BALANCE.md §5
// ============================================================

/** 第1层：教学 */
const POOL_L1: EnemyTemplate[] = [
  {
    name: '史莱姆', emoji: '🟢', image: '/pic/monster/m1.webp',
    maxHp: 40, baseDamage: 6, damageVariance: 2,
    attackPatterns: [{ pattern: AttackPattern.SINGLE, weight: 100 }],
  },
  {
    name: '骷髅兵', emoji: '💀', image: '/pic/monster/m2.webp',
    maxHp: 48, baseDamage: 7, damageVariance: 2,
    attackPatterns: [{ pattern: AttackPattern.AREA_SWEEP, slotSpan: 2, weight: 100 }],
  },
];

/** 第2层：成型期 */
const POOL_L2: EnemyTemplate[] = [
  {
    name: '暗影刺客', emoji: '🗡️', image: '/pic/monster/m3.webp',
    maxHp: 58, baseDamage: 9, damageVariance: 3,
    attackPatterns: [
      { pattern: AttackPattern.WEAK_POINT_SNIPE, weight: 70 },
      { pattern: AttackPattern.SINGLE, weight: 30 },
    ],
  },
  {
    name: '石像鬼', emoji: '🗿', image: '/pic/monster/m4.webp',
    maxHp: 72, baseDamage: 8, damageVariance: 3,
    attackPatterns: [
      { pattern: AttackPattern.SPATIAL_LOCK, weight: 55 },
      { pattern: AttackPattern.FORTIFY, buffValue: 10, weight: 45 },
    ],
  },
  {
    name: '火焰元素', emoji: '🔥', image: '/pic/monster/m5.webp',
    maxHp: 60, baseDamage: 10, damageVariance: 3,
    attackPatterns: [
      { pattern: AttackPattern.SPREADING_FLAME, weight: 60 },
      { pattern: AttackPattern.CHARGE_UP, buffValue: KEYWORD.CHARGE_UP_MULTIPLIER, weight: 40 },
    ],
  },
];

/** 第4层 */
const POOL_L4: EnemyTemplate[] = [
  {
    name: '暗夜巫师', emoji: '🧙', image: '/pic/monster/m6.webp',
    maxHp: 88, baseDamage: 10, damageVariance: 3,
    attackPatterns: [
      { pattern: AttackPattern.WEAK_POINT_SNIPE, weight: 40 },
      { pattern: AttackPattern.CHARGE_UP, buffValue: KEYWORD.CHARGE_UP_MULTIPLIER, weight: 30 },
      { pattern: AttackPattern.ENRAGE, buffValue: 3, weight: 30 },
    ],
  },
  {
    name: '铁甲傀儡', emoji: '🤖', image: '/pic/monster/m7.webp',
    maxHp: 96, baseDamage: 10, damageVariance: 3,
    attackPatterns: [
      { pattern: AttackPattern.SPATIAL_LOCK, weight: 40 },
      { pattern: AttackPattern.AREA_SWEEP, slotSpan: 2, weight: 35 },
      { pattern: AttackPattern.FORTIFY, buffValue: 14, weight: 25 },
    ],
  },
  {
    name: '冰霜蛇妖', emoji: '🐍', image: '/pic/monster/m8.webp',
    maxHp: 94, baseDamage: 9, damageVariance: 3,
    attackPatterns: [
      { pattern: AttackPattern.DOUBLE_STRIKE, weight: 50 },
      { pattern: AttackPattern.WEAKEN, buffValue: 1, weight: 30 },
      { pattern: AttackPattern.SINGLE, weight: 20 },
    ],
  },
];

/** 第5层 */
const POOL_L5: EnemyTemplate[] = [
  {
    name: '深渊猎手', emoji: '👁️', image: '/pic/monster/m3.webp',
    maxHp: 106, baseDamage: 11, damageVariance: 3,
    attackPatterns: [
      { pattern: AttackPattern.WEAK_POINT_SNIPE, weight: 45 },
      { pattern: AttackPattern.DOUBLE_STRIKE, weight: 35 },
      { pattern: AttackPattern.CHARGE_UP, buffValue: KEYWORD.CHARGE_UP_MULTIPLIER, weight: 20 },
    ],
  },
  {
    name: '熔火巨犬', emoji: '🐺', image: '/pic/monster/m5.webp',
    maxHp: 116, baseDamage: 10, damageVariance: 3,
    attackPatterns: [
      { pattern: AttackPattern.SPREADING_FLAME, weight: 45 },
      { pattern: AttackPattern.AREA_SWEEP, slotSpan: 2, weight: 40 },
      { pattern: AttackPattern.ENRAGE, buffValue: 4, weight: 15 },
    ],
  },
];

/** 精英：第3层（二选一） */
const ELITE_L3: EnemyTemplate[] = [
  {
    name: '雷暴元素', emoji: '⛈️', image: '/pic/monster/b3.webp',
    maxHp: 110, baseDamage: 10, damageVariance: 3, isElite: true,
    // 蓄力→爆发 循环：考验防御峰值
    attackPatterns: [
      { pattern: AttackPattern.CHARGE_UP, buffValue: KEYWORD.CHARGE_UP_MULTIPLIER, weight: 60 },
      { pattern: AttackPattern.AREA_SWEEP, slotSpan: 2, weight: 40 },
    ],
  },
  {
    name: '熔岩巨兽', emoji: '🌋', image: '/pic/monster/b1.webp',
    maxHp: 118, baseDamage: 9, damageVariance: 2, isElite: true,
    // 全场燃烧压力：考验槽位经济
    attackPatterns: [
      { pattern: AttackPattern.SPREADING_FLAME, weight: 45 },
      { pattern: AttackPattern.AREA_SWEEP, slotSpan: 2, weight: 35 },
      { pattern: AttackPattern.FORTIFY, buffValue: 12, weight: 20 },
    ],
  },
];

/** 精英：第6层（二选一） */
const ELITE_L6: EnemyTemplate[] = [
  {
    name: '时之守卫', emoji: '⏳', image: '/pic/monster/b2.webp',
    maxHp: 130, baseDamage: 11, damageVariance: 3, isElite: true,
    // 锁槽+双打：考验序列运转
    attackPatterns: [
      { pattern: AttackPattern.SPATIAL_LOCK, weight: 45 },
      { pattern: AttackPattern.DOUBLE_STRIKE, weight: 40 },
      { pattern: AttackPattern.WEAKEN, buffValue: 1, weight: 15 },
    ],
  },
  {
    name: '腐蚀树妖', emoji: '🌳', image: '/pic/monster/m6.webp',
    maxHp: 144, baseDamage: 8, damageVariance: 2, isElite: true,
    // 高频多槽：考验平均格挡
    attackPatterns: [
      { pattern: AttackPattern.AREA_SWEEP, slotSpan: 3, weight: 50 },
      { pattern: AttackPattern.SPREADING_FLAME, weight: 30 },
      { pattern: AttackPattern.ENRAGE, buffValue: 5, weight: 20 },
    ],
  },
];

/** Boss：多阶段（50% 血切换意图组） */
const BOSS_TEMPLATES: EnemyTemplate[] = [
  {
    name: '远古巨龙', emoji: '🐉', image: '/pic/monster/b1.webp',
    maxHp: 206, baseDamage: 12, damageVariance: 3,
    attackPatterns: [
      { pattern: AttackPattern.SINGLE, weight: 35 },
      { pattern: AttackPattern.AREA_SWEEP, slotSpan: 2, weight: 35 },
      { pattern: AttackPattern.CHARGE_UP, buffValue: KEYWORD.CHARGE_UP_MULTIPLIER, weight: 30 },
    ],
    phase2Patterns: [
      { pattern: AttackPattern.CHARGE_UP, buffValue: 2.25, weight: 40 },
      { pattern: AttackPattern.AREA_SWEEP, slotSpan: 3, weight: 35 },
      { pattern: AttackPattern.ENRAGE, buffValue: 6, weight: 25 },
    ],
  },
  {
    name: '深渊领主', emoji: '👹', image: '/pic/monster/b2.webp',
    maxHp: 220, baseDamage: 13, damageVariance: 3,
    attackPatterns: [
      { pattern: AttackPattern.SPATIAL_LOCK, weight: 35 },
      { pattern: AttackPattern.DOUBLE_STRIKE, weight: 40 },
      { pattern: AttackPattern.ENRAGE, buffValue: 4, weight: 25 },
    ],
    phase2Patterns: [
      { pattern: AttackPattern.AREA_SWEEP, slotSpan: 3, weight: 45 },
      { pattern: AttackPattern.WEAKEN, buffValue: 1, weight: 30 },
      { pattern: AttackPattern.DOUBLE_STRIKE, weight: 25 },
    ],
  },
  {
    name: '虚空之眼', emoji: '👁️', image: '/pic/monster/b3.webp',
    maxHp: 198, baseDamage: 12, damageVariance: 4,
    attackPatterns: [
      { pattern: AttackPattern.SPREADING_FLAME, weight: 40 },
      { pattern: AttackPattern.WEAK_POINT_SNIPE, weight: 35 },
      { pattern: AttackPattern.FORTIFY, buffValue: 16, weight: 25 },
    ],
    phase2Patterns: [
      { pattern: AttackPattern.WEAK_POINT_SNIPE, weight: 40 },
      { pattern: AttackPattern.CHARGE_UP, buffValue: 2.25, weight: 35 },
      { pattern: AttackPattern.SPREADING_FLAME, weight: 25 },
    ],
  },
];

// ============================================================
// 意图生成
// ============================================================

function pickWeightedPattern(patterns: AttackPatternConfig[]): AttackPatternConfig {
  const total = patterns.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of patterns) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return patterns[patterns.length - 1];
}

export function generateEnemyIntent(
  enemy: {
    baseDamage: number;
    damageVariance: number;
    attackPatterns: AttackPatternConfig[];
    chargeMultiplier?: number;
  },
  pipelineSlots: number,
): EnemyIntent {
  const chosen = pickWeightedPattern(enemy.attackPatterns);
  let damage = enemy.baseDamage + Math.floor(Math.random() * (enemy.damageVariance + 1));

  // 蓄力结算：上次蓄力累积的倍率应用到本次攻击意图
  const pendingCharge = enemy.chargeMultiplier ?? 1;
  if (pendingCharge > 1) {
    damage = Math.floor(damage * pendingCharge);
  }

  const attacks: SlotAttack[] = [];
  const lockedSlots: number[] = [];
  let description = '';
  let newCharge = 1;

  switch (chosen.pattern) {
    case AttackPattern.SINGLE: {
      const slot = Math.floor(Math.random() * pipelineSlots);
      attacks.push({ slotIndex: slot, damage });
      description = `攻击槽位 ${slot + 1}（${damage} 伤害）`;
      break;
    }
    case AttackPattern.DOUBLE_STRIKE: {
      const slots = [...Array(pipelineSlots).keys()];
      const first = slots.splice(Math.floor(Math.random() * slots.length), 1)[0];
      const second = slots.splice(Math.floor(Math.random() * slots.length), 1)[0];
      attacks.push({ slotIndex: first, damage }, { slotIndex: second, damage });
      description = `双重打击槽位 ${first + 1}、${second + 1}（各 ${damage} 伤害）`;
      break;
    }
    case AttackPattern.AREA_SWEEP: {
      const span = Math.min(chosen.slotSpan ?? 2, pipelineSlots);
      const start = Math.floor(Math.random() * (pipelineSlots - span + 1));
      // 大范围顺劈每槽伤害衰减（软化疗程压力）
      const perSlot = span >= 3 ? Math.floor(damage * 0.75) : damage;
      for (let i = start; i < start + span; i++) {
        attacks.push({ slotIndex: i, damage: perSlot });
      }
      description = `顺劈槽位 ${start + 1}-${start + span}（各 ${perSlot} 伤害）`;
      break;
    }
    case AttackPattern.SPREADING_FLAME: {
      const slot = Math.floor(Math.random() * pipelineSlots);
      attacks.push({ slotIndex: slot, damage });
      description = `蔓延攻击槽位 ${slot + 1}（${damage} 伤害，命中掉血则燃烧）`;
      break;
    }
    case AttackPattern.WEAK_POINT_SNIPE: {
      attacks.push({ slotIndex: -1, damage });
      description = `弱点狙击（${damage} 伤害）— 执行时锁定最强卡牌槽位`;
      break;
    }
    case AttackPattern.SPATIAL_LOCK: {
      const locked = Math.floor(Math.random() * pipelineSlots);
      lockedSlots.push(locked);
      const available = [...Array(pipelineSlots).keys()].filter((i) => i !== locked);
      const target = available[Math.floor(Math.random() * available.length)];
      attacks.push({ slotIndex: target, damage });
      description = `禁锢槽位 ${locked + 1} + 攻击槽位 ${target + 1}（${damage} 伤害）`;
      break;
    }
    case AttackPattern.CHARGE_UP: {
      newCharge = chosen.buffValue ?? KEYWORD.CHARGE_UP_MULTIPLIER;
      description = `⚡蓄力中 — 下回合攻击 ×${newCharge}！`;
      break;
    }
    case AttackPattern.FORTIFY: {
      description = `🛡️蓄势 — 自身获得 ${chosen.buffValue ?? 10} 点护盾`;
      break;
    }
    case AttackPattern.ENRAGE: {
      description = `😠增益 — 自身攻击永久 +${chosen.buffValue ?? 3}`;
      break;
    }
    case AttackPattern.WEAKEN: {
      description = `🌀衰弱 — 你的下回合卡牌数值 -25%`;
      break;
    }
  }

  return {
    pattern: chosen.pattern,
    attacks,
    lockedSlots,
    description,
    chargeMultiplier: newCharge,
    buffValue: chosen.buffValue,
  };
}

// ============================================================
// 地图：7 层 [战斗, 混合, 精英, 混合, 混合, 精英, Boss]
// ============================================================

const LAYER_NODE_COUNTS = [2, 3, 2, 3, 3, 2, 1];

const NODE_TYPE_WEIGHTS: Record<number, { type: MapNodeTypeT; weight: number }[]> = {
  0: [{ type: MapNodeType.BATTLE, weight: 1 }],
  1: [
    { type: MapNodeType.BATTLE, weight: 45 },
    { type: MapNodeType.SHOP, weight: 20 },
    { type: MapNodeType.REST, weight: 20 },
    { type: MapNodeType.REWARD, weight: 15 },
  ],
  2: [{ type: MapNodeType.ELITE, weight: 1 }],
  3: [
    { type: MapNodeType.BATTLE, weight: 55 },
    { type: MapNodeType.SHOP, weight: 15 },
    { type: MapNodeType.REST, weight: 15 },
    { type: MapNodeType.REWARD, weight: 15 },
  ],
  4: [
    { type: MapNodeType.BATTLE, weight: 50 },
    { type: MapNodeType.SHOP, weight: 20 },
    { type: MapNodeType.REST, weight: 15 },
    { type: MapNodeType.REWARD, weight: 15 },
  ],
  5: [{ type: MapNodeType.ELITE, weight: 1 }],
  6: [{ type: MapNodeType.BOSS, weight: 1 }],
};

function pickWeightedRandom(weights: { type: MapNodeTypeT; weight: number }[]): MapNodeTypeT {
  const total = weights.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const w of weights) {
    r -= w.weight;
    if (r <= 0) return w.type;
  }
  return weights[weights.length - 1].type;
}

export function generateGameMap(): GameMap {
  const layers: MapNode[][] = [];

  for (let layer = 0; layer < LAYER_NODE_COUNTS.length; layer++) {
    const count = LAYER_NODE_COUNTS[layer];
    const nodes: MapNode[] = [];
    for (let col = 0; col < count; col++) {
      nodes.push({
        id: uuidv4(),
        layer,
        column: col,
        type: pickWeightedRandom(NODE_TYPE_WEIGHTS[layer]),
        connections: [],
        visited: false,
        available: layer === 0,
      });
    }
    layers.push(nodes);
  }

  for (let layer = 0; layer < layers.length - 1; layer++) {
    const currentNodes = layers[layer];
    const nextNodes = layers[layer + 1];

    for (const node of currentNodes) {
      const targetCols: number[] = [];
      const maxCol = nextNodes.length - 1;
      const ratio = maxCol > 0 ? node.column / Math.max(currentNodes.length - 1, 1) : 0;
      const primaryCol = Math.round(ratio * maxCol);
      targetCols.push(primaryCol);

      if (Math.random() > 0.4 && maxCol > 0) {
        const extraCol = Math.min(maxCol, Math.max(0, primaryCol + (Math.random() > 0.5 ? 1 : -1)));
        if (!targetCols.includes(extraCol)) {
          targetCols.push(extraCol);
        }
      }

      for (const col of targetCols) {
        const targetId = nextNodes[col].id;
        if (!node.connections.includes(targetId)) {
          node.connections.push(targetId);
        }
      }
    }

    for (const nextNode of nextNodes) {
      const hasConnection = currentNodes.some((n) => n.connections.includes(nextNode.id));
      if (!hasConnection) {
        const closestNode = currentNodes.reduce((closest, n) => {
          const dist = Math.abs(n.column / Math.max(currentNodes.length - 1, 1) - nextNode.column / Math.max(nextNodes.length - 1, 1));
          const closestDist = Math.abs(closest.column / Math.max(currentNodes.length - 1, 1) - nextNode.column / Math.max(nextNodes.length - 1, 1));
          return dist < closestDist ? n : closest;
        });
        closestNode.connections.push(nextNode.id);
      }
    }
  }

  return { layers, currentNodeId: null };
}

// ============================================================
// 节点 → 敌人
// ============================================================

const LAYER_POOLS: Record<number, EnemyTemplate[]> = {
  0: POOL_L1,
  1: POOL_L2,
  3: POOL_L4,
  4: POOL_L5,
};

const ELITE_POOLS: Record<number, EnemyTemplate[]> = {
  2: ELITE_L3,
  5: ELITE_L6,
};

export function getEnemyForNode(node: MapNode, pipelineSlots: number, difficulty: Difficulty = 'NORMAL'): Enemy {
  let template: EnemyTemplate;
  let isBoss = false;
  let isElite = false;

  if (node.type === MapNodeType.BOSS) {
    template = BOSS_TEMPLATES[Math.floor(Math.random() * BOSS_TEMPLATES.length)];
    isBoss = true;
  } else if (node.type === MapNodeType.ELITE) {
    const pool = ELITE_POOLS[node.layer] ?? ELITE_L6;
    template = pool[Math.floor(Math.random() * pool.length)];
    isElite = true;
  } else {
    const poolKey = Object.keys(LAYER_POOLS).map(Number).sort((a, b) => b - a).find((l) => node.layer >= l) ?? 0;
    const pool = LAYER_POOLS[poolKey] ?? POOL_L1;
    template = pool[Math.floor(Math.random() * pool.length)];
  }

  // 难度缩放
  const diff = DIFFICULTY[difficulty];
  const maxHp = Math.round(template.maxHp * diff.hpMul);
  const baseDamage = Math.round(template.baseDamage * diff.dmgMul);

  const scaled = { ...template, maxHp, baseDamage };
  const intent = generateEnemyIntent(scaled, pipelineSlots);

  return {
    name: template.name,
    emoji: template.emoji,
    image: template.image,
    maxHp,
    currentHp: maxHp,
    armor: 0,
    intent,
    attackPatterns: template.attackPatterns,
    baseDamage,
    damageVariance: template.damageVariance,
    isBoss,
    isElite,
    chargeMultiplier: 1,
    phase2Patterns: template.phase2Patterns,
  };
}
