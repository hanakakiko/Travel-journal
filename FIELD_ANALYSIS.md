# EXIF 项目字段实现详细分析

## 1. 字段概览

本项目中需要分析的字段有 7 个：

| 字段 | 类型 | 位置 | 当前实现 |
|-----|------|------|---------|
| **scene**（场景） | 单选 | types.ts L10 | UserAnswers 中 |
| **narrator**（叙述方式） | 单选 | types.ts L12 | UserAnswers 中 |
| **palette**（色调）✓ 顶层 | 单选 | types.ts L23 | UserAnswers 中 |
| **paperTexture**（底图纸张）✓ 顶层 | 单选 | types.ts L40 | UserAnswers 中 |
| **mainColor**（画面主色调）✓ 顶层 | 单选 | types.ts L25 | UserAnswers 中 |
| **style**（风格） | 单选 | types.ts L103 | 独立状态 styleId |
| **template**（模板） | 单选 | types.ts L105 | 独立状态 templateId |

---

## 2. 详细字段分析

### 2.1 scene（场景）

**位置信息：**
- 类型定义：`/src/types.ts` L10：`scene: string`
- 预设列表：`/src/data/presets.ts` L54-215：`sceneOptions`（6 个场景）
- 使用位置：`/src/App.tsx` L1663-1674

**当前实现：**
- **类型**：单选
- **渲染方式**：ChoiceButton 组件（L1664-1673）
  ```tsx
  {sceneOptions.map((scene) => (
    <ChoiceButton
      key={scene.name}
      active={answers.scene === scene.name}
      onClick={() => onSetAnswers((current) => ({ ...current, scene: scene.name }))}
    >
      {scene.name}
    </ChoiceButton>
  ))}
  ```
- **预设选项**：共 6 个
  1. "一次旅程" → tag: "旅行"
  2. "城市散步" → tag: "城市"
  3. "周末日常" → tag: "日常"
  4. "朋友聚会" → tag: "聚会"
  5. "独处片刻" → tag: "独处"
  6. "纪念日" → tag: "纪念"
- **选择变化处理**：直接更新 `answers.scene`
- **自定义选项支持**：❌ 不支持（预设为固定列表）
- **关键特性**：每个场景可动态展示不同的补充字段（SceneDetails）

---

### 2.2 narrator（叙述方式）

**位置信息：**
- 类型定义：`/src/types.ts` L12：`narrator: string`
- 预设列表：`/src/data/presets.ts` L222-227：`narratorOptions`（4 个）
- 使用位置：`/src/App.tsx` L1689-1700

**当前实现：**
- **类型**：单选
- **渲染方式**：ChoiceButton 组件
  ```tsx
  {narratorOptions.map((narrator) => (
    <ChoiceButton
      key={narrator}
      active={answers.narrator === narrator}
      onClick={() => onSetAnswers((current) => ({ ...current, narrator }))}
      onSound={onSound}
    >
      {narrator}
    </ChoiceButton>
  ))}
  ```
- **预设选项**：共 4 个
  1. "写给未来自己的信"
  2. "像旅行档案一样整理"
  3. "像一本精致生活杂志"
  4. "像朋友在夜里低声讲述"
- **选择变化处理**：直接更新 `answers.narrator`
- **自定义选项支持**：❌ 不支持
- **在 Prompt 中的用途**：
  - 在 `buildKratosPrompt` (L565) 中：随机选一个作为 LLM 风格指导
  - 在 `buildVisualFlavorPhrase` 中间接使用

---

### 2.3 palette（色调）✅ **顶层**

**位置信息：**
- 类型定义：`/src/types.ts` L23：`palette?: string`
- 预设列表：`/src/data/presets.ts` L234-241：`paletteOptions`（6 个）
- 使用位置：`/src/App.tsx` L2247-2263

