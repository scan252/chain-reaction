import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { AttackPattern } from '../types';
import { Icon, type IconName } from './icons';

const INTENT_ICON: Record<string, IconName> = {
  [AttackPattern.SINGLE]: 'sword',
  [AttackPattern.AREA_SWEEP]: 'swords',
  [AttackPattern.SPREADING_FLAME]: 'flame',
  [AttackPattern.WEAK_POINT_SNIPE]: 'target',
  [AttackPattern.SPATIAL_LOCK]: 'lock',
  [AttackPattern.CHARGE_UP]: 'hourglass',
  [AttackPattern.FORTIFY]: 'shield',
  [AttackPattern.DOUBLE_STRIKE]: 'swords',
  [AttackPattern.ENRAGE]: 'burst',
  [AttackPattern.WEAKEN]: 'vortex',
};

/** 意图色调：描边 / 文字 / 底 */
function getIntentTone(pattern: string): { border: string; color: string; bg: string; glow: string } {
  switch (pattern) {
    case AttackPattern.CHARGE_UP:
      return { border: 'rgba(229,115,107,0.6)', color: '#f2a29b', bg: 'rgba(60,16,14,0.6)', glow: 'rgba(209,83,75,0.3)' };
    case AttackPattern.FORTIFY:
      return { border: 'rgba(126,166,216,0.55)', color: '#a9c6e8', bg: 'rgba(20,34,58,0.6)', glow: 'rgba(126,166,216,0.25)' };
    case AttackPattern.ENRAGE:
      return { border: 'rgba(251,146,60,0.55)', color: '#fbc090', bg: 'rgba(56,28,10,0.6)', glow: 'rgba(251,146,60,0.25)' };
    case AttackPattern.WEAKEN:
      return { border: 'rgba(196,168,238,0.55)', color: '#c4a8ee', bg: 'rgba(38,24,58,0.6)', glow: 'rgba(196,168,238,0.25)' };
    case AttackPattern.SPATIAL_LOCK:
      return { border: 'rgba(196,168,238,0.55)', color: '#c4a8ee', bg: 'rgba(38,24,58,0.6)', glow: 'rgba(196,168,238,0.25)' };
    default:
      return { border: 'rgba(229,115,107,0.4)', color: '#eda9a2', bg: 'rgba(48,14,12,0.5)', glow: 'rgba(209,83,75,0.2)' };
  }
}

