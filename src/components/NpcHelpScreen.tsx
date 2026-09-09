import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRunStore } from '../store/runStore';
import { Card } from './Card';
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

  const handleSelectCard = (card: CardTemplate) => {
    setSelectedCard(card);
  };

  const handleSelectRelic = (relicId: RelicId) => {
    setSelectedRelic(relicId);
  };

  const handleStartGame = () => {
    // 添加选中的卡牌到卡组
    if (selectedCard) {
      addCardToMasterDeck(selectedCard);
    }
    // 添加选中的遗物
    if (selectedRelic) {
      addRelic(selectedRelic);
    }
    // 开始游戏（从NPC_HELP场景开始，需要初始化游戏状态）
    startNewRun();
  };

  // 对话页面
  if (!showReward) {
    return (
      <div
        className="flex flex-col items-center justify-center h-screen bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/pic/P2.webp)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col items-center gap-8"
        >
          {/* NPC 神秘导师 */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-44 h-60 rounded-xl overflow-hidden border border-[var(--line-strong)] shadow-2xl shadow-black/60"
          >
            <img 
              src="/pic/pro/pp.webp" 
              alt="神秘导师" 
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* 对话气泡 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="panel panel-gold px-8 py-6 max-w-md text-center"
          >
            <p className="text-[var(--gold-300)] text-lg leading-relaxed font-bold tracking-wider">
              "你似乎需要帮助..."
            </p>
            <p className="text-[var(--text-secondary)] text-sm mt-2 leading-relaxed">
              年轻的 {playerProfile?.name}，前方的道路充满危险。
              我可以给予你一些援助，但选择权在你手中。
            </p>
          </motion.div>

          {/* 选择按钮 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex gap-8"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAccept}
              className="btn btn-primary btn-xl"
            >
              接受帮助
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReject}
              className="btn btn-secondary btn-xl"
            >
              拒绝
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // 奖励选择页面
  return (
    <div
      className="flex flex-col items-center justify-center h-screen bg-cover bg-center bg-no-repeat overflow-hidden"
      style={{ backgroundImage: 'url(/pic/P2.webp)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        className="w-full max-w-5xl px-4"
      >
        <h2 className="text-3xl font-bold text-white text-center mb-2">选择你的援助</h2>
        <p className="text-white/50 text-center mb-8">选择一张卡牌和一个遗物</p>

        {/* 卡牌选择 */}
        <div className="mb-10">
          <h3 className="text-white/70 text-lg mb-6 text-center">选择一张卡牌</h3>
          <div className="flex justify-center gap-6">
            {rewardCards.map((card, index) => (
              <motion.button
                key={card.templateId + index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -10 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelectCard(card)}
                className={`relative transition-all ${
                  selectedCard?.templateId === card.templateId
                    ? 'ring-2 ring-[var(--gold-400)] rounded-xl shadow-[0_0_20px_rgba(212,169,92,0.4)]'
                    : ''
                }`}
              >
                <Card card={{ ...card, uuid: `reward-${index}` }} size="lg" />
                {selectedCard?.templateId === card.templateId && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--gold-400)] rounded-full flex items-center justify-center text-black font-bold text-sm"
                  >
                    ✓
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* 遗物选择 */}
        <div className="mb-10">
          <h3 className="text-white/70 text-lg mb-6 text-center">选择一个遗物</h3>
          <div className="flex justify-center gap-8">
            {rewardRelics.map((relicId, index) => {
              const relic = RELICS[relicId];
              return (
                <motion.button
                  key={relicId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelectRelic(relicId)}
                  className={`relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
                    selectedRelic === relicId
                      ? 'bg-[rgba(212,169,92,0.12)] border-[var(--gold-500)]/60'
                      : 'bg-white/[0.04] border-[var(--line)] hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center text-4xl">
                    {relic.icon}
                  </div>
                  <div className="text-white font-bold text-lg">{relic.name}</div>
                  <div className="text-white/50 text-sm max-w-[180px] text-center">
                    {relic.description}
                  </div>
                  {selectedRelic === relicId && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--gold-400)] rounded-full flex items-center justify-center text-black font-bold text-sm"
                    >
                      ✓
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
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStartGame}
            disabled={!selectedCard || !selectedRelic}
            className={`btn btn-xl ${selectedCard && selectedRelic ? 'btn-primary' : 'btn-secondary'}`}
          >
            开始冒险
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
