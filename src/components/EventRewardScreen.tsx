import { motion } from 'framer-motion';
import { useRunStore } from '../store/runStore';
import type { EventReward } from '../types';

export function EventRewardScreen() {
  const pendingEventRewards = useRunStore((s) => s.pendingEventRewards);
  const eventRewardCollected = useRunStore((s) => s.eventRewardCollected);
  const collectEventReward = useRunStore((s) => s.collectEventReward);
  const skipEventReward = useRunStore((s) => s.skipEventReward);
  const proceedToMap = useRunStore((s) => s.proceedToMap);

  const handleSelectReward = (rewardType: EventReward['type']) => {
    collectEventReward(rewardType);
  };

  const handleSkip = () => {
    skipEventReward();
  };

  const handleContinue = () => {
    proceedToMap();
  };

  if (!pendingEventRewards) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-8 max-w-4xl w-full mx-4 border border-white/10"
      >
        <h2 className="display-title text-3xl text-center mb-2">神秘奖励</h2>
        <p className="text-xs text-[var(--text-muted)] text-center mb-8 tracking-[0.25em]">选择一份奖励继续前进</p>

        {!eventRewardCollected ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {pendingEventRewards.map((reward, index) => (
                <motion.button
                  key={reward.type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectReward(reward.type)}
                  className="bg-gradient-to-b from-indigo-700 to-indigo-900 rounded-xl p-6 border border-indigo-500/30 hover:border-indigo-400/50 transition-all text-left group"
                >
                  <div className="text-4xl mb-3 text-center">{reward.icon}</div>
                  <div className="text-white font-bold text-lg mb-2 text-center">{reward.name}</div>
                  <div className="text-white/60 text-sm text-center">{reward.description}</div>
                </motion.button>
              ))}
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleSkip}
                className="px-6 py-2 text-white/50 hover:text-white/80 transition-colors text-sm"
              >
                跳过奖励
              </button>
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <div className="text-5xl mb-4">🎁</div>
            <p className="text-white text-xl mb-6">奖励已领取！</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleContinue}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-500 rounded-xl text-white font-bold shadow-lg shadow-green-500/30"
            >
              继续旅程
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
