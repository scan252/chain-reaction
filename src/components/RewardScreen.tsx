import { motion } from 'framer-motion';
import { useRunStore } from '../store/runStore';
import { Card } from './Card';
import { Icon } from './icons';
import { RARITY_META } from '../types';

export function RewardScreen() {
  const pendingReward = useRunStore((s) => s.pendingReward);
  const rewardCardCollected = useRunStore((s) => s.rewardCardCollected);
  const collectRewardCard = useRunStore((s) => s.collectRewardCard);
  const collectBonusSlot = useRunStore((s) => s.collectBonusSlot);
  const skipReward = useRunStore((s) => s.skipReward);
  const proceedToMap = useRunStore((s) => s.proceedToMap);

  if (!pendingReward) return null;

  return (
    <div className="scene scene-aurora vignette grain flex flex-col items-center justify-center h-screen px-4">
      {/* 标题 */}
      <motion.div
        initial={{ y: -26, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 text-center mb-7"
      >
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="hairline-gold w-14" />
          <span className="section-label">VICTORY SPOILS</span>
          <span className="hairline-gold w-14" />
        </div>
        <h1 className="display-title text-4xl mb-3">战斗胜利</h1>
        <p className="inline-flex items-center gap-1.5 text-[15px] tracking-wider" style={{ color: 'var(--brass-300)' }}>
          获得 <span className="num font-black text-[17px]">{pendingReward.gold}</span>
          <Icon name="coin" size={15} />
          金币
        </p>
        <p className="etch-label mt-2.5" style={{ letterSpacing: '0.24em' }}>
          卡牌奖励 {pendingReward.currentRound} / {pendingReward.totalRounds}
        </p>
      </motion.div>

      {/* 卡牌奖励 */}
      {!rewardCardCollected ? (
        <>
          <p className="relative z-10 section-label mb-5" style={{ fontSize: 11 }}>
            第 {pendingReward.currentRound} 轮 · 选择一张卡牌加入牌组
          </p>
          <div className="relative z-10 flex flex-wrap justify-center gap-5 sm:gap-7 mb-6 px-2">
            {pendingReward.cards.map((rc, i) => {
              const rarity = RARITY_META[rc.card.rarity];
              return (
                <motion.div
                  key={rc.card.templateId + i}
                  initial={{ y: 56, opacity: 0, rotate: i === 0 ? -4 : i === 2 ? 4 : 0 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.15 + i * 0.14, type: 'spring', stiffness: 220, damping: 20 }}
                  whileHover={{ y: -12, scale: 1.06, transition: { duration: 0.18 } }}
                  onClick={() => collectRewardCard(rc.card.templateId)}
                  className="cursor-pointer relative"
                >
                  {rc.card.rarity !== 'COMMON' && (
                    <div
                      className="absolute -inset-1.5 rounded-xl pointer-events-none z-10 breathe"
                      style={{ border: `1.5px solid ${rarity.color}`, boxShadow: `0 0 18px ${rarity.glow}` }}
                    />
                  )}
                  <Card card={rc.card} size="lg" />
                  {rc.card.rarity !== 'COMMON' && (
                    <span
                      className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-1 text-[10px] px-2 py-[2px] rounded-full font-bold whitespace-nowrap"
                      style={{
                        color: rarity.color,
                        background: 'rgba(8,10,17,0.92)',
                        border: `1px solid ${rarity.color}`,
                      }}
                    >
                      <Icon name="gem" size={9} />
                      {rarity.label}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={skipReward}
            className="relative z-10 btn btn-ghost btn-sm inline-flex items-center gap-1.5"
          >
            跳过卡牌奖励
            <span className="inline-flex items-center gap-1" style={{ color: 'var(--brass-400)' }}>
              +8 <Icon name="coin" size={11} />
            </span>
          </motion.button>
        </>
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 inline-flex items-center gap-2 text-sm font-bold mb-4"
          style={{ color: 'var(--verd-400)' }}
        >
          <Icon name="check" size={15} />
          已完成 {pendingReward.totalRounds} 轮卡牌选择
        </motion.p>
      )}

      {/* 特殊奖励：+1 序列槽 */}
      {pendingReward.bonusSlot && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 18 }}
          className="relative z-10 mt-5"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={collectBonusSlot}
            className="btn btn-primary btn-xl breathe"
            style={{ boxShadow: '0 6px 30px rgba(200,162,78,0.45), inset 0 1px 0 rgba(255,255,255,0.5)' }}
          >
            <Icon name="gem" size={17} />
            获得 +1 序列槽
          </motion.button>
        </motion.div>
      )}

      {/* 继续按钮 */}
      {rewardCardCollected && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={proceedToMap}
          className="relative z-10 btn btn-arc btn-xl mt-8"
        >
          继续冒险
          <Icon name="arrow" size={17} strokeWidth={2.4} />
        </motion.button>
      )}
    </div>
  );
}