export function EnemyArea() {
  const enemy = useGameStore((s) => s.enemy);
  const phase = useGameStore((s) => s.phase);
  const hpPercent = Math.max(0, (enemy.currentHp / enemy.maxHp) * 100);

  const isAttacking = phase === 'EXECUTE_PHASE2';
  const isBoss = enemy.isBoss ?? false;
  const isElite = enemy.isElite ?? false;
  const tone = getIntentTone(enemy.intent.pattern);

  const auraColor = isBoss ? 'rgba(209,83,75,0.35)' : isElite ? 'rgba(200,162,78,0.3)' : 'rgba(120,90,180,0.22)';
  const frameSize = isBoss ? 'w-44 h-44' : 'w-36 h-36';

  return (
    <div className="flex flex-col items-center gap-1.5 py-1 w-full px-4">
      {/* ===== 蚀刻血条 ===== */}
      <div className={`${isBoss ? 'max-w-[880px]' : 'max-w-[520px]'} w-full mb-1`}>
        <div className="flex items-center gap-3">
          <span className="shrink-0" style={{ color: '#e5736b' }}>
            <Icon name="heart" size={15} />
          </span>
          <div className="etch-bar etch-bar-lg flex-1">
            <motion.div
              className="fill fill-enemy"
              animate={{ width: `${hpPercent}%` }}
              transition={{ type: 'spring', stiffness: 90, damping: 20 }}
            />
            <div className="ticks" />
            {/* Boss 二阶段标记线（50%） */}
            {isBoss && enemy.phase2Patterns && (
              <div className="absolute top-[-2px] bottom-[-2px] left-1/2 w-[2px]" style={{ background: 'rgba(217,184,105,0.7)', boxShadow: '0 0 6px rgba(217,184,105,0.6)' }} />
            )}
          </div>
          <span className="num text-sm font-black whitespace-nowrap text-shadow-sm" style={{ color: '#f2a29b' }}>
            {enemy.currentHp}<span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}> / {enemy.maxHp}</span>
          </span>
          {enemy.armor > 0 && (
            <span className="num inline-flex items-center gap-1 text-sm font-black whitespace-nowrap" style={{ color: '#a9c6e8' }}>
              <Icon name="shield" size={14} />{enemy.armor}
            </span>
          )}
        </div>
      </div>

      {/* ===== 敌人展台 ===== */}
      <div className="relative flex flex-col items-center">
        {/* 台座辉光 */}
        <div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-[50%] pointer-events-none"
          style={{
            width: isBoss ? 260 : 200,
            height: 34,
            background: `radial-gradient(ellipse, ${auraColor} 0%, transparent 68%)`,
            filter: 'blur(2px)',
          }}
        />
        {/* 背光 */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none breathe"
          style={{
            width: isBoss ? 240 : 190,
            height: isBoss ? 240 : 190,
            background: `radial-gradient(circle, ${auraColor} 0%, transparent 62%)`,
          }}
        />

        {/* 肖像框 */}
        <motion.div
          className={`${frameSize} relative rounded-2xl overflow-hidden`}
          style={{
            border: `1.5px solid ${isBoss ? 'rgba(229,115,107,0.65)' : isElite ? 'rgba(200,162,78,0.55)' : 'rgba(168,182,214,0.3)'}`,
            boxShadow: `0 10px 34px rgba(3,4,8,0.65), 0 0 26px ${auraColor}`,
          }}
          animate={
            phase === 'EXECUTE_PHASE1'
              ? { x: [0, -3, 3, -2, 2, 0] }
              : isAttacking
              ? { scale: [1, 1.12, 1], y: [0, -5, 0] }
              : {}
          }
          transition={{ duration: 0.4 }}
        >
          {enemy.image ? (
            <img src={enemy.image} alt={enemy.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #232c47, #131829)', color: '#e5736b' }}>
              <Icon name="skull" size={44} strokeWidth={1.4} />
            </div>
          )}
          {/* 框内压暗下角，让名字牌融入 */}
          <div className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: 'linear-gradient(180deg, transparent, rgba(5,6,11,0.75))' }} />
        </motion.div>

        {/* 阶级徽章 */}
        {(isBoss || isElite) && (
          <div
            className="absolute -top-3 z-10 flex items-center gap-1 rounded-full px-2.5 py-[3px] text-[10px] font-black tracking-[0.2em]"
            style={
              isBoss
                ? { color: '#f6e3b2', background: 'linear-gradient(180deg, #6d1f1a, #42100d)', border: '1px solid rgba(229,115,107,0.7)', boxShadow: '0 0 14px rgba(209,83,75,0.5)' }
                : { color: '#f0dfae', background: 'linear-gradient(180deg, #4a3a14, #2c2109)', border: '1px solid rgba(200,162,78,0.65)', boxShadow: '0 0 14px rgba(200,162,78,0.4)' }
            }
          >
            <Icon name={isBoss ? 'crown' : 'skull'} size={11} strokeWidth={2.2} />
            {isBoss ? 'BOSS' : '精英'}
          </div>
        )}

        {/* 敌人名 */}
        <motion.h2
          className="mt-2 text-[17px] font-bold tracking-[0.3em] text-shadow-heavy"
          style={{ color: '#f0d9d6', textIndent: '0.3em' }}
          animate={isAttacking ? { scale: [1, 1.08, 1] } : {}}
          transition={{ duration: 0.5 }}
        >
          {enemy.name}
        </motion.h2>
      </div>

      {/* ===== 意图牌 ===== */}
      {phase !== 'VICTORY' && phase !== 'DEFEAT' && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-1.5"
        >
          <div
            className="flex items-center gap-2 px-3.5 py-[6px] rounded-lg text-[13px] font-semibold text-shadow-sm"
            style={{
              color: tone.color,
              background: tone.bg,
              border: `1px solid ${tone.border}`,
              boxShadow: `0 2px 12px rgba(3,4,8,0.5), 0 0 12px ${tone.glow}`,
            }}
          >
            <Icon name={INTENT_ICON[enemy.intent.pattern] ?? 'sword'} size={15} strokeWidth={2} />
            <span>{enemy.intent.description}</span>
          </div>
          {enemy.intent.lockedSlots.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: '#c4a8ee' }}>
              <Icon name="lock" size={11} />
              <span>禁锢槽位 {enemy.intent.lockedSlots.map((s) => s + 1).join(' · ')}</span>
            </div>
          )}
        </motion.div>
      )}

      {phase === 'VICTORY' && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="display-title text-2xl tracking-[0.4em]"
        >
          胜 利
        </motion.div>
      )}

      {phase === 'DEFEAT' && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-2xl font-black tracking-[0.4em]"
          style={{ color: '#b3504a', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}
        >
          战 败
        </motion.div>
      )}
    </div>
  );
}
