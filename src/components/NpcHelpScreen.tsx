import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRunStore } from '../store/runStore';
import { Card } from './Card';
import { Icon } from './icons';
import { RELICS, type CardTemplate, type RelicId } from '../types';
import { generateRewardCards } from '../data/cardData';

// Fisher-Yates 洗牌（均匀分布）
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function NpcHelpScreen() {
  const [showReward, setShowReward] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardTemplate | null>(null);
  const [selectedRelic, setSelectedRelic] = useState<RelicId | null>(null);
  const [rewardCards] = useState(() => generateRewardCards(5).map(r => r.card));
  const [rewardRelics] = useState(() => {
    const allRelicIds = Object.keys(RELICS) as RelicId[];
    return shuffle(allRelicIds).slice(0, 2);
  });

  const startNewRun = useRunStore((s) => s.startNewRun);
  const playerProfile = useRunStore((s) => s.playerProfile);
  const addRelic = useRunStore((s) => s.addRelic);
  const addCardToMasterDeck = useRunStore((s) => s.addCardToMasterDeck);

  const handleAccept = () => {
    setShowReward(true);
  };

  const handleReject = () => {
    // 直接开始游戏，不领取奖励
    startNewRun();
  };

  const handleStartGame = () => {
    if (selectedCard) {
      addCardToMasterDeck(selectedCard);
    }
    if (selectedRelic) {
      addRelic(selectedRelic);
    }
    startNewRun();
  };

  // ===== 对话页面 =====
  if (!showReward) {
    return (
      <div className="scene scene-aurora vignette grain flex flex-col items-center justify-center h-screen">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative z-10 flex flex-col items-center gap-7"
        >
          {/* 神秘导师肖像 */}
          <motion.div
            initial={{ scale: 0.85 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="relative"
          >
            {/* 背光 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none breathe" style={{ background: 'radial-gradient(circle, rgba(200,162,78,0.18), transparent 65%)' }} />
            <div
              className="w-44 h-60 rounded-xl overflow-hidden relative"
              style={{
                border: '1.5px solid var(--line-brass)',
                boxShadow: '0 16px 44px rgba(3,4,8,0.7), 0 0 28px rgba(200,162,78,0.18)',
              }}
            >
              <img src="/pic/pro/pp.webp" alt="神秘导师" className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 h-1/4" style={{ background: 'linear-gradient(180deg, transparent, rgba(5,6,11,0.7))' }} />
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-[3px] rounded-full text-[10px] font-bold tracking-[0.24em] whitespace-nowrap" style={{ color: 'var(--brass-200)', background: 'rgba(20,16,8,0.92)', border: '1px solid var(--line-brass)' }}>
              神秘导师
            </div>
          </motion.div>

          {/* 对话气泡 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="panel panel-gold corner-orn px-8 py-6 max-w-md text-center"
          >
            <p className="text-lg leading-relaxed font-bold tracking-wider" style={{ color: 'var(--brass-200)' }}>
              「你似乎需要帮助……」
            </p>
            <p className="text-sm mt-2.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              年轻的 {playerProfile?.name}，前方的道路充满危险。
              我可以给予你一些援助，但选择权在你手中。
            </p>
          </motion.div>

          {/* 选择按钮 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex gap-6"
          >
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleAccept} className="btn btn-primary btn-xl">
              接受帮助
            </motion.button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleReject} className="btn btn-secondary btn-xl">
              拒绝
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ===== 奖励选择页面 =====
  return (
    <div className="scene scene-aurora vignette grain flex flex-col items-center justify-center h-screen overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        className="relative z-10 w-full max-w-5xl px-4"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="hairline-gold w-14" />
          <span className="section-label">MENTOR'S AID</span>
          <span className="hairline-gold w-14" />
        </div>
        <h2 className="display-title text-3xl text-center mb-1.5">选择你的援助</h2>
        <p className="etch-label text-center mb-7" style={{ letterSpacing: '0.26em' }}>选择一张卡牌和一个遗物</p>

        {/* 卡牌选择 */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-5">
            <span style={{ color: 'var(--arc-400)' }}><Icon name="deck" size={14} /></span>
            <h3 className="text-sm font-bold tracking-[0.24em]" style={{ color: 'var(--text-secondary)' }}>选择一张卡牌</h3>
          </div>
          <div className="flex justify-center gap-5">
            {rewardCards.map((card, index) => {
              const selected = selectedCard?.templateId === card.templateId;
              return (
                <motion.button
                  key={card.templateId + index}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.09 }}
                  whileHover={{ y: -10, scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedCard(card)}
                  className="relative rounded-xl transition-shadow"
                  style={selected ? { boxShadow: '0 0 0 2px var(--brass-400), 0 0 26px rgba(217,184,105,0.45)' } : undefined}
                >
                  <Card card={card} size="lg" />
                  {selected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center z-10"
                      style={{ background: 'var(--brass-400)', color: '#241a08', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
                    >
                      <Icon name="check" size={13} strokeWidth={3} />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* 遗物选择 */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-5">
            <span style={{ color: 'var(--brass-400)' }}><Icon name="star" size={14} /></span>
            <h3 className="text-sm font-bold tracking-[0.24em]" style={{ color: 'var(--text-secondary)' }}>选择一个遗物</h3>
          </div>
          <div className="flex justify-center gap-5 items-stretch">
            {rewardRelics.map((relicId, index) => {
              const relic = RELICS[relicId];
              const selected = selectedRelic === relicId;
              return (
                <motion.button
                  key={relicId}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedRelic(relicId)}
                  className="panel relative flex flex-col items-center gap-2.5 p-5 w-[220px] transition-all"
                  style={selected ? { borderColor: 'var(--line-brass)', boxShadow: '0 0 22px rgba(200,162,78,0.25), 0 12px 32px rgba(3,4,8,0.55)' } : undefined}
                >
                  <div
                    className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl"
                    style={{
                      background: 'radial-gradient(circle at 50% 35%, rgba(200,162,78,0.16), rgba(14,18,32,0.9))',
                      border: '1px solid var(--line-brass-soft)',
                      boxShadow: '0 4px 12px rgba(3,4,8,0.5)',
                    }}
                  >
                    {relic.icon}
                  </div>
                  <div className="font-black text-[15px] tracking-wider" style={{ color: selected ? 'var(--brass-200)' : 'var(--text-primary)' }}>{relic.name}</div>
                  <div className="text-xs leading-relaxed text-center flex-1" style={{ color: 'var(--text-secondary)' }}>
                    {relic.description}
                  </div>
                  {selected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--brass-400)', color: '#241a08', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
                    >
                      <Icon name="check" size={13} strokeWidth={3} />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* 开始游戏按钮 */}
        <div className="flex justify-center">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleStartGame}
            disabled={!selectedCard || !selectedRelic}
            className={`btn btn-xl ${selectedCard && selectedRelic ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Icon name="swords" size={17} />
            开始冒险
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
