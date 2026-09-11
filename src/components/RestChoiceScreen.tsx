import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRunStore } from '../store/runStore';
import { Card } from './Card';
import { Icon, type IconName } from './icons';
import { REST } from '../config/balance';

interface RestOption {
  key: string;
  icon: IconName;
  title: string;
  effect: string;
  note: string;
  disabledNote?: string;
  accent: string;
  enabled: boolean;
  onClick: () => void;
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

  const options: RestOption[] = [
    {
      key: 'heal',
      icon: 'heart',
      title: '回复生命',
      effect: `+${healAmount} HP`,
      note: `${playerHp} / ${playerMaxHp} HP`,
      disabledNote: '生命值已满',
      accent: '#e5736b',
      enabled: canHeal,
      onClick: restHealHp,
    },
    {
      key: 'meditate',
      icon: 'moon',
      title: '冥想恢复',
      effect: `+${REST.MEDITATE_MP} MP`,
      note: `${playerMp} / ${playerMaxMp} MP`,
      disabledNote: '灵力已满',
      accent: '#a87fe0',
      enabled: canRestoreMp,
      onClick: restRestoreMp,
    },
    {
      key: 'forge',
      icon: 'hammer',
      title: '锻造卡牌',
      effect: '数值 +40% 或 关键词 +1',
      note: '永久强化 · 每张卡限一次',
      accent: '#d9b869',
      enabled: canForge,
      onClick: () => setShowForgePicker(true),
    },
  ];

  return (
    <div className="scene scene-aurora vignette grain flex flex-col items-center justify-center h-screen px-4 py-8 overflow-y-auto">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 text-center mb-9"
      >
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="hairline-gold w-14" />
          <span className="section-label">SANCTUARY</span>
          <span className="hairline-gold w-14" />
        </div>
        <h1 className="display-title text-4xl mb-2.5">休息处</h1>
        <p className="etch-label" style={{ letterSpacing: '0.26em' }}>选择一种恢复方式 · 锻造将永久强化卡牌</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {showForgePicker ? (
          <motion.div
            key="forge-picker"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 w-full max-w-4xl"
          >
            <div className="flex items-center justify-center gap-2.5 mb-5">
              <span style={{ color: 'var(--brass-400)' }}><Icon name="hammer" size={17} /></span>
              <h3 className="text-xl font-black tracking-[0.2em]" style={{ color: 'var(--brass-200)' }}>选择要锻造的卡牌</h3>
            </div>
            <div className="flex flex-wrap gap-4 justify-center max-h-[52vh] overflow-y-auto p-2">
              {masterDeck.map((card, i) => {
                const forgeable = !card.upgraded && card.templateId !== 'forbidden_001';
                return (
                  <motion.div
                    key={`${card.templateId}-${i}`}
                    whileHover={forgeable ? { y: -6, scale: 1.05 } : {}}
                    className={forgeable ? 'cursor-pointer' : 'opacity-35 saturate-50 cursor-not-allowed'}
                    onClick={() => {
                      if (!forgeable) return;
                      upgradeCardAt(i);
                      finishRest();
                    }}
                    title={forgeable ? '点击锻造（数值+40% 或 关键词+1）' : card.upgraded ? '已锻造过' : '不可锻造'}
                  >
                    <Card card={card} size="md" />
                    {forgeable && (
                      <div className="flex items-center justify-center gap-1 mt-1.5 text-xs font-bold" style={{ color: 'var(--brass-400)' }}>
                        <Icon name="hammer" size={11} />
                        锻造
                      </div>
                    )}
                    {card.upgraded && (
                      <div className="text-center text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>已锻造</div>
                    )}
                  </motion.div>
                );
              })}
            </div>
            <div className="text-center mt-6">
              <button onClick={() => setShowForgePicker(false)} className="btn btn-ghost btn-sm">
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
            className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl w-full"
          >
            {options.map((opt, i) => (
              <motion.button
                key={opt.key}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.1 }}
                whileHover={opt.enabled ? { y: -5 } : {}}
                whileTap={opt.enabled ? { scale: 0.97 } : {}}
                onClick={opt.onClick}
                disabled={!opt.enabled}
                className="panel flex flex-col items-center p-7 transition-all group"
                style={
                  opt.enabled
                    ? { borderColor: `${opt.accent}55`, cursor: 'pointer' }
                    : { opacity: 0.45, cursor: 'not-allowed' }
                }
              >
                {/* 符章 */}
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{
                    color: opt.accent,
                    background: `radial-gradient(circle at 50% 35%, ${opt.accent}26, ${opt.accent}0d)`,
                    border: `1.5px solid ${opt.accent}66`,
                    boxShadow: `0 0 20px ${opt.accent}26`,
                  }}
                >
                  <Icon name={opt.icon} size={26} strokeWidth={1.7} />
                </div>
                <h3 className="text-lg font-black tracking-[0.18em] mb-1.5" style={{ color: 'var(--text-primary)' }}>{opt.title}</h3>
                <p className="text-sm font-bold" style={{ color: opt.accent }}>{opt.effect}</p>
                <p className="num text-xs mt-2.5" style={{ color: 'var(--text-muted)' }}>{opt.note}</p>
                {!opt.enabled && opt.disabledNote && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>{opt.disabledNote}</p>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
