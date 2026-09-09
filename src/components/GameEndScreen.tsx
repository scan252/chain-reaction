import { motion } from 'framer-motion';
import { useRunStore } from '../store/runStore';
import { Card } from './Card';
import { RELICS } from '../types';

interface GameEndScreenProps {
  isVictory?: boolean;
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
      // 胜利后返回主页面
      returnToTitle();
    } else {
      // 失败后重新开始（保持原有逻辑）
      startNewRun();
    }
  };

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen px-4 py-8 overflow-y-auto"
      style={{
        backgroundImage: 'url(/pic/P4_opacity_65.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h1 className={`display-title text-4xl ${isVictory ? '' : 'opacity-60'}`}>
          {isVictory ? '冒险胜利' : '冒险失败'}
        </h1>
        <p className="text-[var(--text-secondary)] text-sm tracking-wider mt-2">
          {playerProfile?.name} 的征程已画上句号
        </p>
      </motion.div>

      {/* 统计数据 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-6"
      >
        <h2 className="text-xl font-bold text-white mb-4 text-center">📊 战斗统计</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-400">{gameStats.totalDamage}</div>
            <div className="text-xs text-white/50">总造成伤害</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400">{gameStats.totalArmor}</div>
            <div className="text-xs text-white/50">总生成护盾</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-cyan-400">{gameStats.effectiveArmor}</div>
            <div className="text-xs text-white/50">有效护盾</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400">{gameStats.defeatedEnemies.length}</div>
            <div className="text-xs text-white/50">击败敌人</div>
          </div>
        </div>

        {/* 击败的敌人列表 */}
        {gameStats.defeatedEnemies.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <h3 className="text-sm font-bold text-white/70 mb-2">⚔️ 击败的敌人</h3>
            <div className="flex flex-wrap gap-2">
              {gameStats.defeatedEnemies.map((enemy, index) => (
                <span
                  key={index}
                  className="px-2 py-1 rounded-full bg-white/10 text-white/80 text-xs"
                >
                  {enemy}
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* 遗物展示 */}
      {relics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-6"
        >
          <h2 className="text-xl font-bold text-white mb-4 text-center">🏆 收集的遗物</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {relics.map((relicId) => {
              const relic = RELICS[relicId];
              return (
                <div
                  key={relicId}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="text-2xl">{relic.icon}</div>
                  <div className="text-xs font-bold text-white text-center">{relic.name}</div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* 卡组构筑 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-4xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-6"
      >
        <h2 className="text-xl font-bold text-white mb-4 text-center">🃏 最终卡组 ({masterDeck.length}张)</h2>
        <div className="flex flex-wrap justify-center gap-2 max-h-64 overflow-y-auto p-2">
          {masterDeck.map((card, index) => (
            <motion.div
              key={`${card.templateId}-${index}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + index * 0.02 }}
            >
              <Card card={{ ...card, uuid: `end-${index}` }} size="sm" />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 重新开始按钮 */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleRestart}
        className={`btn btn-xl ${isVictory ? 'btn-primary' : 'btn-secondary'}`}
      >
        {isVictory ? '再次冒险' : '重新开始'}
      </motion.button>
    </div>
  );
}
