import { useState } from 'react';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import { useRunStore } from './store/runStore';
import { GameArena } from './components/GameArena';
import { MapScreen } from './components/MapScreen';
import { RewardScreen } from './components/RewardScreen';
import { ShopScreen } from './components/ShopScreen';
import { PlayerCreation } from './components/PlayerCreation';
import { RestChoiceScreen } from './components/RestChoiceScreen';
import { EventRewardScreen } from './components/EventRewardScreen';
import { NpcHelpScreen } from './components/NpcHelpScreen';
import { GameEndScreen } from './components/GameEndScreen';

interface TitleScreenProps {
  onCreateCharacter: () => void;
}

function TitleScreen({ onCreateCharacter }: TitleScreenProps) {
  const startNewRun = useRunStore((s) => s.startNewRun);
  const playerProfile = useRunStore((s) => s.playerProfile);

  const handleStart = () => {
    if (playerProfile) {
      // 已有角色，直接开始新Run（不传参数，使用store中的profile）
      startNewRun();
    } else {
      // 首次游戏，需要创建角色
      onCreateCharacter();
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center h-screen bg-cover bg-center bg-no-repeat px-8"
      style={{ backgroundImage: 'url(/pic/P1.webp)' }}
    >
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-12"
      >
        <h1 className="text-7xl font-bold tracking-widest bg-gradient-to-r from-cyan-400 via-purple-400 to-orange-400 bg-clip-text text-transparent mb-6">
          链式反应
        </h1>
        <p className="text-white/40 text-xl mb-3">Chain Reaction</p>
        <p className="text-white/30 text-lg">排列卡牌序列，触发连锁反应，击败敌人</p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleStart}
        className="w-[200px] h-[50px] rounded-2xl font-bold text-2xl bg-gradient-to-r from-cyan-500 via-purple-500 to-orange-500 text-white shadow-2xl shadow-purple-500/20 cursor-pointer tracking-wider flex items-center justify-center"
      >
        {playerProfile ? '再次冒险' : '开始冒险'}
      </motion.button>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-20 text-base text-white/25 text-center"
      >
        <p>多层关卡 · 多种敌人 · 商店与奖励 · Roguelike 体验</p>
        <p className="mt-4 text-white/40 italic">"排列你的命运，承受你的选择。祝你好运，冒险者。"</p>
      </motion.div>
    </div>
  );
}

function App() {
  const scene = useRunStore((s) => s.scene);
  const showRestChoice = useRunStore((s) => s.showRestChoice);
  const runResult = useRunStore((s) => s.runResult);
  const [showPlayerCreation, setShowPlayerCreation] = useState(false);

  // 当角色创建完成时，进入NPC帮助页面
  const handlePlayerCreated = () => {
    setShowPlayerCreation(false);
  };

  // 显示角色创建界面（只在TITLE场景且需要创建角色时显示）
  if (showPlayerCreation && scene === 'TITLE') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="player-creation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <PlayerCreation onStartGame={handlePlayerCreated} />
        </motion.div>
      </AnimatePresence>
    );
  }

  // 休息选择界面
  if (showRestChoice) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="rest-choice"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <RestChoiceScreen />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {scene === 'TITLE' && (
        <motion.div
          key="title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <TitleScreen onCreateCharacter={() => setShowPlayerCreation(true)} />
        </motion.div>
      )}
      {scene === 'NPC_HELP' && (
        <motion.div
          key="npc-help"
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          <NpcHelpScreen />
        </motion.div>
      )}
      {scene === 'MAP' && (
        <motion.div
          key="map"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-screen h-screen"
        >
          <MapScreen />
        </motion.div>
      )}
      {scene === 'BATTLE' && (
        <motion.div
          key="battle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <GameArena />
        </motion.div>
      )}
      {scene === 'REWARD' && (
        <motion.div
          key="reward"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <RewardScreen />
        </motion.div>
      )}
      {scene === 'SHOP' && (
        <motion.div
          key="shop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <ShopScreen />
        </motion.div>
      )}
      {scene === 'EVENT_REWARD' && (
        <motion.div
          key="event-reward"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <EventRewardScreen />
        </motion.div>
      )}
      {scene === 'GAME_END' && (
        <motion.div
          key="game-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <GameEndScreen isVictory={runResult === 'VICTORY'} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;
