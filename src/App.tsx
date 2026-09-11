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
      startNewRun();
    } else {
      onCreateCharacter();
    }
  };

  return (
    <div
      className="relative flex flex-col items-center justify-center h-screen bg-cover bg-center bg-no-repeat px-8"
      style={{ backgroundImage: 'url(/pic/P1.webp)' }}
    >
      {/* 压暗层：保证文字可读 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0d15]/60 via-[#0a0d15]/35 to-[#0a0d15]/85" />

      <motion.div
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative text-center mb-14"
      >
        <div className="flex items-center justify-center gap-4 mb-6">
          <span className="hairline-gold w-16" />
          <span className="section-label">PIPELINE&nbsp;ROGUELIKE</span>
          <span className="hairline-gold w-16" />
        </div>

        <h1 className="display-title text-6xl sm:text-8xl leading-none">链式反应</h1>

        <p className="mt-5 sm:mt-7 text-[12px] sm:text-[14px] tracking-[0.4em] sm:tracking-[0.55em] text-[var(--text-secondary)] pl-[0.4em] sm:pl-[0.55em]">
          排兵布阵 · 连锁制敌
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.6 }}
        className="relative flex flex-col items-center gap-4"
      >
        <button className="btn btn-primary btn-xl" onClick={handleStart}>
          {playerProfile ? '再次冒险' : '开始冒险'}
        </button>
        {playerProfile && (
          <span className="text-xs text-[var(--text-muted)] tracking-[0.3em]">
            上次身份 · {playerProfile.name}
          </span>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.8 }}
        className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-3"
      >
        <div className="flex items-center gap-5 text-[13px] text-[var(--text-secondary)] tracking-[0.2em]">
          <span>卡牌序列</span>
          <span className="text-[var(--gold-500)] text-[9px]">◆</span>
          <span>槽位攻防</span>
          <span className="text-[var(--gold-500)] text-[9px]">◆</span>
          <span>流派构筑</span>
          <span className="text-[var(--gold-500)] text-[9px]">◆</span>
          <span>远征关卡</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] italic tracking-wider">
          “排列你的命运，承受你的选择。”
        </p>
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
