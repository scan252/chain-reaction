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
} from '../types';
import { MapNodeType, AttackPattern } from '../types';

// --- 敌人模板池（按层级分组） ---

export const LAYER_ENEMIES: EnemyTemplate[][] = [
  // 第1层：较弱的敌人
  [
    {
      name: '史莱姆', emoji: '🟢', image: '/pic/monster/m1.webp', maxHp: 40, baseDamage: 6, damageVariance: 4,
      attackPatterns: [{ pattern: AttackPattern.SINGLE, weight: 100 }],
    },
    {
      name: '骷髅兵', emoji: '💀', image: '/pic/monster/m2.webp', maxHp: 50, baseDamage: 8, damageVariance: 4,
      attackPatterns: [{ pattern: AttackPattern.AREA_SWEEP, slotSpan: 2, weight: 100 }],
    },
  ],
  // 第2层：中等敌人
  [
    {
      name: '暗影刺客', emoji: '🗡️', image: '/pic/monster/m3.webp', maxHp: 60, baseDamage: 10, damageVariance: 6,
      attackPatterns: [
        { pattern: AttackPattern.WEAK_POINT_SNIPE, weight: 80 },
        { pattern: AttackPattern.SINGLE, weight: 20 },
      ],
    },
    {
      name: '石像鬼', emoji: '🗿', image: '/pic/monster/m4.webp', maxHp: 75, baseDamage: 8, damageVariance: 4,
      attackPatterns: [
        { pattern: AttackPattern.SPATIAL_LOCK, weight: 60 },
        { pattern: AttackPattern.AREA_SWEEP, slotSpan: 2, weight: 40 },
      ],
    },
    {
      name: '火焰元素', emoji: '🔥', image: '/pic/monster/m5.webp', maxHp: 55, baseDamage: 12, damageVariance: 6,
      attackPatterns: [
        { pattern: AttackPattern.SPREADING_FLAME, weight: 70 },
        { pattern: AttackPattern.SINGLE, weight: 30 },
      ],
    },
  ],
  // 第3层：较强的敌人
  [
    {
      name: '暗夜巫师', emoji: '🧙', image: '/pic/monster/m6.webp', maxHp: 80, baseDamage: 12, damageVariance: 8,
      attackPatterns: [
        { pattern: AttackPattern.WEAK_POINT_SNIPE, weight: 50 },
        { pattern: AttackPattern.SPREADING_FLAME, weight: 50 },
      ],
    },
    {
      name: '铁甲傀儡', emoji: '🤖', image: '/pic/monster/m7.webp', maxHp: 95, baseDamage: 10, damageVariance: 6,
      attackPatterns: [
        { pattern: AttackPattern.SPATIAL_LOCK, weight: 50 },
        { pattern: AttackPattern.AREA_SWEEP, slotSpan: 3, weight: 50 },
      ],
    },
    {
      name: '冰霜巨人', emoji: '❄️', image: '/pic/monster/m8.webp', maxHp: 90, baseDamage: 14, damageVariance: 6,
      attackPatterns: [
        { pattern: AttackPattern.AREA_SWEEP, slotSpan: 3, weight: 60 },
        { pattern: AttackPattern.SPATIAL_LOCK, weight: 40 },
      ],
    },
  ],
];

export const BOSS_TEMPLATES: EnemyTemplate[] = [
  {
    name: '远古巨龙', emoji: '🐉', image: '/pic/monster/b1.webp', maxHp: 150, baseDamage: 15, damageVariance: 10,
    attackPatterns: [
      { pattern: AttackPattern.SINGLE, weight: 25 },
      { pattern: AttackPattern.AREA_SWEEP, slotSpan: 2, weight: 25 },
      { pattern: AttackPattern.SPREADING_FLAME, weight: 25 },
      { pattern: AttackPattern.WEAK_POINT_SNIPE, weight: 25 },
    ],
  },
  {
    name: '深渊领主', emoji: '👹', image: '/pic/monster/b2.webp', maxHp: 180, baseDamage: 18, damageVariance: 8,
    attackPatterns: [
      { pattern: AttackPattern.AREA_SWEEP, slotSpan: 3, weight: 40 },
      { pattern: AttackPattern.SPATIAL_LOCK, weight: 30 },
      { pattern: AttackPattern.WEAK_POINT_SNIPE, weight: 30 },
    ],
  },
  {
    name: '虚空之眼', emoji: '👁️', image: '/pic/monster/b3.webp', maxHp: 130, baseDamage: 20, damageVariance: 12,
    attackPatterns: [
      { pattern: AttackPattern.SPREADING_FLAME, weight: 40 },
      { pattern: AttackPattern.WEAK_POINT_SNIPE, weight: 40 },
      { pattern: AttackPattern.SPATIAL_LOCK, weight: 20 },
    ],
  },
];

