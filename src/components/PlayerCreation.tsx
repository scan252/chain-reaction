import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRunStore } from '../store/runStore';
import { Icon, type IconName } from './icons';
import type { PlayerClass, Difficulty } from '../types';
import { CLASS_MAX_MP } from '../types';

const CLASS_INFO: Record<PlayerClass, { name: string; icon: IconName; description: string; skill: string; image?: string }> = {
  WARRIOR: {
    name: '勇士',
    icon: 'swords',
    description: '坚韧不拔的近战专家',
    skill: '技能·强化：在手牌中添加一张「强化」（下一张牌 ×4），消耗 1 点灵力',
    image: '/pic/pro/pro1.webp',
  },
  PRIEST: {
    name: '牧师',
    icon: 'sparkle',
    description: '神圣的治疗者',
    skill: '技能·治疗：回复自身 20 点生命值，消耗 1 点灵力',
    image: '/pic/pro/pro2.webp',
  },
};

const DIFFICULTY_INFO: Record<Difficulty, { name: string; icon: IconName; description: string }> = {
  NORMAL: {
    name: '标准',
    icon: 'tent',
    description: '经典冒险难度，适合初次游玩',
  },
  ELITE: {
    name: '精英',
    icon: 'skull',
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

  const ready = !!playerName.trim() && !!selectedClass;

  return (
    <div className="scene scene-aurora vignette grain flex flex-col items-center justify-center min-h-screen px-8 py-10 overflow-y-auto">
      <motion.div
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center mb-8"
      >
        <div className="flex items-center gap-4 mb-4">
          <span className="hairline-gold w-12" />
          <span className="section-label">NEW&nbsp;JOURNEY</span>
          <span className="hairline-gold w-12" />
        </div>
        <h1 className="display-title text-5xl leading-none">创建角色</h1>
        <p className="mt-4 etch-label" style={{ letterSpacing: '0.4em', fontSize: 11 }}>选择你的身份 · 开始冒险</p>
      </motion.div>

      {/* 姓名输入 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 w-full max-w-lg mb-8"
      >
        <label className="etch-label block mb-2.5" style={{ fontSize: 11 }}>冒险者名称</label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="输入你的名字…"
          className="w-full h-[48px] px-5 rounded-[10px] text-lg font-bold tracking-wider focus:outline-none transition-all"
          style={{
            background: 'rgba(10,13,22,0.72)',
            border: '1px solid var(--line)',
            color: 'var(--text-primary)',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.45)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--line-brass)'; e.currentTarget.style.boxShadow = 'inset 0 2px 8px rgba(0,0,0,0.45), 0 0 14px rgba(200,162,78,0.15)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'inset 0 2px 8px rgba(0,0,0,0.45)'; }}
          maxLength={12}
        />
      </motion.div>

      {/* 职业选择 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 w-full max-w-2xl mb-8"
      >
        <label className="etch-label block mb-2.5" style={{ fontSize: 11 }}>选择职业</label>
        <div className="grid grid-cols-2 gap-4">
          {(Object.keys(CLASS_INFO) as PlayerClass[]).map((cls) => {
            const info = CLASS_INFO[cls];
            const isSelected = selectedClass === cls;
            return (
              <motion.button
                key={cls}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedClass(cls)}
                className="panel flex items-center gap-4 p-4 text-left transition-all"
                style={
                  isSelected
                    ? { borderColor: 'var(--line-brass)', boxShadow: '0 0 22px rgba(200,162,78,0.22), 0 12px 32px rgba(3,4,8,0.55)' }
                    : undefined
                }
              >
                <div
                  className="w-[72px] h-[72px] rounded-lg overflow-hidden shrink-0"
                  style={{
                    border: isSelected ? '1.5px solid var(--line-brass)' : '1.5px solid var(--line)',
                    boxShadow: '0 4px 14px rgba(3,4,8,0.5)',
                  }}
                >
                  {info.image ? (
                    <img src={info.image} alt={info.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #232c47, #131829)', color: 'var(--brass-300)' }}>
                      <Icon name={info.icon} size={28} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="font-black text-lg" style={{ color: isSelected ? 'var(--brass-200)' : 'var(--text-primary)' }}>{info.name}</span>
                    <span
                      className="num inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-[2px] rounded-full"
                      style={{ color: 'var(--mana-300)', background: 'rgba(168,127,224,0.12)', border: '1px solid rgba(168,127,224,0.35)' }}
                    >
                      <Icon name="drop" size={9} />
                      {CLASS_MAX_MP[cls]}
                    </span>
                  </div>
                  <p className="text-[13px] mb-1" style={{ color: 'var(--text-secondary)' }}>{info.description}</p>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{info.skill}</p>
                </div>
                {/* 选中角标 */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--brass-500)', color: '#241a08' }}>
                    <Icon name="check" size={11} strokeWidth={3} />
                  </div>
                )}
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
        className="relative z-10 w-full max-w-2xl mb-9"
      >
        <label className="etch-label block mb-2.5" style={{ fontSize: 11 }}>选择难度</label>
        <div className="grid grid-cols-2 gap-4">
          {(Object.keys(DIFFICULTY_INFO) as Difficulty[]).map((diff) => {
            const info = DIFFICULTY_INFO[diff];
            const isSelected = difficulty === diff;
            return (
              <motion.button
                key={diff}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setDifficulty(diff)}
                className="panel flex items-center gap-3 p-3.5 text-left transition-all"
                style={
                  isSelected
                    ? { borderColor: 'var(--line-brass)', boxShadow: '0 0 22px rgba(200,162,78,0.22), 0 12px 32px rgba(3,4,8,0.55)' }
                    : undefined
                }
              >
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    color: isSelected ? 'var(--brass-300)' : 'var(--text-muted)',
                    background: 'rgba(10,13,22,0.6)',
                    border: '1px solid var(--line-soft)',
                  }}
                >
                  <Icon name={info.icon} size={17} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-black" style={{ color: isSelected ? 'var(--brass-200)' : 'var(--text-primary)' }}>{info.name}</div>
                  <div className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{info.description}</div>
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
        whileHover={ready ? { scale: 1.04 } : {}}
        whileTap={ready ? { scale: 0.96 } : {}}
        onClick={handleStart}
        disabled={!ready}
        className="relative z-10 btn btn-primary btn-xl"
        style={{ minWidth: 280 }}
      >
        {ready ? (
          <>
            <Icon name="swords" size={17} />
            开始冒险
          </>
        ) : (
          '填写名字并选择职业'
        )}
      </motion.button>
    </div>
  );
}
