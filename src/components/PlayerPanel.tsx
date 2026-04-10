import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { useRunStore } from '../store/runStore';
import { StatusEffectType, PlayerClass } from '../types';

const CLASS_NAMES: Record<PlayerClass, string> = {
  WARRIOR: '勇士',
  PRIEST: '牧师',
};

const CLASS_ICONS: Record<PlayerClass, string> = {
  WARRIOR: '⚔️',
  PRIEST: '✨',
};

export function PlayerPanel() {
  const playerHp = useGameStore((s) => s.playerHp);
  const playerMaxHp = useGameStore((s) => s.playerMaxHp);
  const turnNumber = useGameStore((s) => s.turnNumber);
  const playerStatusEffects = useGameStore((s) => s.playerStatusEffects);
  
  const playerProfile = useRunStore((s) => s.playerProfile);
  const playerMp = useRunStore((s) => s.playerMp);
  const playerMaxMp = useRunStore((s) => s.playerMaxMp);

  const hpPercent = Math.max(0, (playerHp / playerMaxHp) * 100);
  const mpPercent = Math.max(0, (playerMp / playerMaxMp) * 100);

  const vulnStacks = playerStatusEffects
    .filter((e) => e.type === StatusEffectType.VULNERABLE)
    .reduce((sum, e) => sum + e.stacks, 0);

  return (
    <div className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl bg-black/40 border border-white/10 backdrop-blur-sm w-full">
      {/* 玩家信息 */}
      {playerProfile && (
        <div className="text-center">
          <div className="text-white font-bold text-sm">{playerProfile.name}</div>
          <div className="text-white/50 text-xs">{CLASS_NAMES[playerProfile.class]}</div>
        </div>
      )}

      {/* 血条和MP条 */}
      <div className="flex flex-col gap-2 w-full min-w-[140px]">
        {/* 血量条 */}
        <div className="flex items-center gap-2">
          <div
            className="flex-1 h-3.5 rounded-full bg-gray-800 overflow-hidden border border-gray-700 transition-all"
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: hpPercent > 50
                  ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                  : hpPercent > 25
                  ? 'linear-gradient(90deg, #dc2626, #f87171)'
                  : 'linear-gradient(90deg, #7f1d1d, #dc2626)',
              }}
              animate={{ width: `${hpPercent}%` }}
              transition={{ type: 'spring', stiffness: 120 }}
            />
          </div>
          <span className="text-[10px] text-red-400 w-12 text-right shrink-0">
            {playerHp}/{playerMaxHp}
          </span>
        </div>

        {/* MP条 */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2.5 rounded-full bg-gray-800/60 overflow-hidden border border-gray-700/50">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-400"
              animate={{ width: `${mpPercent}%` }}
              transition={{ type: 'spring', stiffness: 120 }}
            />
          </div>
          <span className="text-[10px] text-purple-400 w-12 text-right shrink-0">
            🔮{playerMp}/{playerMaxMp}
          </span>
        </div>

        {/* 回合数 + Debuff */}
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-[9px] text-white/30">回合 {turnNumber}</span>
          {vulnStacks > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-[9px] text-red-400 bg-red-500/20 border border-red-500/30 rounded px-1 py-0.5"
            >
              💥 破绽 x{vulnStacks}
            </motion.span>
          )}
        </div>
      </div>
    </div>
  );
}