**当前实现：**
- **类型**：单选（可清空）
- **渲染方式**：FlavorGroup 内的 chip 按钮
  ```tsx
  <FlavorGroup title="色调（单选）">
    {paletteOptions.map((opt) => (
      <button
        key={opt.id}
        className={classNames("chip chip-with-hint", answers.palette === opt.label && "is-on")}
        onClick={() => {
          onSound("tap");
          onSetSingleChoice("palette", opt.label);
        }}
      >
        <b>{opt.label}</b>
        <em>{opt.short}</em>
      </button>
    ))}
  </FlavorGroup>
  ```
- **预设选项**：共 6 个（带 short 描述）
  1. "暖色胶片" (warm-film)
  2. "冷色清透" (cool-clean)
  3. "马卡龙柔色" (pastel-soft)
  4. "深夜墨蓝" (deep-night)
  5. "大地复古" (earth-vintage)
  6. "高反差强对比" (high-contrast)
- **选择变化处理**：`setSingleChoice("palette", value)` → 同值再次点击清空
- **自定义选项支持**：❌ 不支持
- **UI 位置**：InfoModal 中的 **VisualFlavorPanel**（行 L2236-2363）
- **在 Prompt 中的用途**：
  - `buildVisualFlavorPhrase` (L409)：`answers.palette || randomPick(paletteOptions).label`
  - 体现为："整体色调倾向于「{palette}」的视觉氛围"

---

### 2.4 paperTexture（底图纸张）✅ **顶层**

**位置信息：**
- 类型定义：`/src/types.ts` L40：`paperTexture?: string`
- 预设列表：`/src/data/presets.ts` L328-336：`paperOptions`（7 个）
- 使用位置：`/src/App.tsx` L2309-2325

**当前实现：**
- **类型**：单选（可清空）
- **渲染方式**：FlavorGroup 内的 chip 按钮
  ```tsx
  <FlavorGroup title="底图纸张（单选）">
    {paperOptions.map((opt) => (
      <button
        key={opt.id}
        className={classNames("chip chip-with-hint", answers.paperTexture === opt.label && "is-on")}
        onClick={() => {
          onSound("tap");
          onSetSingleChoice("paperTexture", opt.label);
        }}
      >
        <b>{opt.label}</b>
        <em>{opt.short}</em>
      </button>
    ))}
  </FlavorGroup>
  ```
- **预设选项**：共 7 个
  1. "米色道林纸" (cream-linen)
  2. "宣纸 / 米纸" (rice-paper)
  3. "牛皮纸" (kraft)
  4. "淡蓝网格" (blue-grid)
  5. "拍立得相纸" (polaroid)
  6. "深蓝夜纸" (night-paper)
  7. "水彩纹理" (watercolor)
- **选择变化处理**：`setSingleChoice("paperTexture", value)` → 同值再次点击清空
- **自定义选项支持**：❌ 不支持
- **UI 位置**：InfoModal 中的 **VisualFlavorPanel** 内（第 7 段）
- **在 Prompt 中的用途**：
  - `buildVisualFlavorPhrase` (L491)：`answers.paperTexture || randomPick(paperOptions).label`
  - 体现为："整张拼贴的底层纸感采用「{paperTexture}」的质地与色调"

---

### 2.5 mainColor（画面主色调）✅ **顶层**

**位置信息：**
- 类型定义：`/src/types.ts` L25：`mainColor?: string`
- 预设列表：`/src/data/presets.ts` L244-255：`mainColorOptions`（10 个）
- 使用位置：`/src/App.tsx` L2327-2360

**当前实现：**
- **类型**：单选（可清空）
- **渲染方式**：FlavorGroup 内的彩色 chip 按钮（带颜色圆点）
  ```tsx
  <FlavorGroup title="画面主色调（单选 · 可不选）">
    {mainColorOptions.map((opt) => (
      <button
        key={opt.id}
        className={classNames("chip chip-color", answers.mainColor === opt.label && "is-on")}
        onClick={() => {
          onSound("tap");
          onSetAnswers((current) => ({
            ...current,
            mainColor: current.mainColor === opt.label ? undefined : opt.label,
          }));
        }}
      >
        <span style={{ backgroundColor: opt.color, ... }} />
        <span>{opt.label}</span>
      </button>
    ))}
  </FlavorGroup>
  ```
