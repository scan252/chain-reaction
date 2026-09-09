import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRunStore } from '../store/runStore';
import { Card } from './Card';
import { REST } from '../config/balance';
import type { CardInstance, CardTemplate } from '../types';

function toDisplayInstance(card: CardTemplate): CardInstance {
  return { ...card, uuid: card.templateId };
}

export function RestChoiceScreen() {
  const playerHp = useRunStore((s) => s.playerHp);
  const playerMaxHp = useRunStore((s) => s.playerMaxHp);
  const playerMp = useRunStore((s) => s.playerMp);
  const playerMaxMp = useRunStore((s) => s.playerMaxMp);
  const masterDeck = useRunStore((s) => s.masterDeck);
  const restHealHp = useRunStore((s) => s.restHealHp);
  const restRestoreMp = useRunStore((s) => s.restRestoreMp);
  const upgradeCardAt = useRunStore((s) => s.upgradeCardAt);
  const finishRest = useRunStore((s) => s.finishRest);

  const [showForgePicker, setShowForgePicker] = useState(false);

  const healAmount = Math.floor(playerMaxHp * REST.HEAL_RATIO);
  const canHeal = playerHp < playerMaxHp;
  const canRestoreMp = playerMp < playerMaxMp;
  const canForge = masterDeck.some((c) => !c.upgraded && c.templateId !== 'forbidden_001');

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-[#0a0a1a] via-[#0f0e17] to-[#0a0a1a] px-4 py-8 overflow-y-auto">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-10"
      >
        <h1 className="text-4xl font-bold tracking-widest bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent mb-2">
          休息处
        </h1>
        <p className="text-white/40 text-sm">选择一种恢复方式（锻造会永久强化一张卡）</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {showForgePicker ? (
          <motion.div
            key="forge-picker"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-4xl"
          >
            <h3 className="text-xl font-bold text-amber-300 text-center mb-4">🔨 选择要锻造的卡牌</h3>
            <div className="flex flex-wrap gap-3 justify-center max-h-[50vh] overflow-y-auto p-2">
              {masterDeck.map((card, i) => {
                const forgeable = !card.upgraded && card.templateId !== 'forbidden_001';
                return (
                  <motion.div
                    key={`${card.templateId}-${i}`}
                    whileHover={forgeable ? { y: -6, scale: 1.06 } : {}}
                    className={forgeable ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}
                    onClick={() => {
                      if (!forgeable) return;
                      upgradeCardAt(i);
                      finishRest();
                    }}
                    title={forgeable ? '点击锻造（数值+40% 或 关键词+1）' : card.upgraded ? '已锻造过' : '不可锻造'}
                  >
                    <Card card={toDisplayInstance(card)} size="md" />
                    {forgeable && (
                      <div className="text-center text-amber-400 text-xs mt-1 font-bold">🔨 锻造</div>
                    )}
                    {card.upgraded && (
                      <div className="text-center text-white/40 text-xs mt-1">已锻造</div>
                    )}
                  </motion.div>
                );
              })}
            </div>
            <div className="text-center mt-6">
              <button
                onClick={() => setShowForgePicker(false)}
                className="px-6 py-2 text-white/50 hover:text-white/80 transition-colors text-sm cursor-pointer"
              >
                返回
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="rest-choices"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl w-full"
          >
            {/* 回复生命 */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: canHeal ? 1.03 : 1 }}
              whileTap={{ scale: canHeal ? 0.97 : 1 }}
              onClick={restHealHp}
              disabled={!canHeal}
              className={`flex flex-col items-center p-6 rounded-2xl border transition-all group ${
                canHeal
                  ? 'bg-gradient-to-br from-red-900/40 to-red-950/40 border-red-500/30 hover:border-red-500/50'
                  : 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-3xl mb-3 group-hover:scale-110 transition-transform">
                ❤️
              </div>
              <h3 className="text-lg font-bold text-white mb-1">回复生命</h3>
              <p className="text-red-400 text-sm">+{healAmount} HP</p>
              <p className="text-white/40 text-xs mt-2">{playerHp} / {playerMaxHp} HP</p>
              {!canHeal && <p className="text-white/30 text-xs mt-1">生命值已满</p>}
            </motion.button>

            {/* 冥想 */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: canRestoreMp ? 1.03 : 1 }}
              whileTap={{ scale: canRestoreMp ? 0.97 : 1 }}
              onClick={restRestoreMp}
              disabled={!canRestoreMp}
              className={`flex flex-col items-center p-6 rounded-2xl border transition-all group ${
                canRestoreMp
                  ? 'bg-gradient-to-br from-purple-900/40 to-purple-950/40 border-purple-500/30 hover:border-purple-500/50'
                  : 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-3xl mb-3 group-hover:scale-110 transition-transform">
                🔮
              </div>
              <h3 className="text-lg font-bold text-white mb-1">冥想恢复</h3>
              <p className="text-purple-400 text-sm">+{REST.MEDITATE_MP} MP</p>
              <p className="text-white/40 text-xs mt-2">{playerMp} / {playerMaxMp} MP</p>
              {!canRestoreMp && <p className="text-white/30 text-xs mt-1">MP已满</p>}
            </motion.button>

            {/* 锻造 */}
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: canForge ? 1.03 : 1 }}
              whileTap={{ scale: canForge ? 0.97 : 1 }}
              onClick={() => canForge && setShowForgePicker(true)}
              disabled={!canForge}
              className={`flex flex-col items-center p-6 rounded-2xl border transition-all group ${
                canForge
                  ? 'bg-gradient-to-br from-amber-900/40 to-orange-950/40 border-amber-500/30 hover:border-amber-500/50'
                  : 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center text-3xl mb-3 group-hover:scale-110 transition-transform">
                🔨
              </div>
              <h3 className="text-lg font-bold text-white mb-1">锻造卡牌</h3>
              <p className="text-amber-400 text-sm">数值 +40% 或 关键词 +1</p>
              <p className="text-white/40 text-xs mt-2">永久强化，每张卡限一次</p>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
