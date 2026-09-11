import { motion } from 'framer-motion';
import { useRunStore } from '../store/runStore';
import { Card } from './Card';
import { Icon, type IconName } from './icons';
import { RELICS } from '../types';

interface GameEndScreenProps {
  isVictory?: boolean;
}

function StatCell({ icon, value, label, accent }: { icon: IconName; value: number | string; label: string; accent: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1" style={{ color: accent }}>
        <Icon name={icon} size={15} />
        <span className="num text-[26px] font-black leading-none">{value}</span>
      </div>
      <div className="etch-label" style={{ letterSpacing: '0.2em' }}>{label}</div>
    </div>
  );
}

export function GameEndScreen({ isVictory = true }: GameEndScreenProps) {
  const playerProfile = useRunStore((s) => s.playerProfile);
  const gameStats = useRunStore((s) => s.gameStats);
  const masterDeck = useRunStore((s) => s.masterDeck);
  const relics = useRunStore((s) => s.relics);
  const startNewRun = useRunStore((s) => s.startNewRun);
  const returnToTitle = useRunStore((s) => s.returnToTitle);

  const handleRestart = () => {
    if (isVictory) {
      returnToTitle();
    } else {
      startNewRun();
    }
  };

  return (
    <div className={`scene vignette grain flex flex-col min-h-screen px-4 py-10 overflow-y-auto ${isVictory ? 'scene-aurora' : ''}`}>
      <div className="my-auto flex flex-col items-center w-full pb-20">
      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center mb-6"
      >
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="hairline-gold w-14" />
          <span className="section-label">{isVictory ? 'EXPEDITION COMPLETE' : 'EXPEDITION FAILED'}</span>
          <span className="hairline-gold w-14" />
        </div>
        <h1 className={`display-title text-5xl ${isVictory ? '' : 'opacity-50 saturate-50'}`}>
          {isVictory ? '冒险胜利' : '冒险失败'}
        </h1>
        <p className="text-sm tracking-[0.2em] mt-3" style={{ color: 'var(--text-secondary)' }}>
          {playerProfile?.name} 的征程已画上句号
        </p>
      </motion.div>

      {/* 战斗统计 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 w-full max-w-2xl panel p-6 mb-5"
      >
        <div className="flex items-center justify-center gap-2.5 mb-5">
          <span style={{ color: 'var(--brass-400)' }}><Icon name="scroll" size={15} /></span>
          <h2 className="text-base font-black tracking-[0.3em]" style={{ color: 'var(--brass-200)' }}>战斗统计</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCell icon="sword" value={gameStats.totalDamage} label="总伤害" accent="#f2a29b" />
          <StatCell icon="shield" value={gameStats.totalArmor} label="总护盾" accent="#a9c6e8" />
          <StatCell icon="check" value={gameStats.effectiveArmor} label="有效护盾" accent="#7decdc" />
          <StatCell icon="skull" value={gameStats.defeatedEnemies.length} label="击败敌人" accent="#e6cc8b" />
        </div>

        {gameStats.defeatedEnemies.length > 0 && (
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--line-soft)' }}>
            <h3 className="etch-label mb-2.5" style={{ letterSpacing: '0.22em' }}>击败的敌人</h3>
            <div className="flex flex-wrap gap-2">
              {gameStats.defeatedEnemies.map((enemy, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
                  style={{ color: 'var(--text-secondary)', background: 'rgba(168,182,214,0.07)', border: '1px solid var(--line-soft)' }}
                >
                  <Icon name="swords" size={10} style={{ color: 'var(--text-muted)' }} />
                  {enemy}
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* 遗物 */}
      {relics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative z-10 w-full max-w-2xl panel p-6 mb-5"
        >
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <span style={{ color: 'var(--brass-400)' }}><Icon name="star" size={15} /></span>
            <h2 className="text-base font-black tracking-[0.3em]" style={{ color: 'var(--brass-200)' }}>收集的遗物</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {relics.map((relicId) => {
              const relic = RELICS[relicId];
              return (
                <div
                  key={relicId}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl w-[76px]"
                  style={{ background: 'rgba(200,162,78,0.06)', border: '1px solid var(--line-brass-soft)' }}
                >
                  <div className="text-2xl">{relic.icon}</div>
                  <div className="text-[11px] font-bold text-center leading-tight" style={{ color: 'var(--brass-200)' }}>{relic.name}</div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* 最终卡组 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 w-full max-w-4xl panel p-6 mb-6"
      >
        <div className="flex items-center justify-center gap-2.5 mb-4">
          <span style={{ color: 'var(--arc-400)' }}><Icon name="deck" size={15} /></span>
          <h2 className="text-base font-black tracking-[0.3em]" style={{ color: 'var(--brass-200)' }}>
            最终卡组<span className="num text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>（{masterDeck.length} 张）</span>
          </h2>
        </div>
        <div className="flex flex-wrap justify-center gap-2.5 max-h-64 overflow-y-auto p-1">
          {masterDeck.map((card, index) => (
            <motion.div
              key={`${card.templateId}-${index}`}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + index * 0.02 }}
            >
              <Card card={card} size="sm" />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 按钮 */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={handleRestart}
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-30 btn btn-xl shadow-2xl ${isVictory ? 'btn-primary' : 'btn-secondary'}`}
      >
        {isVictory ? '再次冒险' : '重新开始'}
      </motion.button>
      </div>
    </div>
  );
}
