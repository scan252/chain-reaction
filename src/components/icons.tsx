import type { ReactNode, CSSProperties } from 'react';

/* ============================================================
   符文图标库 · 24×24
   替代全局 emoji，统一线宽 1.8 的蚀刻线稿 + 少量实心徽记
   ============================================================ */

/** 线稿图标（stroke = currentColor） */
const STROKE: Record<string, ReactNode> = {
  // 战斗 / 地图节点
  swords: (
    <>
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
      <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
      <line x1="5" y1="14" x2="9" y2="18" />
      <line x1="7" y1="17" x2="4" y2="20" />
      <line x1="3" y1="19" x2="5" y2="21" />
    </>
  ),
  sword: (
    <>
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
    </>
  ),
  shield: (
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  ),
  skull: (
    <>
      <path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20" />
      <path d="M8 20v2h8v-2" />
      <path d="m12.5 17-.5-1-.5 1h1z" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  crown: (
    <>
      <path d="M11.6 3.3a.5.5 0 0 1 .8 0l2.9 5.5a1 1 0 0 0 1.5.3l4.2-3.6a.5.5 0 0 1 .8.5l-2.8 10.2a1 1 0 0 1-1 .8H6a1 1 0 0 1-1-.8L2.2 6a.5.5 0 0 1 .8-.5l4.2 3.6a1 1 0 0 0 1.5-.3z" />
      <path d="M5 21h14" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5 15.5 12 12 16.5 8.5 12z" />
    </>
  ),
  tent: (
    <>
      <path d="M3.5 21 14 4" />
      <path d="M20.5 21 10 4" />
      <path d="M15.5 21 12 15l-3.5 6" />
      <path d="M2 21h20" />
    </>
  ),
  gift: (
    <>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </>
  ),
  shop: (
    <>
      <path d="M3 9l1.6-5h14.8L21 9" />
      <path d="M3 9h18v2.5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z" />
      <path d="M5 13.5V21h14v-7.5" />
      <path d="M9.5 21v-4.5h5V21" />
    </>
  ),
  // 流派 / 关键词
  bolt: <path d="M13 2 4.5 13.5H11L9.5 22 19.5 10H13z" />,
  waves: (
    <>
      <path d="M2 8c2-2.2 4-2.2 6 0s4 2.2 6 0 4-2.2 6 0" />
      <path d="M2 13c2-2.2 4-2.2 6 0s4 2.2 6 0 4-2.2 6 0" />
      <path d="M2 18c2-2.2 4-2.2 6 0s4 2.2 6 0 4-2.2 6 0" />
    </>
  ),
  riposte: (
    <>
      <path d="M9 17l-5-5 5-5" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </>
  ),
  hexagon: (
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  // 意图
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  burst: (
    <>
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      <path d="M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
    </>
  ),
  vortex: (
    <>
      <path d="M21 12a9 9 0 1 1-9-9" />
      <path d="M17 12a5 5 0 1 1-5-5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  hourglass: (
    <>
      <path d="M5 22h14M5 2h14" />
      <path d="M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4A2 2 0 0 0 7 17.8V22" />
      <path d="M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4A2 2 0 0 0 17 6.2V2" />
    </>
  ),
  // 资源 / 状态
  gem: (
    <>
      <path d="M12 3l7 9-7 9-7-9z" />
      <path d="M12 8l3.5 4L12 16l-3.5-4z" />
    </>
  ),
  deck: (
    <>
      <path d="m12.8 2.2a2 2 0 0 0-1.6 0L2.6 6.1a1 1 0 0 0 0 1.8l8.6 3.9a2 2 0 0 0 1.6 0l8.6-3.9a1 1 0 0 0 0-1.8z" />
      <path d="m22 17.6-9.2 4.2a2 2 0 0 1-1.6 0L2 17.6" />
      <path d="m22 12.6-9.2 4.2a2 2 0 0 1-1.6 0L2 12.6" />
    </>
  ),
  scroll: (
    <>
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
      <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />
    </>
  ),
  hammer: (
    <>
      <path d="m15 12-8.4 8.4a1 1 0 1 1-1.4-1.4L13.5 10.5" />
      <path d="m18 15 4-4" />
      <path d="m21.5 11.5-1.9-1.9a2 2 0 0 1-.6-1.4V7l-2.3-2.3a6 6 0 0 0-4.2-1.7L9 2.9l.9.8A6.2 6.2 0 0 1 12 8.4V10l2 2h1.2a2 2 0 0 1 1.4.6l1.9 1.9" />
    </>
  ),
  moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />,
  sparkle: (
    <path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z" />
  ),
  star: (
    <path d="M12 2l3.1 6.3L22 9.3l-5 4.9 1.2 6.9L12 17.8l-6.2 3.2L7 14.1 2 9.3l6.9-1z" />
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  flag: (
    <path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 8 2 1 0 2-.2 3-.6a1 1 0 0 1 1.4.9v9.4a1 1 0 0 1-.6.9c-1 .5-2.4.8-3.8.8-3 0-5-2-8-2-1 0-2 .2-3 .5" />
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  // 通用 UI
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevrons: <path d="M6 14l6-6 6 6M6 20l6-6 6 6" />,
  skip: (
    <>
      <path d="M5 4l10 8-10 8z" />
      <path d="M19 5v14" />
    </>
  ),
  x: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="M20 6 9 17l-5-5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 1.5-2.5 2-2.5 3.5" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
};

/** 实心徽记（fill = currentColor） */
const FILL: Record<string, ReactNode> = {
  heart: (
    <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" />
  ),
  drop: (
    <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
  ),
  flame: (
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  ),
};

const ICONS: Record<string, { node: ReactNode; filled: boolean }> = {
  ...Object.fromEntries(Object.entries(STROKE).map(([k, v]) => [k, { node: v, filled: false }])),
  ...Object.fromEntries(Object.entries(FILL).map(([k, v]) => [k, { node: v, filled: true }])),
};

export type IconName = keyof typeof STROKE | keyof typeof FILL;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}

export function Icon({ name, size = 16, className, style, strokeWidth = 1.8 }: IconProps) {
  const icon = ICONS[name];
  if (!icon) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
      fill={icon.filled ? 'currentColor' : 'none'}
      stroke={icon.filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {icon.node}
    </svg>
  );
}