- **预设选项**：共 10 个（每个带对应的 RGB 颜色）
  1. "樱花粉" (#FFB6D9)
  2. "天空蓝" (#87CEEB)
  3. "薄荷绿" (#98FF98)
  4. "薰衣草紫" (#E6B3FF)
  5. "蜜桃橙" (#FFCC99)
  6. "奶油黄" (#FFFACD)
  7. "珊瑚红" (#FF7F7F)
  8. "鼠尾草绿" (#9DC183)
  9. "尘粉玫瑰" (#D8A8A8)
  10. "海洋青" (#5F9EA0)
- **选择变化处理**：直接在 onClick 中处理三目运算（toggle）
- **自定义选项支持**：❌ 不支持
- **UI 位置**：InfoModal 中的 **VisualFlavorPanel** 内（第 8 段，最后）
- **在 Prompt 中的用途**：
  - `buildVisualFlavorPhrase` (L495-496)：仅在有选择时加入
  - 体现为："整张拼贴的底图背景色应该接近「{mainColor}」，照片和装饰元素的色彩可自由丰富搭配"
  - **重要**：注释说"仅用于 UI 展示，不加入 prompt"（types.ts L24），但实际代码中已加入

---

### 2.6 style（风格）

**位置信息：**
- 类型定义：`/src/types.ts` L3, L103-104：`type StyleId = "auto" | "elegant" | "vintage" | "travel" | "soft"`
- 预设列表：`/src/data/presets.ts` L3-13：`stylePresets`（5 个，含 auto）
- 使用位置：`/src/App.tsx` L1752-1776

**当前实现：**
- **类型**：单选
- **渲染方式**：control-row 内的 segmented 按钮组
  ```tsx
  <div className="control-row">
    <div className="band-heading">
      <Palette size={17} />
      风格
    </div>
    <div className="segmented">
      {stylePresets.map((preset) => (
        <button
          key={preset.id}
          className={classNames(styleId === preset.id && "is-active")}
          onClick={() => {
            onSound("tap");
            onSetStyle(preset.id);
          }}
          title={preset.short}
        >
          {preset.name}
        </button>
      ))}
    </div>
  </div>
  ```
- **预设选项**：共 5 个
  1. "auto" → "自动推荐" (由图片决定)
  2. "elegant" → "优雅纸本" (细腻纸纹与杂志留白)
  3. "vintage" → "复古繁盛" (邮票、胶片、贴纸层叠)
  4. "travel" → "旅行档案" (坐标、时间线与票据感)
  5. "soft" → "可爱治愈" (柔和彩签与圆润拼贴)
- **选择变化处理**：`onSetStyle(styleId)` → 更新独立的 styleId 状态
- **自定义选项支持**：❌ 不支持
- **UI 位置**：InfoModal 中的 **control-band** 段（行 L1752-1777）
- **状态管理**：独立的 `styleId` state（不在 answers 中），通过 `setStyleId` 更新
- **在 Prompt 中的用途**：
  - `buildKratosPrompt` (L553)：查找对应的 styleName
  - 体现为："风格定位：{styleName}"

---

### 2.7 template（模板）

**位置信息：**
- 类型定义：`/src/types.ts` L5, L105：`type TemplateId = "atlas" | "collage" | "magazine" | "archive"`
- 预设列表：`/src/data/presets.ts` L15-24：`templatePresets`（4 个）
- 使用位置：`/src/App.tsx` L1778-1802

**当前实现：**
- **类型**：单选
- **渲染方式**：control-row 内的 segmented 按钮组
  ```tsx
  <div className="control-row">
    <div className="band-heading">
      <Layers3 size={17} />
      模板
    </div>
    <div className="segmented">
      {templatePresets.map((preset) => (
        <button
          key={preset.id}
          className={classNames(templateId === preset.id && "is-active")}
          onClick={() => {
            onSound("tap");
            onSetTemplate(preset.id);
          }}
          title={preset.short}
        >
          {preset.name}
        </button>
      ))}
    </div>
  </div>
  ```
- **预设选项**：共 4 个
  1. "atlas" → "图文手帐" (大图 + 细密标签)
  2. "collage" → "繁复拼贴" (照片、票据、贴纸错落)
  3. "magazine" → "杂志跨页" (强标题与精修排版)
  4. "archive" → "旅行档案" (索引、时间、参数并置)
- **选择变化处理**：`onSetTemplate(templateId)` → 更新独立的 templateId 状态
- **自定义选项支持**：❌ 不支持
- **UI 位置**：InfoModal 中的 **control-band** 段（行 L1778-1802）
- **状态管理**：独立的 `templateId` state（不在 answers 中），通过 `setTemplateId` 更新
- **在 Prompt 中的用途**：
  - `buildKratosPrompt` (L554)：查找对应的 templateName
  - 体现为："版式参照：{templateName}"

---

## 3. UI 位置布局图

```
InfoModal (L1576-1885)
├─ header (L1586-1598)
│
├─ modal-scroll (L1600-1861)
│  ├─ control-band：生成模型 (L1602-1650)
│  │
│  ├─ dialogue-band (L1652-1740) ✨ 主要对话流
│  │  ├─ 手帐标题 input (L1654-1661)
│  │  ├─ QuestionGroup: 场景 (L1663-1674) ← SCENE
│  │  ├─ SceneDetails (L1676) ← 动态补充字段
│  │  ├─ EditableTagGroup: 情绪 (L1678-1687) ← mood (多选)
│  │  ├─ QuestionGroup: 叙述方式 (L1689-1700) ← NARRATOR
│  │  └─ 倾诉记录 (L1703-1739)
│  │
│  ├─ VisualFlavorPanel (L1742-1750) ✅ 顶层视觉风味
│  │  ├─ 色调（单选）← PALETTE ✅
│  │  ├─ 氛围（多选）← vibes
│  │  ├─ 排版形状（多选）← layoutShapes
│  │  ├─ 照片边缘风格（多选）← edgeStyles
│  │  ├─ 装饰元素（多选）← decorations
│  │  ├─ 底图纸张（单选）← PAPEREXTURE ✅
│  │  └─ 画面主色调（单选）← MAINCOLOR ✅
│  │
│  ├─ control-band：风格 + 模板 (L1752-1802)
│  │  ├─ 风格 ← STYLE (5 个选项)
│  │  └─ 模板 ← TEMPLATE (4 个选项)
│  │
│  └─ control-band：图片远程链接 (L1804-1860)
│     ├─ 图片列表 + URL 输入
│     └─ PhotoVisionPanel (VLM 识图)
│
└─ modal-footer (L1863-1882)
   ├─ 稍后再说 button
   └─ 装订手帐本 button
```

**关键层级关系：**

1. **Top Level (主面板顶部)** ⭐
   - 生成模型
   - 风格 (style)
   - 模板 (template)

2. **Middle Level (对话流)**
   - 场景 (scene)
   - 叙述方式 (narrator)
   - 情绪 (mood)

3. **Bottom Level (视觉细节)**
   - 色调、纸张、主色调等 (在 VisualFlavorPanel)

---

## 4. 自定义选项支持现状分析

### 4.1 已支持自定义的字段

✅ **mood（情绪）** - 多选
- 位置：App.tsx L1678-1687
- 实现：EditableTagGroup 组件
- 存储位置：`answers.customTags?.mood`
- 支持位置：预设选项后可继续添加自定义标签

✅ **vibes（氛围）** - 多选
- 位置：App.tsx L2265-2274 (VisualFlavorPanel)
- 实现：EditableTagGroup 组件
- 存储位置：`answers.customTags?.vibes`

✅ **layoutShapes（排版形状）** - 多选
- 位置：App.tsx L2276-2285
- 实现：EditableTagGroup 组件
- 存储位置：`answers.customTags?.layoutShapes`

✅ **edgeStyles（边缘风格）** - 多选
- 位置：App.tsx L2287-2296
- 实现：EditableTagGroup 组件
- 存储位置：`answers.customTags?.edgeStyles`

✅ **decorations（装饰元素）** - 多选
- 位置：App.tsx L2298-2307
- 实现：EditableTagGroup 组件
- 存储位置：`answers.customTags?.decorations`

✅ **场景补充字段（dynamically based on scene）** - 可选
- 位置：App.tsx L1943-1960 (SceneDetailControl)
- 实现：SceneDetailControl 组件支持 allowCustom 选项
- 存储位置：`answers.details[field.key]` + `customOptions[field.key]`

### 4.2 需要添加自定义选项支持的字段

❌ **palette（色调）** - 单选
- 当前位置：App.tsx L2247-2263
- 预设数量：6 个
- 需要添加：
  1. 在 paletteOptions 后添加自定义色调输入
  2. 存储到 `answers.customTags?.palette`
  3. 在 prompt 中合并预设和自定义

❌ **paperTexture（底图纸张）** - 单选
- 当前位置：App.tsx L2309-2325
- 预设数量：7 个
- 需要添加：
  1. 在 paperOptions 后添加自定义纸张输入
  2. 存储到 `answers.customTags?.paperTexture`
  3. 在 prompt 中合并预设和自定义

❌ **mainColor（画面主色调）** - 单选
- 当前位置：App.tsx L2327-2360
- 预设数量：10 个
- 需要添加：
  1. 选项不常扩展，但可支持自定义颜色 picker
  2. 存储到 `answers.customTags?.mainColor`
  3. 或直接在界面添加自定义色值输入

❌ **scene（场景）** - 单选
- 当前位置：App.tsx L1663-1674
- 预设数量：6 个（固定）
- 需要添加：
  1. 在场景列表后添加「自定义场景」输入
  2. 存储到 `answers.customTags?.scene` 或扩展 sceneOptions
  3. 需要动态关联对应的补充字段

❌ **narrator（叙述方式）** - 单选
- 当前位置：App.tsx L1689-1700
- 预设数量：4 个
- 需要添加：
  1. 在选项后添加「自定义叙述方式」输入
  2. 存储到 `answers.customTags?.narrator`

❌ **style（风格）** - 单选
- 当前位置：App.tsx L1752-1776
- 预设数量：5 个（含 auto）
- 当前为独立 state，不在 answers 中
- 需要添加：
  1. 扩展为支持自定义风格描述
  2. 或保持固定预设（通常风格很难自定义）

❌ **template（模板）** - 单选
- 当前位置：App.tsx L1778-1802
- 预设数量：4 个
- 当前为独立 state，不在 answers 中
- 需要添加：
  1. 通常为系统预设，难以扩展自定义
  2. 或提供「自定义排版指导」文本输入

---

## 5. 自定义选项实现路线图

### 优先级 P1（应立即实现）

1. **palette（色调）** ← 涉及视觉风味核心
   - 位置：`/src/App.tsx` L2247-2263（VisualFlavorPanel 内）
   - 实现：参考 EditableTagGroup 设计，添加"自定义色调…"输入框
   - 存储：`answers.customTags?.palette` (数组)
   - 改动：
     - types.ts：customTags 支持 palette 字段
     - presets.ts：paletteOptions 保持不变
     - App.tsx：修改 VisualFlavorPanel 中 palette 段落
     - modelClient.ts：buildVisualFlavorPhrase 合并自定义色调

2. **paperTexture（底图纸张）** ← 视觉底层关键
   - 位置：`/src/App.tsx` L2309-2325
   - 实现：同上
   - 存储：`answers.customTags?.paperTexture`
   - 改动：
     - types.ts：customTags 支持 paperTexture 字段
     - App.tsx：修改 VisualFlavorPanel 中 paper 段落
     - modelClient.ts：buildVisualFlavorPhrase 合并自定义纸张

### 优先级 P2（后续可扩展）

3. **mainColor（画面主色调）**
   - 位置：`/src/App.tsx` L2327-2360
   - 实现：可选方案
     - 方案 A：添加「自定义颜色」文本输入（如 #RRGGBB）
     - 方案 B：添加颜色 picker 组件
   - 注意：mainColor "仅用于 UI 展示，不加入 prompt"，需澄清是否改为加入

4. **narrator（叙述方式）**
   - 位置：`/src/App.tsx` L1689-1700
   - 实现：在四个选项后添加「自定义叙述方式」输入
   - 存储：`answers.customTags?.narrator`

### 优先级 P3（难度高，待评估）

5. **scene（场景）**
   - 难点：新增场景需要关联动态补充字段
   - 建议：暂时不实现自定义，保持 6 个预设

6. **style（风格）** 和 **template（模板）**
   - 注意：这两个目前在独立 state，不在 answers 中
   - 建议：保持固定预设，用风格数较低的原因）

---

## 6. 代码位置速查表

| 功能 | 文件路径 | 行号 |
|-----|--------|------|
| 字段类型定义 | `/src/types.ts` | L10, L12, L23, L25, L40, L103-105 |
| 预设选项数据 | `/src/data/presets.ts` | L3-336 |
| 场景补充字段 | `/src/data/presets.ts` | L33-215 |
| App 主组件 | `/src/App.tsx` | L96-207 |
| InfoModal 对话 | `/src/App.tsx` | L1277-1885 |
| 场景选择 | `/src/App.tsx` | L1663-1674 |
| 叙述方式选择 | `/src/App.tsx` | L1689-1700 |
| 视觉风味面板 | `/src/App.tsx` | L2214-2363 |
| 色调 (palette) | `/src/App.tsx` | L2247-2263 |
| 纸张 (paperTexture) | `/src/App.tsx` | L2309-2325 |
| 主色调 (mainColor) | `/src/App.tsx` | L2327-2360 |
| 风格选择 | `/src/App.tsx` | L1752-1776 |
| 模板选择 | `/src/App.tsx` | L1778-1802 |
| Prompt 构建 | `/src/lib/modelClient.ts` | L546-642 |
| 视觉风味短语 | `/src/lib/modelClient.ts` | L405-501 |
| 可编辑标签组件 | `/src/components/EditableTagGroup.tsx` | (全文件) |
| 单选芯片组件 | `/src/components/SingleSelectChipGroup.tsx` | (全文件) |
| 自定义选项 Hook | `/src/hooks/useSceneDetailCustomOptions.ts` | (全文件) |

---

## 7. 关键发现

1. **palette, paperTexture, mainColor 都是"顶层"字段**：
   - 都在 VisualFlavorPanel 中（行 L1742）
   - 都属于"视觉风味"体系
   - 都应该支持自定义扩展

2. **mainColor 注释与实现不符**：
   - types.ts L24 说"仅用于 UI 展示，不加入 prompt"
   - 但 modelClient.ts L495-496 实际上已加入 prompt
   - 建议：澄清设计意图，同步文档

3. **scene 和 style 功能不同**：
   - scene：在 answers 中，影响 prompt 内容和补充字段
   - style：在独立 state，仅影响输出格式（LLM 模型种类）

4. **自定义选项存储架构已就绪**：
   - `answers.customTags` 已支持多个字段：mood, vibes, layoutShapes, edgeStyles, decorations
   - 已有 EditableTagGroup 组件实现
   - 仅需在 palette, paperTexture, narrator 等字段复用这套机制

5. **prompt 中的随机选择**：
   - 若用户未选，代码会随机选一个（palette, narrator 等）
   - 建议：在自定义选项后续开发时，将自定义选项纳入随机池

