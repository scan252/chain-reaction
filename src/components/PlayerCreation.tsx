import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRunStore } from '../store/runStore';
import type { PlayerClass, Difficulty } from '../types';
import { CLASS_MAX_MP } from '../types';

const CLASS_INFO: Record<PlayerClass, { name: string; icon: string; description: string; skill: string; image?: string }> = {
  WARRIOR: {
    name: '勇士',
    icon: '⚔️',
    description: '坚韧不拔的近战专家',
    skill: '技能：强化 - 在手牌中添加一张"强化"卡（下一张牌x4），消耗1点MP',
    image: '/pic/pro/pro1.webp',
  },
  PRIEST: {
    name: '牧师',
    icon: '✨',
    description: '神圣的治疗者',
    skill: '技能：治疗 - 回复自身20点生命值，消耗1点MP',
    image: '/pic/pro/pro2.webp',
  },
};

const DIFFICULTY_INFO: Record<Difficulty, { name: string; icon: string; description: string }> = {
  NORMAL: {
    name: '标准',
    icon: '🌿',
    description: '经典冒险难度，适合初次游玩',
  },
  ELITE: {
    name: '精英',
    icon: '💀',
    description: '敌人 +25% 生命 / +15% 攻击，稀有卡掉率提升',
  },
};

interface PlayerCreationProps {
  onStartGame?: () => void;
}

export function PlayerCreation({ onStartGame }: PlayerCreationProps) {
  const [playerName, setPlayerName] = useState('');
  const [selectedClass, setSelectedClass] = useState<PlayerClass | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('NORMAL');
  const setPlayerProfile = useRunStore((s) => s.setPlayerProfile);
  const setDifficultyAction = useRunStore((s) => s.setDifficulty);
  const goToNpcHelp = useRunStore((s) => s.goToNpcHelp);

  const handleStart = () => {
    if (!playerName.trim() || !selectedClass) return;

    setDifficultyAction(difficulty);
    setPlayerProfile(playerName.trim(), selectedClass);
    goToNpcHelp();
    onStartGame?.();
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat px-8 py-12"
      style={{ backgroundImage: 'url(/pic/P1.webp)' }}
    >
      <motion.div
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center mb-10"
      >
        <div className="flex items-center gap-4 mb-4">
          <span className="hairline-gold w-12" />
          <span className="section-label">NEW&nbsp;JOURNEY</span>
          <span className="hairline-gold w-12" />
        </div>
        <h1 className="display-title text-6xl leading-none">创建角色</h1>
        <p className="mt-4 text-sm tracking-[0.4em] text-[var(--text-secondary)] pl-[0.4em]">选择你的身份，开始冒险</p>
      </motion.div>

      {/* 姓名输入 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-2xl mb-12"
      >
        <label className="block text-white/90 text-2xl mb-4 font-bold">冒险者名称</label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="输入你的名字..."
          className="w-full h-[50px] px-6 bg-white/5 border-2 border-white/40 rounded-xl text-white text-xl placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
          maxLength={12}
        />
      </motion.div>

      {/* 职业选择 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-lg mb-10"
      >
        <label className="block text-white/90 text-lg mb-4 font-bold">选择职业</label>
        <div className="grid grid-cols-2 gap-4">
          {(Object.keys(CLASS_INFO) as PlayerClass[]).map((cls) => {
            const info = CLASS_INFO[cls];
            const isSelected = selectedClass === cls;
            return (
              <motion.button
                key={cls}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedClass(cls)}
                className={`flex items-center gap-5 p-5 rounded-xl border transition-all text-left ${
                  isSelected
                    ? 'bg-[rgba(212,169,92,0.12)] border-[var(--gold-500)]/60 shadow-[0_0_18px_rgba(212,169,92,0.2)]'
                    : 'bg-white/[0.04] border-[var(--line)] hover:bg-white/[0.08]'
                }`}
              >
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-800 flex items-center justify-center text-4xl shrink-0 overflow-hidden">
                  {info.image ? (
                    <img src={info.image} alt={info.name} className="w-full h-full object-cover" />
                  ) : (
                    info.icon
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-white font-bold text-xl">{info.name}</span>
                    <span className="text-xs text-[#b79ae8] bg-[rgba(157,123,224,0.14)] px-2 py-0.5 rounded num">
                      MP上限: {CLASS_MAX_MP[cls]}
                    </span>
                  </div>
                  <p className="text-white/50 text-base mb-1">{info.description}</p>
                  <p className="text-white/40 text-sm">{info.skill}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* 难度选择 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="w-full max-w-lg mb-8"
      >
        <label className="block text-white/90 text-lg mb-3 font-bold">选择难度</label>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(DIFFICULTY_INFO) as Difficulty[]).map((diff) => {
            const info = DIFFICULTY_INFO[diff];
            const isSelected = difficulty === diff;
            return (
              <motion.button
                key={diff}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setDifficulty(diff)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  isSelected
                    ? 'bg-[rgba(212,169,92,0.14)] border-[var(--gold-500)]/60 shadow-[0_0_18px_rgba(212,169,92,0.2)]'
                    : 'bg-white/[0.04] border-[var(--line)] hover:bg-white/[0.08]'
                }`}
              >
                <span className="text-2xl">{info.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold">{info.name}</div>
                  <div className="text-white/40 text-xs pr-1">{info.description}</div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* 开始按钮 */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: playerName.trim() && selectedClass ? 1.05 : 1 }}
        whileTap={{ scale: playerName.trim() && selectedClass ? 0.95 : 1 }}
        onClick={handleStart}
        disabled={!playerName.trim() || !selectedClass}
        className={`w-[260px] h-[50px] rounded-2xl font-bold text-lg transition-all flex items-center justify-center border ${
          playerName.trim() && selectedClass
            ? 'bg-gradient-to-r from-cyan-500 via-purple-500 to-orange-500 text-white border-transparent shadow-2xl shadow-purple-500/20 cursor-pointer'
            : 'bg-slate-800/80 text-white/60 border-white/30 cursor-not-allowed'
        }`}
      >
        {playerName.trim() && selectedClass ? '开始冒险' : '填写名字并选择职业'}
      </motion.button>
    </div>
  );
}
