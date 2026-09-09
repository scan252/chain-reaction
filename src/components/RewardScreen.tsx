import { motion } from 'framer-motion';
import { useRunStore } from '../store/runStore';
import { Card } from './Card';
import type { CardInstance, CardTemplate } from '../types';

export function RewardScreen() {
  const pendingReward = useRunStore((s) => s.pendingReward);
  const rewardCardCollected = useRunStore((s) => s.rewardCardCollected);
  const collectRewardCard = useRunStore((s) => s.collectRewardCard);
  const collectBonusSlot = useRunStore((s) => s.collectBonusSlot);
  const skipReward = useRunStore((s) => s.skipReward);
  const proceedToMap = useRunStore((s) => s.proceedToMap);

  if (!pendingReward) return null;

  // 将 CardTemplate 转换为 CardInstance 用于展示
  const toDisplayInstance = (card: CardTemplate): CardInstance => ({
    ...card,
    uuid: card.templateId,
  });

  return (
    <div
      className="flex flex-col items-center justify-center h-screen px-4"
      style={{
        backgroundImage: 'url(/pic/P2.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* 标题 */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8"
      >
        <h1 className="display-title text-4xl mb-3">战斗胜利</h1>
        <p className="text-[15px] text-[var(--gold-300)] tracking-wider">
          获得 <span className="text-yellow-400 font-bold">{pendingReward.gold}</span> 💰 金币
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-2 tracking-[0.2em]">
          卡牌奖励 {pendingReward.currentRound} / {pendingReward.totalRounds}
        </p>
      </motion.div>

      {/* 卡牌奖励 */}
      {!rewardCardCollected ? (
        <>
          <p className="section-label mb-4">
            第 {pendingReward.currentRound} 轮 - 选择一张卡牌加入牌组：
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-6 px-2">
            {pendingReward.cards.map((rc, i) => (
              <motion.div
                key={rc.card.templateId + i}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -10, scale: 1.05 }}
                onClick={() => collectRewardCard(rc.card.templateId)}
                className="cursor-pointer relative"
              >
                {rc.card.rarity !== 'COMMON' && (
                  <div
                    className="absolute -inset-1 rounded-xl border-2 animate-pulse pointer-events-none z-10"
                    style={{ borderColor: rc.card.rarity === 'RARE' ? '#c084fc' : '#38bdf8' }}
                  />
                )}
                <Card card={toDisplayInstance(rc.card)} size="md" />
                {rc.card.rarity === 'RARE' && (
                  <span className="absolute -top-2 -right-2 text-[10px] bg-purple-500 text-white px-1.5 py-0.5 rounded-full font-bold z-20">
                    稀有
                  </span>
                )}
                {rc.card.rarity === 'UNCOMMON' && (
                  <span className="absolute -top-2 -right-2 text-[10px] bg-sky-500 text-white px-1.5 py-0.5 rounded-full font-bold z-20">
                    罕见
                  </span>
                )}
              </motion.div>
            ))}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={skipReward}
            className="text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer"
          >
            跳过卡牌奖励（+8 💰）
          </motion.button>
        </>
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-green-400 text-sm mb-4"
        >
          已完成 {pendingReward.totalRounds} 轮卡牌选择
        </motion.p>
      )}

      {/* 特殊奖励：+1 序列槽 */}
      {pendingReward.bonusSlot && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={collectBonusSlot}
            className="px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 text-black shadow-lg shadow-yellow-500/30 border-2 border-yellow-300/50 cursor-pointer"
          >
            ✨ 获得 +1 序列槽 ✨
          </motion.button>
        </motion.div>
      )}

      {/* 继续按钮 */}
      {rewardCardCollected && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={proceedToMap}
          className="mt-8 px-8 py-3 rounded-lg font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 cursor-pointer"
        >
          继续冒险
        </motion.button>
      )}
    </div>
  );
}
