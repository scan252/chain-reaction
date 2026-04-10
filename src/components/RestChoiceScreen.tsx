import { motion } from 'framer-motion';
import { useRunStore } from '../store/runStore';

export function RestChoiceScreen() {
  const playerHp = useRunStore((s) => s.playerHp);
  const playerMaxHp = useRunStore((s) => s.playerMaxHp);
  const playerMp = useRunStore((s) => s.playerMp);
  const playerMaxMp = useRunStore((s) => s.playerMaxMp);
  const restHealHp = useRunStore((s) => s.restHealHp);
  const restRestoreMp = useRunStore((s) => s.restRestoreMp);

  const healAmount = Math.floor(playerMaxHp * 0.3);
  const canRestoreMp = playerMp < playerMaxMp;

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-[#0a0a1a] via-[#0f0e17] to-[#0a0a1a] px-4">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold tracking-widest bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent mb-2">
          休息处
        </h1>
        <p className="text-white/40 text-sm">选择恢复方式</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-6 max-w-2xl w-full">
        {/* 回复生命 */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={restHealHp}
          className="flex flex-col items-center p-8 rounded-2xl bg-gradient-to-br from-red-900/40 to-red-950/40 border border-red-500/30 hover:border-red-500/50 transition-all group"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-4xl mb-4 group-hover:scale-110 transition-transform">
            ❤️
          </div>
          <h3 className="text-xl font-bold text-white mb-2">回复生命</h3>
          <p className="text-red-400 text-sm">+{healAmount} HP</p>
          <p className="text-white/40 text-xs mt-2">
            {playerHp} / {playerMaxHp} HP
          </p>
        </motion.button>

        {/* 回复MP */}
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: canRestoreMp ? 1.03 : 1 }}
          whileTap={{ scale: canRestoreMp ? 0.97 : 1 }}
          onClick={restRestoreMp}
          disabled={!canRestoreMp}
          className={`flex flex-col items-center p-8 rounded-2xl border transition-all group ${
            canRestoreMp
              ? 'bg-gradient-to-br from-purple-900/40 to-purple-950/40 border-purple-500/30 hover:border-purple-500/50'
              : 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'
          }`}
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-4xl mb-4 group-hover:scale-110 transition-transform">
            🔮
          </div>
          <h3 className="text-xl font-bold text-white mb-2">冥想恢复</h3>
          <p className="text-purple-400 text-sm">+2 MP</p>
          <p className="text-white/40 text-xs mt-2">
            {playerMp} / {playerMaxMp} MP
          </p>
          {!canRestoreMp && (
            <p className="text-white/30 text-xs mt-1">MP已满</p>
          )}
        </motion.button>
      </div>
    </div>
  );
}