// --- 意图生成 ---

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
  enemy: { baseDamage: number; damageVariance: number; attackPatterns: AttackPatternConfig[] },
  pipelineSlots: number,
): EnemyIntent {
  const chosen = pickWeightedPattern(enemy.attackPatterns);
  const damage = enemy.baseDamage + Math.floor(Math.random() * (enemy.damageVariance + 1));

  const attacks: SlotAttack[] = [];
  const lockedSlots: number[] = [];
  let description = '';

  switch (chosen.pattern) {
    case AttackPattern.SINGLE: {
      const slot = Math.floor(Math.random() * pipelineSlots);
      attacks.push({ slotIndex: slot, damage });
      description = `攻击槽位 ${slot + 1}（${damage} 伤害）`;
      break;
    }
    case AttackPattern.AREA_SWEEP: {
      const span = Math.min(chosen.slotSpan ?? 2, pipelineSlots);
      const start = Math.floor(Math.random() * (pipelineSlots - span + 1));
      for (let i = start; i < start + span; i++) {
        attacks.push({ slotIndex: i, damage });
      }
      description = `顺劈槽位 ${start + 1}-${start + span}（各 ${damage} 伤害）`;
      break;
    }
    case AttackPattern.SPREADING_FLAME: {
      const slot = Math.floor(Math.random() * pipelineSlots);
      attacks.push({ slotIndex: slot, damage });
      description = `蔓延攻击槽位 ${slot + 1}（${damage} 伤害）`;
      break;
    }
    case AttackPattern.WEAK_POINT_SNIPE: {
      // attacks 为空，执行时才解析目标
      description = `弱点狙击（${damage} 伤害）— 目标: 最强卡牌`;
      // 保存 damage 在 attacks 中以备用（slotIndex=-1 作为标记）
      attacks.push({ slotIndex: -1, damage });
      break;
    }
    case AttackPattern.SPATIAL_LOCK: {
      const locked = Math.floor(Math.random() * pipelineSlots);
      lockedSlots.push(locked);
      // 攻击另一个随机非锁定槽位
      const available = Array.from({ length: pipelineSlots }, (_, i) => i).filter((i) => i !== locked);
      const target = available[Math.floor(Math.random() * available.length)];
      attacks.push({ slotIndex: target, damage });
      description = `禁锢槽位 ${locked + 1} + 攻击槽位 ${target + 1}（${damage} 伤害）`;
      break;
    }
  }

  return { pattern: chosen.pattern, attacks, lockedSlots, description };
}

// --- 地图配置 ---

const LAYER_NODE_COUNTS = [2, 3, 3, 3, 3, 3, 1];

const NODE_TYPE_WEIGHTS: Record<number, { type: MapNodeTypeT; weight: number }[]> = {
  0: [{ type: MapNodeType.BATTLE, weight: 1 }],
  1: [
    { type: MapNodeType.BATTLE, weight: 40 },
    { type: MapNodeType.SHOP, weight: 25 },
    { type: MapNodeType.REST, weight: 20 },
    { type: MapNodeType.REWARD, weight: 15 },
  ],
  2: [
    { type: MapNodeType.BATTLE, weight: 40 },
    { type: MapNodeType.SHOP, weight: 25 },
    { type: MapNodeType.REST, weight: 20 },
    { type: MapNodeType.REWARD, weight: 15 },
  ],
  3: [
    { type: MapNodeType.BATTLE, weight: 40 },
    { type: MapNodeType.SHOP, weight: 25 },
    { type: MapNodeType.REST, weight: 20 },
    { type: MapNodeType.REWARD, weight: 15 },
  ],
  4: [
    { type: MapNodeType.BATTLE, weight: 40 },
    { type: MapNodeType.SHOP, weight: 25 },
    { type: MapNodeType.REST, weight: 20 },
    { type: MapNodeType.REWARD, weight: 15 },
  ],
  5: [
    { type: MapNodeType.BATTLE, weight: 40 },
    { type: MapNodeType.SHOP, weight: 25 },
    { type: MapNodeType.REST, weight: 20 },
    { type: MapNodeType.REWARD, weight: 15 },
  ],
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

// --- 地图生成 ---

export function generateGameMap(): GameMap {
  const layers: MapNode[][] = [];

  for (let layer = 0; layer < LAYER_NODE_COUNTS.length; layer++) {
    const count = LAYER_NODE_COUNTS[layer];
    const nodes: MapNode[] = [];
    for (let col = 0; col < count; col++) {
      const nodeType = pickWeightedRandom(NODE_TYPE_WEIGHTS[layer]);
      nodes.push({
        id: uuidv4(),
        layer,
        column: col,
        type: nodeType,
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

// --- 根据节点生成敌人 ---

export function getEnemyForNode(node: MapNode, pipelineSlots: number): Enemy {
  let template: EnemyTemplate;
  let isBoss = false;

  if (node.type === MapNodeType.BOSS) {
    template = BOSS_TEMPLATES[Math.floor(Math.random() * BOSS_TEMPLATES.length)];
    isBoss = true;
  } else {
    const layerEnemies = LAYER_ENEMIES[Math.min(node.layer, LAYER_ENEMIES.length - 1)];
    template = layerEnemies[Math.floor(Math.random() * layerEnemies.length)];
  }

  const intent = generateEnemyIntent(template, pipelineSlots);

  return {
    name: template.name,
    emoji: template.emoji,
    image: template.image,
    maxHp: template.maxHp,
    currentHp: template.maxHp,
    armor: 0,
    intent,
    attackPatterns: template.attackPatterns,
    baseDamage: template.baseDamage,
    damageVariance: template.damageVariance,
    isBoss,
  };
}
