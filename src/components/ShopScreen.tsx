import { motion } from 'framer-motion';
import { useRunStore } from '../store/runStore';
import { Card } from './Card';
import { Icon } from './icons';
import { DECK } from '../config/balance';

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
    <div className="scene scene-aurora vignette flex flex-col h-screen overflow-hidden">
      {/* 顶部 */}
      <div
        className="relative z-10 text-center py-4"
        style={{
          background: 'linear-gradient(180deg, rgba(14,18,32,0.9), rgba(10,13,22,0.82))',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className="flex items-center justify-center gap-3 mb-1.5">
          <span className="hairline-gold w-14" />
          <span className="section-label">WAYPOINT BAZAAR</span>
          <span className="hairline-gold w-14" />
        </div>
        <h1 className="display-title text-3xl">驿站商店</h1>
        <p className="res-chip mt-2.5" style={{ color: 'var(--brass-300)' }}>
          <Icon name="coin" size={13} />
          <span className="num text-[15px] font-black">{gold}</span>
        </p>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 py-5">
        {/* 货架 */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <span style={{ color: 'var(--brass-400)' }}><Icon name="shop" size={15} /></span>
          <span className="section-label" style={{ fontSize: 11 }}>本 日 货 架</span>
        </div>
        <div className="flex flex-wrap gap-7 mb-10 justify-center">
          {shopItems.map((item, i) => {
            const canAfford = gold >= item.cost && !!item.card;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={canAfford ? { y: -7, scale: 1.04 } : {}}
                className={`relative ${!canAfford ? 'opacity-35 saturate-50' : 'cursor-pointer'}`}
                onClick={() => canAfford && buyCard(item.id)}
                title={canAfford ? '点击购买' : '金币不足'}
              >
                {item.card && <Card card={item.card} size="lg" />}
                <div
                  className="mx-auto mt-2.5 w-fit flex items-center gap-1.5 px-3 py-1 rounded-full num text-[13px] font-black"
                  style={
                    canAfford
                      ? { color: 'var(--brass-300)', background: 'rgba(200,162,78,0.1)', border: '1px solid var(--line-brass-soft)' }
                      : { color: 'var(--text-faint)', background: 'rgba(14,18,32,0.6)', border: '1px solid var(--line-soft)' }
                  }
                >
                  <Icon name="coin" size={12} />
                  {item.cost}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 移除卡牌 */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <span style={{ color: '#e5736b' }}><Icon name="trash" size={14} /></span>
          <span className="section-label" style={{ fontSize: 11 }}>剔 除 卡 牌</span>
          <span className="res-chip" style={{ color: 'var(--brass-300)', height: 24 }}>
            <Icon name="coin" size={11} />
            <span className="num">{removeCost}</span>
          </span>
          {!canRemoveAny && (
            <span className="text-xs" style={{ color: '#e5736b' }}>
              {gold < removeCost ? '（金币不足）' : `（卡组至少保留 ${DECK.MIN_SIZE} 张）`}
            </span>
          )}
        </div>
        <p className="text-center text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          每次剔除后价格会上涨 · 点击要剔除的卡
        </p>
        <div className="flex flex-wrap gap-2 sm:gap-2.5 mb-6 justify-center max-w-6xl mx-auto">
          {masterDeck.map((card, i) => (
            <motion.div
              key={`${card.templateId}-${i}`}
              whileHover={canRemoveAny ? { y: -4, scale: 1.05 } : {}}
              className={`relative rounded-lg ${canRemoveAny ? 'cursor-pointer' : 'opacity-35 saturate-50'}`}
              onClick={() => canRemoveAny && removeCard(i)}
              title={canRemoveAny ? `剔除「${card.name}」` : card.description}
            >
              <Card card={card} size="sm" />
              {canRemoveAny && (
                <div
                  className="absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center"
                  style={{ background: 'radial-gradient(circle, transparent 25%, rgba(209,83,75,0.4))' }}
                >
                  <span style={{ color: '#f2a29b' }}><Icon name="trash" size={22} /></span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* 离开 */}
      <div
        className="relative z-10 text-center py-4"
        style={{
          background: 'linear-gradient(180deg, rgba(10,13,22,0.82), rgba(14,18,32,0.9))',
          borderTop: '1px solid var(--line)',
        }}
      >
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={leaveShop}
          className="btn btn-secondary btn-xl"
        >
          离开商店
          <Icon name="arrow" size={16} strokeWidth={2.4} />
        </motion.button>
      </div>
    </div>
  );
}
