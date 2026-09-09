import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { AttackPattern } from '../types';

function getIntentIcon(pattern: string): string {
  switch (pattern) {
    case AttackPattern.SINGLE: return '⚔';
    case AttackPattern.AREA_SWEEP: return '⚔';
    case AttackPattern.SPREADING_FLAME: return '🔥';
    case AttackPattern.WEAK_POINT_SNIPE: return '🎯';
    case AttackPattern.SPATIAL_LOCK: return '🔒';
    default: return '⚔';
  }
}

export function EnemyArea() {
  const enemy = useGameStore((s) => s.enemy);
  const phase = useGameStore((s) => s.phase);
  const hpPercent = (enemy.currentHp / enemy.maxHp) * 100;

  const isAttacking = phase === 'EXECUTE_PHASE2';
  // Boss 由节点类型显式标记
  const isBoss = enemy.isBoss ?? false;

  return (
    <div className="flex flex-col items-center gap-2 py-3 w-full px-4">
      {/* 血量条 - Boss 时加长一倍（自适应窄屏） */}
      <div className={`${isBoss ? 'max-w-[864px]' : 'max-w-[432px]'} w-full flex items-center gap-3 mb-4`}>
        <div className="flex-1 h-4 rounded-full bg-gray-800 border border-gray-700 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-red-600"
            animate={{ width: `${hpPercent}%` }}
            transition={{ type: 'spring', stiffness: 100 }}
          />
        </div>
        <span className="text-sm text-red-400 font-bold whitespace-nowrap text-shadow">
          {enemy.currentHp} / {enemy.maxHp}
          {enemy.armor > 0 && (
            <span className="text-blue-400 ml-2 text-shadow">🛡 {enemy.armor}</span>
          )}
        </span>
      </div>

      {/* Boss 占位图 */}
      <motion.div
        className="w-36 h-36 rounded-3xl bg-gradient-to-br from-red-900/50 to-red-950/80 border-2 border-red-500/30 flex items-center justify-center text-6xl overflow-hidden"
        animate={
          phase === 'EXECUTE_PHASE1'
            ? { x: [0, -3, 3, -2, 2, 0] }
            : isAttacking
            ? { scale: [1, 1.15, 1], y: [0, -5, 0] }
            : {}
        }
        transition={{ duration: 0.4 }}
      >
        {enemy.image ? (
          <img src={enemy.image} alt={enemy.name} className="w-full h-full object-cover" />
        ) : (
          enemy.emoji
        )}
      </motion.div>

      {/* 敌人名称 - 位于怪物图像下方 */}
      <motion.h2
        className="text-lg font-bold text-red-400 tracking-wider mt-2 text-shadow-heavy"
        animate={isAttacking ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5 }}
      >
        {enemy.name}
      </motion.h2>

      {/* 结构化意图显示 */}
      {phase !== 'VICTORY' && phase !== 'DEFEAT' && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-1"
        >
          <div className="text-sm text-orange-300/80 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-shadow">
            <span className="text-base">{getIntentIcon(enemy.intent.pattern)}</span>
            <span>{enemy.intent.description}</span>
          </div>
          {enemy.intent.lockedSlots.length > 0 && (
            <div className="text-xs text-purple-300/80 flex items-center gap-1 text-shadow-sm">
              <span>🔒</span>
              <span>禁锢槽位: {enemy.intent.lockedSlots.map((s) => s + 1).join(', ')}</span>
            </div>
          )}
        </motion.div>
      )}

      {phase === 'VICTORY' && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-xl font-bold text-yellow-400 text-shadow-heavy"
        >
          胜利！
        </motion.div>
      )}

      {phase === 'DEFEAT' && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-xl font-bold text-red-500 text-shadow-heavy"
        >
          战败...
        </motion.div>
      )}
    </div>
  );
}
