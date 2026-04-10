import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRunStore } from '../store/runStore';
import type { PlayerClass, PlayerProfile } from '../types';
import { CLASS_MAX_MP } from '../types';

const CLASS_INFO: Record<PlayerClass, { name: string; icon: string; description: string; skill: string; image?: string }> = {
  WARRIOR: {
    name: '勇士',
    icon: '⚔️',
    description: '坚韧不拔的近战专家',
    skill: '技能：强化 - 在手牌中添加一张"强化"卡（下一张牌x4），消耗1点MP',
    image: '/pic/pro/pro1.jpg',
  },
  PRIEST: {
    name: '牧师',
    icon: '✨',
    description: '神圣的治疗者',
    skill: '技能：治疗 - 回复自身20点生命值，消耗1点MP',
    image: '/pic/pro/pro2.jpg',
  },
};

interface PlayerCreationProps {
  onStartGame?: () => void;
}

export function PlayerCreation({ onStartGame }: PlayerCreationProps) {
  const [playerName, setPlayerName] = useState('');
  const [selectedClass, setSelectedClass] = useState<PlayerClass | null>(null);
  const setPlayerProfile = useRunStore((s) => s.setPlayerProfile);
  const goToNpcHelp = useRunStore((s) => s.goToNpcHelp);

  const handleStart = () => {
    if (!playerName.trim() || !selectedClass) return;
    
    // 只设置玩家信息，不开始游戏（游戏在NPC帮助页面后开始）
    setPlayerProfile(playerName.trim(), selectedClass);
    
    // 切换到NPC帮助场景
    goToNpcHelp();
    
    // 通知父组件
    onStartGame?.();
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat px-8 py-12"
      style={{ backgroundImage: 'url(/pic/P1.jpg)' }}
    >
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-10"
      >
        <h1 className="text-6xl font-bold tracking-widest bg-gradient-to-r from-cyan-400 via-purple-400 to-orange-400 bg-clip-text text-transparent mb-4">
          创建角色
        </h1>
        <p className="text-white/40 text-xl">选择你的身份，开始冒险</p>
      </motion.div>

      {/* 姓名输入 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-2xl mb-12"
      >
        <label className="block text-white/60 text-2xl mb-4">冒险者名称</label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="输入你的名字..."
          className="w-full h-[50px] px-6 bg-white/5 border border-white/20 rounded-xl text-white text-xl placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
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
        <label className="block text-white/60 text-lg mb-4">选择职业</label>
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
                    ? 'bg-purple-500/20 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.3)]'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
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
                    <span className="text-sm text-purple-400 bg-purple-500/20 px-3 py-1 rounded">
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

      {/* 开始按钮 */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: playerName.trim() && selectedClass ? 1.05 : 1 }}
        whileTap={{ scale: playerName.trim() && selectedClass ? 0.95 : 1 }}
        onClick={handleStart}
        disabled={!playerName.trim() || !selectedClass}
        className={`w-[200px] h-[50px] rounded-2xl font-bold text-xl transition-all flex items-center justify-center ${
          playerName.trim() && selectedClass
            ? 'bg-gradient-to-r from-cyan-500 via-purple-500 to-orange-500 text-white shadow-2xl shadow-purple-500/20 cursor-pointer'
            : 'bg-white/10 text-white/30 cursor-not-allowed'
        }`}
      >
        开始冒险
      </motion.button>
    </div>
  );
}
