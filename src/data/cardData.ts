import { v4 as uuidv4 } from 'uuid';
import { type CardTemplate, CardType, type RewardCard, type ShopItem, ShopItemType } from '../types';
import { SHOP } from '../config/balance';

// rewardWeight 说明：
//   数值越大，奖励三选一时出现概率越高
//   0 = 不会出现在奖励池中（仅初始牌组或商店获取）
//   10 = 普通  20 = 常见  5 = 稀有  2 = 极稀有

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    templateId: 'atk_001',
    name: '火球',
    type: CardType.ACTION,
    baseValue: 6,
    effectId: 'DEAL_DAMAGE',
    artPath: '/assets/cards/atk_001.png',
    description: '造成 6 点伤害',
    color: '#e74c3c',
    rewardWeight: 20,
  },
  {
    templateId: 'def_002',
    name: '冰盾',
    type: CardType.ACTION,
    baseValue: 8,
    effectId: 'GAIN_ARMOR',
    artPath: '/assets/cards/def_002.png',
    description: '获得 8 点护甲',
    color: '#3498db',
    rewardWeight: 12,
  },
  {
    templateId: 'mod_001',
    name: 'X2',
    type: CardType.MODIFIER,
    baseValue: 2,
    effectId: 'MULTIPLY_NEXT',
    artPath: '/assets/cards/mod_001.png',
    description: '下一张牌效果 x2',
    color: '#9b59b6',
    rewardWeight: 15,
  },
];

// 奖励/商店额外卡牌池
export const EXTRA_CARD_TEMPLATES: CardTemplate[] = [
  {
    templateId: 'atk_005',
    name: '陨石术',
    type: CardType.ACTION,
    baseValue: 15,
    effectId: 'DEAL_DAMAGE',
    artPath: '/assets/cards/atk_005.png',
    description: '造成 15 点伤害',
    color: '#d35400',
    rewardWeight: 3,
  },
  {
    templateId: 'def_004',
    name: '神圣护盾',
    type: CardType.ACTION,
    baseValue: 12,
    effectId: 'GAIN_ARMOR',
    artPath: '/assets/cards/def_004.png',
    description: '获得 12 点护甲',
    color: '#1abc9c',
    rewardWeight: 5,
  },
  {
    templateId: 'mod_004',
    name: '连锁反应',
    type: CardType.MODIFIER,
    baseValue: 4,
    effectId: 'REPEAT_NEXT_SHIELD',
    artPath: '/assets/cards/mod_004.png',
    description: '下一张盾牌牌触发 4 次',
    color: '#e91e63',
    rewardWeight: 2,
  },
  {
    templateId: 'atk_006',
    name: '毒雾',
    type: CardType.ACTION,
    baseValue: 7,
    effectId: 'DEAL_DAMAGE',
    artPath: '/assets/cards/atk_006.png',
    description: '造成 7 点伤害',
    color: '#27ae60',
    rewardWeight: 15,
  },
  {
    templateId: 'mod_005',
    name: '多次打击',
    type: CardType.MODIFIER,
    baseValue: 4,
    effectId: 'REPEAT_NEXT_ATTACK',
    artPath: '/assets/cards/mod_005.png',
    description: '下一张攻击牌触发 4 次',
    color: '#ff5722',
    rewardWeight: 5,
  },
  {
    templateId: 'mod_009',
    name: '均衡术',
    type: CardType.MODIFIER,
    baseValue: 3,
    effectId: 'REPEAT_NEXT',
    artPath: '/assets/cards/mod_009.png',
    description: '下一张牌触发 3 次',
    color: '#00b894',
    rewardWeight: 10,
  },
  // --- 槽位攻防 2.0 新卡牌 ---
  {
    templateId: 'atk_007',
    name: '移形换影',
    type: CardType.ACTION,
    baseValue: 4,
    effectId: 'PHASE_SHIFT',
    artPath: '/assets/cards/atk_007.png',
    description: '造成 4 点伤害，被攻击时伤害转移至左侧槽位',
    color: '#6c5ce7',
    rewardWeight: 8,
  },
  {
    templateId: 'def_005',
    name: '镜面反射',
    type: CardType.ACTION,
    baseValue: 6,
    effectId: 'MIRROR_REFLECT',
    artPath: '/assets/cards/def_005.png',
    description: '获得 6 点护甲，若此格完全格挡伤害，结算时总伤害+此格护盾值',
    color: '#00cec9',
    rewardWeight: 8,
  },
  {
    templateId: 'mod_006',
    name: '共鸣增幅',
    type: CardType.MODIFIER,
    baseValue: 2,
    effectId: 'RESONANCE_AMP_V2',
    artPath: '/assets/cards/mod_006.png',
    description: '下一张牌 x2，若下张牌为盾且完美格挡，卡组中所有动作牌基础数值在本场战斗中+1',
    color: '#fdcb6e',
    rewardWeight: 5,
  },
  {
    templateId: 'mod_007',
    name: '背水一战',
    type: CardType.MODIFIER,
    baseValue: 0,
    effectId: 'DESPERATE_STRIKE',
    artPath: '/assets/cards/mod_007.png',
    description: '下一张攻击卡增加值 = 本回合将损失的血量；本回合受到伤害生命值最多扣到1',
    color: '#d63031',
    rewardWeight: 3,
  },
  {
    templateId: 'skill_001',
    name: '强化',
    type: CardType.MODIFIER,
    baseValue: 4,
    effectId: 'MULTIPLY_NEXT',
    artPath: '/assets/cards/skill_001.png',
    description: '下一张牌效果 x4',
    color: '#e17055',
    rewardWeight: 0, // 不出现在奖励池
  },
  {
    templateId: 'mod_008',
    name: '连锁防线',
    type: CardType.MODIFIER,
    baseValue: 0,
    effectId: 'CHAIN_DEFENSE',
    artPath: '/assets/cards/mod_008.png',
    description: '前面所有槽位中最高的护盾值加到每一个槽位上',
    color: '#0984e3',
    rewardWeight: 5,
  },
];

