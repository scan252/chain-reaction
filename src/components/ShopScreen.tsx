import { motion } from 'framer-motion';
import { useRunStore } from '../store/runStore';
import { Card } from './Card';
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
  const currentRemoveCost = useRunStore((s) => s.currentRemoveCost);
  const leaveShop = useRunStore((s) => s.leaveShop);

  const removeCost = currentRemoveCost();
  const canRemoveAny = gold >= removeCost && masterDeck.length > DECK.MIN_SIZE;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-[#0a0a1a] via-[#1a1520] to-[#0a0a1a] overflow-hidden">
      {/* 顶部 */}
      <div className="text-center py-6 border-b border-white/10">
        <h1 className="display-title text-3xl">驿 站 商 店</h1>
        <p className="res-chip mt-2"><span className="text-[var(--gold-500)] text-[10px]">◆</span><span className="num text-[var(--gold-300)]">{gold}</span></p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* 可购买卡牌 */}
        <div className="section-label mb-4">— 购买卡牌 —</div>
        <div className="flex flex-wrap gap-6 mb-8 justify-center">
          {shopItems.map((item) => {
            const canAfford = gold >= item.cost && !!item.card;
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
        <div className="section-label mb-1">— 移除卡牌 —</div>
        <div className="flex items-center gap-3 mb-1 text-sm">
          <span className="text-[var(--gold-300)] num">◆ {removeCost}</span>
          {!canRemoveAny && (
            <span className="text-[#e88a84] text-xs">
              {gold < removeCost ? '(金币不足)' : `(卡组至少保留 ${DECK.MIN_SIZE} 张)`}
            </span>
          )}
        </div>
        <p className="text-[var(--text-muted)] text-xs mb-3">每次删除后价格会上涨；点击要删除的卡</p>
        <div className="flex flex-wrap gap-3 mb-6 justify-center">
          {masterDeck.map((card, i) => {
            const canRemove = canRemoveAny;
            return (
              <motion.div
                key={`${card.templateId}-${i}`}
                whileHover={canRemove ? { y: -4, scale: 1.05 } : {}}
                className={`relative ${canRemove ? 'cursor-pointer hover:ring-2 hover:ring-red-500 rounded-lg' : 'opacity-40'}`}
                onClick={() => canRemove && removeCard(i)}
                title={card.description}
              >
                <Card card={toDisplayInstance(card)} size="sm" />
                <div
                  className="absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: 'radial-gradient(circle, transparent 30%, rgba(239,68,68,0.35))' }}
                />
              </motion.div>
            );
          })}
        </div>
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
