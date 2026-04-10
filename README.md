# Chain Reaction - 链式反应

一款基于管道序列(Pipeline)的卡牌对战 Demo，灵感来自 Slay the Spire 的战斗系统。玩家将卡牌放置到管道槽位中，按顺序执行效果来攻击敌人并防御敌方的槽位攻击。

---

## 目录

- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [游戏逻辑与规则](#游戏逻辑与规则)
  - [Roguelike 流程](#roguelike-流程)
  - [战斗规则 (槽位攻防 2.0)](#战斗规则-槽位攻防-20)
  - [卡牌系统](#卡牌系统)
  - [敌人系统](#敌人系统)
  - [Buff/Debuff 系统](#buffdebuff-系统)
- [数据配置逻辑](#数据配置逻辑)
  - [卡牌配置](#卡牌配置)
  - [敌人配置](#敌人配置)
  - [地图配置](#地图配置)
  - [常量配置](#常量配置)
- [效果系统扩展指南](#效果系统扩展指南)
- [美术资源替换](#美术资源替换)
- [维护与修改指南](#维护与修改指南)

---

## 技术栈

| 分类     | 技术                                  |
| -------- | ------------------------------------- |
| 框架     | React 19 + TypeScript 6               |
| 构建工具 | Vite 8                                |
| 样式     | Tailwind CSS 4 (`@tailwindcss/vite`)  |
| 状态管理 | Zustand 5 + Immer                     |
| 拖拽     | @dnd-kit/core + @dnd-kit/sortable     |
| 动画     | Framer Motion 12                      |
| ID生成   | uuid                                  |

---

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（默认端口 5173）
npm run dev

# 生产构建（输出到 dist/）
npm run build

# 预览生产构建
npm run preview

# Lint 检查
npm run lint
```

构建命令 `npm run build` 会先执行 `tsc -b` 进行 TypeScript 类型检查，再由 Vite 打包。

---

## 项目结构

```
chain-reaction/
├── public/                     # 静态资源（不经过 Vite 处理）
│   ├── favicon.svg             # 站点图标
│   └── icons.svg               # 通用图标精灵图
├── src/
│   ├── assets/                 # 需经过 Vite 处理的资源
│   │   ├── hero.png            # 首页主视觉
│   │   ├── react.svg
│   │   └── vite.svg
│   ├── components/             # React 组件
│   │   ├── Card.tsx            # 单张卡牌渲染（拖拽源）
│   │   ├── CardListModal.tsx   # 查看牌库/弃牌堆弹窗
│   │   ├── DeckAndDiscard.tsx  # 牌库/弃牌堆入口按钮
│   │   ├── EnemyArea.tsx       # 敌人信息与攻击意图展示
│   │   ├── GameArena.tsx       # 战斗场景主容器（组装各区域）
│   │   ├── HandArea.tsx        # 手牌区（可拖拽）
│   │   ├── MapScreen.tsx       # Roguelike 地图界面
│   │   ├── PipelineBoard.tsx   # 管道槽位面板（核心交互）
│   │   ├── PlayerPanel.tsx     # 玩家HP/护甲/Debuff 状态
│   │   ├── RewardScreen.tsx    # 战斗胜利奖励选择
│   │   ├── RunHUD.tsx          # Run 全局HUD（金币、层数）
│   │   └── ShopScreen.tsx      # 商店界面
│   ├── data/                   # 静态数据定义
│   │   ├── cardData.ts         # 卡牌模板、初始牌组、奖励/商店生成
│   │   └── mapData.ts          # 敌人模板、意图生成、地图生成
│   ├── engine/                 # 战斗逻辑引擎
│   │   └── effectRegistry.ts   # 效果注册表、管道执行、槽位战斗结算
│   ├── store/                  # Zustand 状态仓库
│   │   ├── gameStore.ts        # 单场战斗状态（手牌、管道、回合流程）
│   │   └── runStore.ts         # Roguelike 长线状态（牌组、地图、HP、金币）
│   ├── types/
│   │   └── index.ts            # 全部 TypeScript 类型定义
│   ├── App.tsx                 # 根组件（场景路由）
│   ├── index.css               # 全局样式（Tailwind 入口）
│   └── main.tsx                # 入口文件
├── card_config.xlsx            # Excel 策划配置表（参考用）
├── index.html                  # HTML 入口
├── package.json
├── tsconfig.json               # TypeScript 配置入口
├── tsconfig.app.json           # 应用 TS 配置
├── tsconfig.node.json          # Node 端 TS 配置
├── vite.config.ts              # Vite 配置
└── eslint.config.js            # ESLint 配置
```

---

## 游戏逻辑与规则

### Roguelike 流程

游戏采用单次 Run 的 Roguelike 模式：

1. **标题画面** -> 点击开始新 Run
2. **地图选择** -> 4层节点地图，每层有多个分支节点
   - **战斗节点** (BATTLE)：进入卡牌战斗
   - **商店节点** (SHOP)：花金币买卡/移除卡
   - **休息节点** (REST)：回复 30% 最大HP
   - **Boss节点** (BOSS)：第4层，击败后通关
3. **战斗** -> 胜利后进入奖励，失败则 Run 结束
4. **奖励** -> 三选一卡牌（加权随机）+ 金币 + 概率获得额外管道槽位
5. 循环直到 Boss 被击败或玩家HP归零

**地图生成规则：**
- 4层结构：`[2节点, 3节点, 3节点, 1节点(Boss)]`
- 第1层固定为战斗节点
- 第2-3层按权重随机：战斗50% / 商店30% / 休息20%
- 节点间通过连线确定可到达路径

### 战斗规则 (槽位攻防 2.0)

战斗分为三个阶段依次执行：

#### 阶段一：管道序列计算 (EXECUTE_PHASE1)

- 玩家从手牌中拖拽卡牌到管道槽位
- 所有槽位填满后（被锁定的槽位除外），可查看**伤害预览**
- 点击"执行"后，管道从左到右依次结算卡牌效果
- **两遍扫描机制：**
  - 第一遍（预扫描）：标记共鸣增幅(RESONANCE_AMP)位置和燃烧(BURNING)槽位
  - 第二遍（主执行）：按顺序执行每张卡牌的效果，应用共鸣翻倍和燃烧减半
- 结算结果：累计总伤害、每个槽位的护甲值、伤害贡献值

#### 阶段二：怪物槽位攻击判定 (EXECUTE_PHASE2)

敌人按照回合开始时公示的**攻击意图**，对玩家管道的特定槽位发动攻击。每个被攻击的槽位根据其卡牌和护甲情况判定：

| 情况 | 条件 | 结果 |
|------|------|------|
| A: 防御抵消 | 槽位有护甲(armor > 0) | 护甲先抵消伤害，溢出部分扣HP |
| B: 换血拼刀 | 槽位有有效卡牌但无护甲 | 伤害直接扣玩家HP |
| C: 空门大开 | 槽位为空 / 修饰卡无效 | 伤害直接扣HP + 附加1层"破绽"debuff |

#### 阶段三：伤害结算 (EXECUTE_PHASE3)

- 管道累计总伤害扣减敌人HP（先扣护甲，再扣血）
- 如有镜面反射成功抵挡伤害，反弹值附加到总伤害
- 处理debuff效果（燃烧标记、破绽叠加等）
- 生成敌人下回合攻击意图
- 自动进入下一回合

### 卡牌系统

卡牌分为两大类：

#### 行动卡 (ACTION)

直接产生数值效果，放入管道后在阶段一执行。

| 卡牌名 | effectId | baseValue | 效果描述 |
|---------|----------|-----------|----------|
| 火焰弹 | DEAL_DAMAGE | 6 | 造成 6 点伤害 |
| 雷击 | DEAL_DAMAGE | 9 | 造成 9 点伤害 |
| 寒冰箭 | DEAL_DAMAGE | 4 | 造成 4 点伤害 |
| 暗影刺 | DEAL_DAMAGE | 3 | 造成 3 点伤害 |
| 陨石术 | DEAL_DAMAGE | 15 | 造成 15 点伤害 |
| 毒雾 | DEAL_DAMAGE | 7 | 造成 7 点伤害 |
| 石肤术 | GAIN_ARMOR | 5 | 获得 5 点护甲 |
| 铁壁 | GAIN_ARMOR | 8 | 获得 8 点护甲 |
| 魔法盾 | GAIN_ARMOR | 3 | 获得 3 点护甲 |
| 神圣护盾 | GAIN_ARMOR | 12 | 获得 12 点护甲 |
| 移形换影 | PHASE_SHIFT | 3 | 造成 3 点伤害，被攻击时伤害转移至右侧槽位 |
| 镜面反射 | MIRROR_REFLECT | 5 | 获得 5 点护甲，成功抵挡后反弹伤害附加给总攻击 |

#### 修饰卡 (MODIFIER)

不直接产生数值，修改后续卡牌的执行参数。

| 卡牌名 | effectId | baseValue | 效果描述 |
|---------|----------|-----------|----------|
| 力量倍增 | MULTIPLY_NEXT | 2 | 下一张牌效果 x2 |
| 三连击 | REPEAT_NEXT | 3 | 下一张牌触发 3 次 |
| 蓄力 | MULTIPLY_NEXT | 5 | 下一张牌效果 x5 |
| 连锁反应 | REPEAT_NEXT | 4 | 下一张牌触发 4 次 |
| 双倍奉还 | MULTIPLY_NEXT | 3 | 下一张牌效果 x3 |
| 共鸣增幅 | RESONANCE_AMP | 2 | 左右相邻卡牌数值 x2，本身不提供数值 |
| 背水一战 | DESPERATE_STRIKE | 0 | 下一张攻击卡增加值 = 本回合将损失的血量 |
| 连锁防线 | CHAIN_DEFENSE | 0 | 前一张卡的护甲值覆盖到所有无护甲槽位 |

### 敌人系统

#### 攻击模式

每种敌人拥有一组**攻击模式配置**（带权重），每回合根据权重随机选择一种模式生成攻击意图：

| 模式 | 标识 | 行为描述 |
|------|------|----------|
| 单体攻击 | SINGLE | 随机选择 1 个槽位攻击 |
| 范围顺劈 | AREA_SWEEP | 连续覆盖 N 个相邻槽位（N 由 slotSpan 配置） |
| 蔓延火焰 | SPREADING_FLAME | 攻击 1 个槽位，若造成HP损失则标记该槽位"燃烧" |
| 弱点狙击 | WEAK_POINT_SNIPE | 意图生成时目标未定，执行时锁定 baseValue 最高的卡牌所在槽位 |
| 空间禁锢 | SPATIAL_LOCK | 锁定 1 个槽位（玩家无法放牌）+ 攻击另一个槽位 |

#### 敌人分布

- **第1层**：史莱姆(SINGLE)、骷髅兵(AREA_SWEEP)
- **第2层**：暗影刺客(SNIPE为主)、石像鬼(LOCK为主)、火焰元素(FLAME为主)
- **第3层**：暗夜巫师(SNIPE+FLAME)、铁甲傀儡(LOCK+SWEEP)、冰霜巨人(SWEEP+LOCK)
- **Boss**：远古巨龙、深渊领主、虚空之眼（混合多种高级模式）

### Buff/Debuff 系统

| 类型 | 标识 | 效果 |
|------|------|------|
| 破绽 | VULNERABLE | 受到的伤害 +15% 每层，被空门大开叠加 |
| 燃烧 | BURNING | 被标记槽位上的卡牌 baseValue 减半 |

- 两者均有**层数**(stacks)和**持续回合**(duration)
- 每回合结束时 duration 减 1，归零时移除

---

## 数据配置逻辑

### 卡牌配置

**文件：** `src/data/cardData.ts`

卡牌通过 `CardTemplate` 接口定义，关键字段：

```typescript
interface CardTemplate {
  templateId: string;   // 唯一标识，如 'atk_001'
  name: string;         // 显示名称
  type: CardType;       // 'ACTION' | 'MODIFIER'
  baseValue: number;    // 基础数值（伤害/护甲/倍率）
  effectId: string;     // 对应 effectRegistry 中的效果函数键名
  artPath: string;      // 卡面美术路径（预留）
  description: string;  // 卡牌描述文本
  color: string;        // 卡牌主题色（十六进制）
  rewardWeight: number; // 奖励出现权重（0=不出现在奖励中）
}
```

**两个卡池：**
- `CARD_TEMPLATES`：初始牌组卡牌（每种2张组成初始牌库）
- `EXTRA_CARD_TEMPLATES`：仅通过奖励/商店获取的卡牌

**权重说明：**
- `20` = 常见，`15` = 较常见，`10` = 普通
- `5` = 稀有，`3` = 极稀有，`2` = 传说级
- `0` = 不会出现在奖励池中

**添加新卡牌步骤：**
1. 在 `cardData.ts` 的 `CARD_TEMPLATES` 或 `EXTRA_CARD_TEMPLATES` 数组中添加新模板
2. 如果需要新效果，在 `effectRegistry.ts` 的 `EffectRegistry` 对象中注册对应 `effectId` 的函数
3. 如果需要卡面特殊图标，在 `Card.tsx` 的 `getSpecialIcon()` 和 `getDisplayValue()` 中添加映射

### 敌人配置

**文件：** `src/data/mapData.ts`

敌人通过 `EnemyTemplate` 接口定义：

```typescript
interface EnemyTemplate {
  name: string;                        // 显示名称
  emoji: string;                       // Emoji图标
  maxHp: number;                       // 最大HP
  baseDamage: number;                  // 基础攻击力
  damageVariance: number;              // 伤害浮动范围（0 ~ damageVariance）
  attackPatterns: AttackPatternConfig[]; // 攻击模式列表（带权重）
}
```

**攻击模式配置：**
```typescript
interface AttackPatternConfig {
  pattern: AttackPattern;  // 模式类型
  slotSpan?: number;       // 仅 AREA_SWEEP 使用，覆盖槽位数
  weight: number;          // 选择权重
}
```

**数据组织方式：**
- `LAYER_ENEMIES`：二维数组，按地图层级分组 `[第1层[], 第2层[], 第3层[]]`
- `BOSS_TEMPLATES`：Boss 模板数组

**添加新敌人步骤：**
1. 在对应层级数组中添加 `EnemyTemplate` 对象
2. 配置 `attackPatterns` 数组，注意 weight 之和无需为 100（系统会归一化计算）
3. 如需新攻击模式，需修改 `AttackPattern` 类型定义和 `generateEnemyIntent()` 中的 switch 分支

### 地图配置

同在 `src/data/mapData.ts` 中：

```typescript
// 每层节点数量
const LAYER_NODE_COUNTS = [2, 3, 3, 1];

// 每层节点类型权重
const NODE_TYPE_WEIGHTS = {
  0: [{ type: 'BATTLE', weight: 1 }],           // 第1层固定战斗
  1: [/* BATTLE:50, SHOP:30, REST:20 */],        // 第2层混合
  2: [/* BATTLE:50, SHOP:30, REST:20 */],        // 第3层混合
  3: [{ type: 'BOSS', weight: 1 }],             // 第4层固定Boss
};
```

修改层数/节点数/类型权重可直接编辑这两个常量。

### 常量配置

**文件：** `src/types/index.ts` 底部

```typescript
export const DEFAULT_PIPELINE_SLOTS = 5;    // 初始管道槽位数
export const DEFAULT_HAND_DRAW_COUNT = 8;   // 每回合抽牌数
export const PLAYER_MAX_HP = 120;           // 玩家初始最大HP
export const REMOVE_CARD_COST = 50;         // 商店移除卡牌费用
```

---

## 效果系统扩展指南

效果系统位于 `src/engine/effectRegistry.ts`，是整个战斗逻辑的核心。

### 效果函数签名

```typescript
type EffectFunction = (
  context: ExecutionContext,   // 当前累计执行上下文
  card: CardInstance,          // 当前执行的卡牌（baseValue 可能已被共鸣/燃烧修改）
  slotIndex: number,           // 卡牌所在的管道槽位索引
  pipeline: (CardInstance | null)[], // 完整管道数组
) => ExecutionContext;         // 返回更新后的上下文
```

### 添加新效果步骤

1. 在 `EffectRegistry` 对象中添加新的键值对：

```typescript
MY_NEW_EFFECT: (ctx, card, slotIndex, pipeline) => {
  // 实现效果逻辑
  return { ...ctx, /* 更新的字段 */ };
},
```

2. 在 `cardData.ts` 中创建使用该 effectId 的卡牌模板
3. 注意效果函数必须是**纯函数**（不修改入参，返回新对象）

### 关键执行流程

```
executePipelineV2()           <- 阶段一：管道执行
  |-- 预扫描：标记共鸣/燃烧
  |-- 主执行：依次调用 EffectRegistry[effectId]
resolveSlotCombat()           <- 阶段二：槽位攻防判定
simulateForDesperateStrike()  <- 背水一战预计算（在阶段一之前执行）
```

### ExecutionContext 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| accumulatedDamage | number | 累计总伤害（最终扣敌人HP） |
| accumulatedArmor | number | 累计总护甲（仅用于日志显示） |
| nextCardMultiplier | number | 下一张卡的倍率（MULTIPLY_NEXT设置） |
| nextCardRepeats | number | 下一张卡的重复次数（REPEAT_NEXT设置） |
| slotArmors | number[] | 每个槽位的护甲值 |
| slotDamageContributions | number[] | 每个槽位的伤害贡献 |
| damageRedirectMap | Record<number, number> | 移形换影的伤害转移映射 |
| reflectPendingSlot | number \| null | 镜面反射所在槽位 |
| desperateHpLoss | number | 背水一战预计算的HP损失值 |

---

## 美术资源替换

### 当前资源位置

| 资源 | 路径 | 说明 |
|------|------|------|
| 站点图标 | `public/favicon.svg` | 浏览器标签页图标 |
| 图标精灵 | `public/icons.svg` | 通用 SVG 图标集 |
| 首页主视觉 | `src/assets/hero.png` | 标题画面背景图 |
| 卡面美术 | 各卡牌 `artPath` 字段 | 预留路径，默认为 `/assets/cards/xxx.png` |

### 替换方式

**静态资源（public/）：** 直接替换同名文件，无需修改代码。URL 路径不变。

**打包资源（src/assets/）：** 替换同名文件后，Vite 会自动处理哈希和路径。如需添加新图片：

```typescript
import myImage from '../assets/my-image.png';
// 在 JSX 中使用: <img src={myImage} />
```

**卡牌美术：** 目前卡面使用 color 字段的纯色背景 + Emoji/文字渲染。如需替换为实际图片：

1. 将卡面图片放到 `public/assets/cards/` 目录
2. 确保文件名与卡牌模板的 `artPath` 一致（如 `/assets/cards/atk_001.png`）
3. 修改 `Card.tsx` 组件，将纯色背景替换为 `<img src={card.artPath} />` 渲染

**敌人美术：** 目前使用 `emoji` 字段显示。如需替换：
1. 在 `EnemyTemplate` 中添加 `artPath` 字段
2. 修改 `EnemyArea.tsx` 用图片替代 emoji 显示

---

## 维护与修改指南

### 状态管理架构

项目使用双 Store 架构（Zustand + Immer）：

- **`runStore.ts`** -- Roguelike 长线状态
  - 管理：场景路由、金币、HP、牌组、管道槽位数、地图
  - 生命周期：整个 Run 期间持续
  - 修改时机：开始新Run、地图选择、战斗结算、商店交易

- **`gameStore.ts`** -- 单场战斗状态
  - 管理：手牌、管道、回合阶段、敌人、槽位状态、预览
  - 生命周期：单场战斗期间
  - 修改时机：抽牌、放牌、执行、结算

### 常见修改场景

| 需求 | 需修改的文件 |
|------|-------------|
| 添加新卡牌 | `cardData.ts` + 可能 `effectRegistry.ts` + 可能 `Card.tsx` |
| 添加新敌人 | `mapData.ts` |
| 添加新攻击模式 | `types/index.ts` + `mapData.ts` + `effectRegistry.ts` + `PipelineBoard.tsx` + `EnemyArea.tsx` |
| 添加新Debuff | `types/index.ts` + `effectRegistry.ts` + `gameStore.ts` + `PlayerPanel.tsx` |
| 修改战斗数值 | `cardData.ts`(卡牌) / `mapData.ts`(敌人) / `types/index.ts`(常量) |
| 修改地图结构 | `mapData.ts` 中的 `LAYER_NODE_COUNTS` 和 `NODE_TYPE_WEIGHTS` |
| 修改奖励逻辑 | `cardData.ts` 中的 `generateRewardCards()` / `runStore.ts` 中的 `onBattleVictory()` |
| 修改UI布局 | 对应 `components/` 下的 `.tsx` 文件 |
| 修改动画效果 | 对应组件中的 `framer-motion` 配置 |

### TypeScript 注意事项

- 项目启用了 `verbatimModuleSyntax`：纯类型导入必须用 `import type { Foo }` 语法
- 项目启用了 `erasableSyntaxOnly`：不能使用 `enum`，用 `as const` 对象 + 同名 type 代替
- 修改类型定义后运行 `npm run build` 验证全项目类型安全

### Excel 配置表

项目根目录下有 `card_config.xlsx` 文件，包含4个Sheet：
- **卡牌配置表**：卡牌 ID、名称、类型、数值等
- **敌人配置表**：敌人名称、HP、攻击力等
- **效果ID说明**：各 effectId 的文字说明
- **权重说明**：rewardWeight 各档位含义

该 Excel 作为策划参考文档，实际数据以 `cardData.ts` 和 `mapData.ts` 中的代码为准。如需实现从 Excel 自动导入，可利用 devDependencies 中已有的 `xlsx` 库编写导入脚本。
