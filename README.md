# Chain Reaction - 链式反应

[![Vercel Deploy](https://img.shields.io/badge/Vercel-Deployed-success?logo=vercel)](https://chain-reaction-demo.vercel.app)

一款基于**管道序列（Pipeline）**的卡牌 Roguelike。你将卡牌排入槽位，卡牌按序结算形成连锁；敌人攻击的不是你，而是你的**槽位**——每一张牌既是进攻，也是那一格的守军。

## 快速开始

```bash
npm install
npm run dev      # 开发模式 http://localhost:5173
npm run build    # 类型检查 + 生产构建
npm run lint     # ESLint
npm run preview  # 预览生产构建
```

## 技术栈

React 19 · TypeScript · Vite · Tailwind CSS 4 · Zustand(Immer) · @dnd-kit · Framer Motion

## 文档导航

| 文档 | 内容 |
|------|------|
| [docs/REVIEW.md](./docs/REVIEW.md) | 2026-09 全面代码审查报告（Bug/冗余/UX/性能） |
| [docs/IMPROVEMENT_PLAN.md](./docs/IMPROVEMENT_PLAN.md) | 修复优化与数值机制重构总体方案 |
| [docs/BALANCE.md](./docs/BALANCE.md) | 数值白皮书（数值框架、曲线、卡牌表） |
| [docs/legacy/](./docs/legacy/) | 早期策划配置表（历史参考） |

## 项目结构

```
src/
├── components/   # React 组件（战斗、地图、商店、奖励等界面）
├── data/         # 卡牌模板 / 敌人模板 / 地图生成
├── engine/       # 效果注册表、管道执行、槽位战斗结算（纯函数核心）
├── store/        # runStore（Roguelike 长线） + gameStore（单场战斗）
└── types/        # TypeScript 类型与常量
```

## 核心规则速览

- **阶段一**：手牌拖入 5~8 个管道槽位，从左到右依次结算；修饰卡改写后续卡牌（×N、重复 N 次、共鸣…）
- **阶段二**：敌人按公示意图攻击特定槽位——有盾格挡、有卡换血、空槽受击且叠"破绽"
- **阶段三**：管道累计总伤害扣敌人血，生成下回合意图
- **Roguelike**：多层地图（战斗/商店/休息/事件/精英/Boss），战后排卡、金币、遗物、槽位扩建

