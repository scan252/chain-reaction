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
import { Icon, type IconName } from './components/icons';

interface TitleScreenProps {
  onCreateCharacter: () => void;
}

/** 品牌徽记：六边仪环 + 三段链式菱晶 */
function BrandEmblem({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <defs>
        <linearGradient id="emblemChain" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7decdc" />
          <stop offset="55%" stopColor="#e6cc8b" />
          <stop offset="100%" stopColor="#c8a24e" />
        </linearGradient>
        <radialGradient id="emblemGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(125,236,220,0.25)" />
          <stop offset="70%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <circle cx="60" cy="60" r="56" fill="url(#emblemGlow)" />

      {/* 六边仪环 */}
      <polygon
        points="60,8 105,34 105,86 60,112 15,86 15,34"
        fill="none"
        stroke="rgba(200,162,78,0.55)"
        strokeWidth="1.4"
      />
      <polygon
        points="60,16 98,38 98,82 60,104 22,82 22,38"
        fill="none"
        stroke="rgba(168,182,214,0.18)"
        strokeWidth="0.8"
        strokeDasharray="3 4"
      />

      {/* 链式流光线 */}
      <line x1="24" y1="60" x2="96" y2="60" stroke="url(#emblemChain)" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />

      {/* 三段菱晶（管道隐喻） */}
      {[36, 60, 84].map((x, i) => (
        <g key={x}>
          <path
            d={`M${x} 47 L${x + 9} 60 L${x} 73 L${x - 9} 60 Z`}
            fill={i === 1 ? 'rgba(230,204,139,0.2)' : 'rgba(20,26,42,0.85)'}
            stroke="url(#emblemChain)"
            strokeWidth="1.8"
          />
          <circle cx={x} cy="60" r={i === 1 ? 3.4 : 2.4} fill={i === 1 ? '#e6cc8b' : '#7decdc'}>
            {i === 1 && (
              <animate attributeName="opacity" values="1;0.4;1" dur="1.8s" repeatCount="indefinite" />
            )}
          </circle>
        </g>
      ))}

      {/* 顶部星火 */}
      <circle cx="60" cy="8" r="2.2" fill="#e6cc8b" opacity="0.9" />
    </svg>
  );
}

/** 漂浮秘能微粒 */
function EnergyMotes() {
  const motes = [
    { x: '12%', y: '24%', s: 3, d: 7, delay: 0 },
    { x: '22%', y: '68%', s: 2, d: 9, delay: 1.2 },
    { x: '78%', y: '30%', s: 2.5, d: 8, delay: 0.6 },
    { x: '86%', y: '62%', s: 2, d: 10, delay: 2 },
    { x: '64%', y: '16%', s: 2, d: 7.5, delay: 1.6 },
    { x: '36%', y: '82%', s: 2.5, d: 8.5, delay: 0.3 },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {motes.map((m, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: m.x,
            top: m.y,
            width: m.s,
            height: m.s,
            background: i % 2 ? 'rgba(125,236,220,0.7)' : 'rgba(230,204,139,0.7)',
            boxShadow: i % 2 ? '0 0 8px rgba(125,236,220,0.8)' : '0 0 8px rgba(230,204,139,0.8)',
          }}
          animate={{ y: [0, -26, 0], opacity: [0.15, 0.85, 0.15] }}
          transition={{ duration: m.d, repeat: Infinity, delay: m.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/** 背景符文巨环 */
function TitleRuneRing() {
  const glyphs = 36;
  return (
    <svg viewBox="0 0 800 800" className="spin-slower absolute w-[130vmin] h-[130vmin] opacity-60" style={{ left: '50%', top: '46%', transform: 'translate(-50%, -50%)' }}>
      <circle cx="400" cy="400" r="388" fill="none" stroke="rgba(168,182,214,0.06)" strokeWidth="1" />
      <circle cx="400" cy="400" r="330" fill="none" stroke="rgba(168,182,214,0.05)" strokeWidth="1" strokeDasharray="2 8" />
      <circle cx="400" cy="400" r="250" fill="none" stroke="rgba(200,162,78,0.07)" strokeWidth="1" />
      {Array.from({ length: glyphs }).map((_, i) => {
        const a = (i / glyphs) * Math.PI * 2;
        const x = 400 + Math.cos(a) * 360;
        const y = 400 + Math.sin(a) * 360;
        const rot = (a * 180) / Math.PI + 90;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`} opacity="0.14">
            <rect x="-4" y="-7" width="8" height="14" fill="none" stroke="rgba(200,162,78,0.8)" strokeWidth="0.9" />
            <line x1="-4" y1="0" x2="4" y2="0" stroke="rgba(200,162,78,0.8)" strokeWidth="0.9" />
          </g>
        );
      })}
    </svg>
  );
}

const FEATURES: { icon: IconName; label: string }[] = [
  { icon: 'link', label: '卡牌序列' },
  { icon: 'gem', label: '槽位攻防' },
  { icon: 'bolt', label: '流派构筑' },
  { icon: 'compass', label: '远征关卡' },
];

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
    <div className="scene scene-aurora vignette grain relative flex flex-col items-center justify-center h-screen px-8 overflow-hidden">
      <TitleRuneRing />
      <EnergyMotes />

      {/* 品牌区 */}
      <motion.div
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative z-10 text-center mb-12 flex flex-col items-center"
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="drift mb-2"
        >
          <BrandEmblem size={132} />
        </motion.div>

        <div className="flex items-center justify-center gap-4 mb-5 mt-4">
          <span className="hairline-gold w-16" />
          <span className="section-label">PIPELINE&nbsp;ROGUELIKE</span>
          <span className="hairline-gold w-16" />
        </div>

        <h1 className="display-title text-8xl leading-none">链式反应</h1>

        <p className="mt-6 text-[14px] tracking-[0.55em] pl-[0.55em]" style={{ color: 'var(--text-secondary)' }}>
          排兵布阵 · 连锁制敌
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.6 }}
        className="relative z-10 flex flex-col items-center gap-4"
      >
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="btn btn-primary btn-xl"
          onClick={handleStart}
        >
          <Icon name="bolt" size={18} />
          {playerProfile ? '再次冒险' : '开始冒险'}
        </motion.button>
        {playerProfile && (
          <span className="inline-flex items-center gap-2 text-xs tracking-[0.3em]" style={{ color: 'var(--text-muted)' }}>
            <Icon name="swords" size={11} style={{ color: 'var(--brass-500)' }} />
            上次身份 · {playerProfile.name}
          </span>
        )}
      </motion.div>

      {/* 底部特性带 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.8 }}
        className="absolute bottom-8 left-0 right-0 z-10 flex flex-col items-center gap-3.5"
      >
        <div className="flex items-center gap-7">
          {FEATURES.map((f) => (
            <span key={f.label} className="inline-flex items-center gap-2 text-[13px] tracking-[0.2em]" style={{ color: 'var(--text-secondary)' }}>
              <Icon name={f.icon} size={13} style={{ color: 'var(--brass-400)' }} />
              {f.label}
            </span>
          ))}
        </div>
        <p className="text-xs italic tracking-wider" style={{ color: 'var(--text-muted)' }}>
          「排列你的命运，承受你的选择。」
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
