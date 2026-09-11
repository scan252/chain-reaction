import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Icon, type IconName } from './icons';

/** 牌堆底盘：叠放的玄铁卡牌 + 图标 + 数量 */
function Pile({
  count,
  label,
  icon,
  accent,
  onClick,
}: {
  count: number;
  label: string;
  icon: IconName;
  accent: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      className="flex flex-col items-center gap-1 cursor-pointer group"
      whileHover={{ y: -3 }}
      onClick={onClick}
      title={`查看${label}`}
    >
      <div className="relative w-[52px] h-[68px]">
        {/* 叠层（牌堆厚度感） */}
        <div
          className="absolute inset-0 rounded-md translate-x-[5px] translate-y-[5px]"
          style={{ background: 'rgba(10,13,22,0.9)', border: '1px solid rgba(168,182,214,0.1)' }}
        />
        <div
          className="absolute inset-0 rounded-md translate-x-[2.5px] translate-y-[2.5px]"
          style={{ background: 'rgba(19,24,41,0.95)', border: '1px solid rgba(168,182,214,0.14)' }}
        />
        {/* 面层 */}
        <div
          className="absolute inset-0 rounded-md flex flex-col items-center justify-center gap-[3px] transition-colors"
          style={{
            background: 'linear-gradient(180deg, #232c47 0%, #131829 70%, #0e1220 100%)',
            border: `1px solid ${accent}55`,
            boxShadow: '0 4px 12px rgba(3,4,8,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <span style={{ color: accent, opacity: 0.85 }}>
            <Icon name={icon} size={16} />
          </span>
          <span className="num text-[15px] font-black leading-none text-shadow-sm" style={{ color: 'var(--text-primary)' }}>
            {count}
          </span>
        </div>
      </div>
      <span className="etch-label" style={{ letterSpacing: '0.2em' }}>{label}</span>
    </motion.div>
  );
}

export function DeckPile({ onClick }: { onClick?: () => void }) {
  const drawPile = useGameStore((s) => s.drawPile);
  return <Pile count={drawPile.length} label="牌库" icon="deck" accent="#7ea6d8" onClick={onClick} />;
}

export function DiscardPile({ onClick }: { onClick?: () => void }) {
  const discardPile = useGameStore((s) => s.discardPile);
  return <Pile count={discardPile.length} label="弃牌" icon="trash" accent="#8a94ab" onClick={onClick} />;
}

export function ExhaustPile({ onClick }: { onClick?: () => void }) {
  const exhaustPile = useGameStore((s) => s.exhaustPile);
  return <Pile count={exhaustPile.length} label="消耗" icon="flame" accent="#fb923c" onClick={onClick} />;
}
