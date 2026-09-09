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
    case AttackPattern.CHARGE_UP: return '⚡';
    case AttackPattern.FORTIFY: return '🛡️';
    case AttackPattern.DOUBLE_STRIKE: return '⚔⚔';
    case AttackPattern.ENRAGE: return '😠';
    case AttackPattern.WEAKEN: return '🌀';
    default: return '⚔';
  }
}

function getIntentTone(pattern: string): string {
  switch (pattern) {
    case AttackPattern.CHARGE_UP: return 'text-red-400 bg-red-950/80 border-red-400/60';
    case AttackPattern.FORTIFY: return 'text-blue-300 bg-blue-950/80 border-blue-400/50';
    case AttackPattern.ENRAGE: return 'text-orange-300 bg-orange-950/80 border-orange-400/50';
    case AttackPattern.WEAKEN: return 'text-purple-300 bg-purple-950/80 border-purple-400/50';
    default: return 'text-orange-300/80 bg-orange-500/10 border-orange-500/20';
  }
}

export function EnemyArea() {
  const enemy = useGameStore((s) => s.enemy);
  const phase = useGameStore((s) => s.phase);
  const hpPercent = (enemy.currentHp / enemy.maxHp) * 100;

  const isAttacking = phase === 'EXECUTE_PHASE2';
  const isBoss = enemy.isBoss ?? false;
  const isElite = enemy.isElite ?? false;

  return (
    <div className="flex flex-col items-center gap-1 py-1 w-full px-4">
      {/* 血量条 */}
      <div className={`${isBoss ? 'max-w-[864px]' : 'max-w-[432px]'} w-full flex items-center gap-3 mb-4`}>
        <div className="flex-1 h-4 rounded-full bg-gray-800 border border-gray-700 overflow-hidden relative">
          <motion.div
            className="h-full rounded-full bg-red-600"
            animate={{ width: `${hpPercent}%` }}
            transition={{ type: 'spring', stiffness: 100 }}
          />
          {/* Boss 二阶段标记线（50%） */}
          {isBoss && enemy.phase2Patterns && (
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-yellow-400/60" />
          )}
        </div>
        <span className="text-sm text-red-400 font-bold whitespace-nowrap text-shadow">
          {enemy.currentHp} / {enemy.maxHp}
          {enemy.armor > 0 && (
            <span className="text-blue-400 ml-2 text-shadow">🛡 {enemy.armor}</span>
          )}
        </span>
      </div>

      {/* 敌人图像（精英/Boss 皇冠标识） */}
      <motion.div
        className={`w-36 h-36 rounded-3xl flex items-center justify-center text-4xl overflow-hidden border-2 ${
          isBoss
            ? 'bg-gradient-to-br from-red-900/50 to-red-950/80 border-red-500/60'
            : isElite
            ? 'bg-gradient-to-br from-amber-900/50 to-red-950/80 border-amber-500/50'
            : 'bg-gradient-to-br from-red-900/50 to-red-950/80 border-red-500/30'
        }`}
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

      {/* 敌人名称 + 头衔 */}
      <motion.h2
        className="text-base font-bold text-red-400 tracking-wider mt-1 text-shadow-heavy"
        animate={isAttacking ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5 }}
      >
        {isBoss && '👑 '}{isElite && '🎖️ '}{enemy.name}
      </motion.h2>
      {(isBoss || isElite) && (
        <span className={`text-xs font-bold ${isBoss ? 'text-yellow-400' : 'text-amber-300'}`}>
          {isBoss ? 'BOSS' : '精英'}
        </span>
      )}

      {/* 结构化意图显示 */}
      {phase !== 'VICTORY' && phase !== 'DEFEAT' && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-1"
        >
          <div className={`text-sm flex items-center gap-1.5 px-3 py-1 rounded-lg border text-shadow ${getIntentTone(enemy.intent.pattern)}`}>
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
