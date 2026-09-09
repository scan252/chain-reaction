import { motion } from 'framer-motion';
import { useRunStore } from '../store/runStore';
import { Card } from './Card';
import { ShopItemType } from '../types';
import type { CardInstance, CardTemplate } from '../types';
import { DECK } from '../config/balance';

function toDisplayInstance(card: CardTemplate): CardInstance {
  return { ...card, uuid: card.templateId };
}

export function ShopScreen() {
  const gold = useRunStore((s) => s.gold);
  const shopItems = useRunStore((s) => s.shopItems);
  const masterDeck = useRunStore((s) => s.masterDeck);
  const buyCard = useRunStore((s) => s.buyCard);
  const removeCard = useRunStore((s) => s.removeCard);
  const leaveShop = useRunStore((s) => s.leaveShop);

  const removeItem = shopItems.find((i) => i.type === ShopItemType.REMOVE_CARD);
  const buyItems = shopItems.filter((i) => i.type === ShopItemType.BUY_CARD);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-[#0a0a1a] via-[#1a1520] to-[#0a0a1a] overflow-hidden">
      {/* 顶部 */}
      <div className="text-center py-6 border-b border-white/10">
        <h1 className="text-3xl font-bold text-yellow-400">🛒 商店</h1>
        <p className="text-xl text-yellow-300 mt-2">💰 {gold}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* 可购买卡牌 */}
        <h3 className="text-lg font-bold text-white/70 mb-4">购买卡牌</h3>
        <div className="flex flex-wrap gap-6 mb-8 justify-center">
          {buyItems.map((item) => {
            const canAfford = gold >= item.cost;
            return (
              <motion.div
                key={item.id}
                whileHover={canAfford ? { y: -5, scale: 1.03 } : {}}
                className={`relative ${!canAfford ? 'opacity-40' : 'cursor-pointer'}`}
                onClick={() => canAfford && buyCard(item.id)}
              >
                {item.card && <Card card={toDisplayInstance(item.card)} size="lg" />}
                <div className={`text-center mt-2 text-base font-bold ${canAfford ? 'text-yellow-400' : 'text-gray-500'}`}>
                  💰 {item.cost}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 移除卡牌 */}
        {removeItem && (
          <>
            <h3 className="text-lg font-bold text-white/70 mb-3">
              移除卡牌
              <span className="text-yellow-400 ml-2">💰 {removeItem.cost}</span>
              {gold < removeItem.cost && <span className="text-red-400 text-sm ml-2">(金币不足)</span>}
              {masterDeck.length <= DECK.MIN_SIZE && (
                <span className="text-red-400 text-sm ml-2">(卡组至少需要保留 {DECK.MIN_SIZE} 张)</span>
              )}
            </h3>
            <div className="flex flex-wrap gap-4 mb-6 justify-center">
              {masterDeck.map((card, i) => {
                const canRemove = gold >= removeItem.cost && masterDeck.length > DECK.MIN_SIZE;
                return (
                  <motion.div
                    key={`${card.templateId}-${i}`}
                    whileHover={canRemove ? { y: -4, scale: 1.05 } : {}}
                    className={`${canRemove ? 'cursor-pointer' : 'opacity-40'}`}
                    onClick={() => canRemove && removeCard(i)}
                  >
                    <Card card={toDisplayInstance(card)} size="md" />
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 离开 */}
      <div className="text-center py-5 border-t border-white/10">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={leaveShop}
          className="px-10 py-3 rounded-lg font-bold text-base bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg cursor-pointer"
        >
          离开商店
        </motion.button>
      </div>
    </div>
  );
}
