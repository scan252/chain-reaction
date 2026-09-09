// 焚身流派单局调试
import { simulateBattle, archetypeDeck } from './simulate';
import { getEnemyForNode, generateGameMap } from '../src/data/mapData';

const map = generateGameMap();
const l1 = map.layers[0][0];
const l4 = map.layers[3][0];

console.log('=== BURN deck vs L1 ===');
const deck1 = archetypeDeck('BURN', 6);
console.log('deck:', deck1.map((c) => c.name).join(','));
const e1 = getEnemyForNode(l1, 5, 'NORMAL');
console.log('enemy:', e1.name, 'HP', e1.maxHp, 'dmg', e1.baseDamage);
const r1 = simulateBattle(deck1, e1, 'smart', 100, 100, true);
console.log('result:', JSON.stringify(r1));

console.log('=== BURN deck vs L4 ===');
const deck2 = archetypeDeck('BURN', 9);
const e2 = getEnemyForNode(l4, 5, 'NORMAL');
console.log('enemy:', e2.name, 'HP', e2.maxHp, 'dmg', e2.baseDamage);
const r2 = simulateBattle(deck2, e2, 'smart', 80, 100, true);
console.log('result:', JSON.stringify(r2));