// 禁忌卡牌 - 只能通过吉祥物隐藏对话获取
export const FORBIDDEN_CARD: CardTemplate = {
  templateId: 'forbidden_001',
  name: '我的王之力',
  type: CardType.ACTION,
  baseValue: 999,
  effectId: 'DEAL_DAMAGE',
  artPath: '/assets/cards/forbidden_001.png',
  description: '造成 999 点伤害',
  color: '#8b0000', // 深红色
  rewardWeight: 0, // 不会出现在奖励池
};

export const ALL_CARD_POOL = [...CARD_TEMPLATES, ...EXTRA_CARD_TEMPLATES];

// 初始牌库：6张火球 + 6张冰盾 + 3张X2
export function buildStarterDeck(): CardTemplate[] {
  const deck: CardTemplate[] = [];
  const fireball = CARD_TEMPLATES.find((t) => t.templateId === 'atk_001')!;
  const iceShield = CARD_TEMPLATES.find((t) => t.templateId === 'def_002')!;
  const double = CARD_TEMPLATES.find((t) => t.templateId === 'mod_001')!;

  for (let i = 0; i < 6; i++) deck.push({ ...fireball });
  for (let i = 0; i < 6; i++) deck.push({ ...iceShield });
  for (let i = 0; i < 3; i++) deck.push({ ...double });

  return deck;
}

// 加权随机抽取（不重复）
function weightedSample(pool: CardTemplate[], count: number): CardTemplate[] {
  const remaining = pool.filter((c) => c.rewardWeight > 0);
  const result: CardTemplate[] = [];

  for (let i = 0; i < count && remaining.length > 0; i++) {
    const totalWeight = remaining.reduce((sum, c) => sum + c.rewardWeight, 0);
    let roll = Math.random() * totalWeight;

    for (let j = 0; j < remaining.length; j++) {
      roll -= remaining[j].rewardWeight;
      if (roll <= 0) {
        result.push({ ...remaining[j] });
        remaining.splice(j, 1);
        break;
      }
    }
  }

  return result;
}

// 生成奖励候选卡牌（加权随机）
export function generateRewardCards(count: number = 3): RewardCard[] {
  const picked = weightedSample(ALL_CARD_POOL, count);
  return picked.map((card) => ({
    card,
    isRare: card.rewardWeight <= 5,
  }));
}

// 生成商店商品
export function generateShopItems(): ShopItem[] {
  const pool = [...ALL_CARD_POOL];
  const items: ShopItem[] = [];

  const cardCount = SHOP.CARD_COUNT_MIN + Math.floor(Math.random() * SHOP.CARD_COUNT_VARIANCE);
  for (let i = 0; i < cardCount && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const [card] = pool.splice(idx, 1);
    const cost = SHOP.PRICE_MIN + Math.floor(Math.random() * SHOP.PRICE_VARIANCE);
    items.push({
      id: uuidv4(),
      type: ShopItemType.BUY_CARD,
      card: { ...card },
      cost,
    });
  }

  items.push({
    id: uuidv4(),
    type: ShopItemType.REMOVE_CARD,
    cost: SHOP.REMOVE_CARD_COST,
  });

  return items;
}
