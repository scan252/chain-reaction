import { motion } from 'framer-motion';
import { useRunStore } from '../store/runStore';
import { Icon, type IconName } from './icons';
import type { EventReward } from '../types';

/** 事件奖励 → 符文图标 */
const REWARD_ICON: Record<string, IconName> = {
  GOLD_100: 'coin',
  HEAL_20_MP_1: 'heart',
  RANDOM_RELIC: 'star',
};

function rewardIcon(reward: EventReward): IconName {
  return REWARD_ICON[reward.type] ?? 'gift';
}

export function EventRewardScreen() {
  const pendingEventRewards = useRunStore((s) => s.pendingEventRewards);
  const eventRewardCollected = useRunStore((s) => s.eventRewardCollected);
  const collectEventReward = useRunStore((s) => s.collectEventReward);
  const skipEventReward = useRunStore((s) => s.skipEventReward);
  const proceedToMap = useRunStore((s) => s.proceedToMap);

  if (!pendingEventRewards) return null;

  return (
    <div className="fixed inset-0 overlay flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="panel panel-gold corner-orn p-8 max-w-4xl w-full mx-4"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="hairline-gold w-12" />
          <span className="section-label">ARCANE FIND</span>
          <span className="hairline-gold w-12" />
        </div>
        <h2 className="display-title text-3xl text-center mb-2">神秘奖励</h2>
        <p className="etch-label text-center mb-8" style={{ letterSpacing: '0.26em' }}>选择一份奖励继续前进</p>

        {!eventRewardCollected ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {pendingEventRewards.map((reward, index) => (
                <motion.button
                  key={reward.type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => collectEventReward(reward.type)}
                  className="panel flex flex-col items-center p-6 group cursor-pointer transition-colors"
                  style={{ borderColor: 'rgba(125,236,220,0.25)' }}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                    style={{
                      color: '#7decdc',
                      background: 'radial-gradient(circle at 50% 35%, rgba(43,194,174,0.2), rgba(43,194,174,0.05))',
                      border: '1.5px solid rgba(43,194,174,0.45)',
                      boxShadow: '0 0 18px rgba(43,194,174,0.2)',
                    }}
                  >
                    <Icon name={rewardIcon(reward)} size={24} strokeWidth={1.7} />
                  </div>
                  <div className="font-black text-[16px] tracking-[0.12em] mb-1.5" style={{ color: 'var(--text-primary)' }}>{reward.name}</div>
                  <div className="text-[12.5px] leading-relaxed text-center" style={{ color: 'var(--text-secondary)' }}>{reward.description}</div>
                </motion.button>
              ))}
            </div>

            <div className="flex justify-center">
              <button onClick={skipEventReward} className="btn btn-ghost btn-sm">
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
            <div
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{
                color: '#7decdc',
                background: 'radial-gradient(circle at 50% 35%, rgba(43,194,174,0.22), rgba(43,194,174,0.06))',
                border: '1.5px solid rgba(43,194,174,0.5)',
                boxShadow: '0 0 24px rgba(43,194,174,0.3)',
              }}
            >
              <Icon name="check" size={28} strokeWidth={2.4} />
            </div>
            <p className="text-lg font-bold mb-6" style={{ color: 'var(--text-primary)' }}>奖励已领取</p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={proceedToMap}
              className="btn btn-arc btn-xl"
            >
              继续旅程
              <Icon name="arrow" size={16} strokeWidth={2.4} />
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
