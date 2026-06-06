# 🎨 UI 设计准则 & 全局组件使用规范

## 📋 文档目的

本文档记录了项目的设计系统、全局 UI 组件库、样式约定和最佳实践。所有新增页面、功能和组件**必须**遵循此准则，确保整个应用视觉一致、交互统一。

---

## 🎭 设计系统核心

### CSS 变量系统 (`.app` 元素)

项目使用 CSS 自定义属性管理设计令牌，支持多种主题切换：

```css
.app {
  --paper: #fbf5e9;              /* 纸张背景色 */
  --paper-deep: #efe2cf;         /* 深纸张背景色 */
  --ink: #17120f;                /* 主文字、边框色 */
  --muted: #908b83;              /* 静音文字色 */
  --line: rgba(65, 48, 39, 0.16);/* 分割线颜色 */
  --accent-main: #ffcf38;        /* 主强调色（金黄） */
  --accent-alt: #bde8e4;         /* 辅助强调色（青绿） */
  --accent-third: #f7cfd8;       /* 第三强调色（粉红） */
}
```

### 配色主题

| 主题 | 类名 | 特色色 | 用途 |
|------|------|--------|------|
| 优雅 (默认) | `.style-auto` 或 `.style-elegant` | 金黄 #ffcf38 | 明亮、温暖、经典 |
| 复古 | `.style-vintage` | 褐色 #99433c | 沉稳、古朴、怀旧 |
| 旅行 | `.style-travel` | 森林绿 #27665f | 自然、清新、冒险 |
| 柔和 | `.style-soft` | 玫红 #b95c6b | 温柔、优雅、甜美 |

**所有新组件应使用 CSS 变量**，避免硬编码颜色值：

```jsx
// ✅ 推荐
<div style={{ color: 'var(--ink)', background: 'var(--paper)' }}>
  内容
</div>

// ❌ 避免
<div style={{ color: '#17120f', background: '#fbf5e9' }}>
  内容
</div>
```

---

## 🔘 全局按钮组件

### 1. 主操作按钮 (`.primary-action`)

**用途**: 最重要的操作（如"提交"、"生成"、"确认"）

**特征**:
- 黑色背景 (`background: var(--ink)`)
- 圆形 (`border-radius: 999px`)
- 最小高度 56px (大屏) / 48px (小屏)
- 白色文字 (`color: #fff7eb`)
- 内置星形装饰伪元素
- 黑色边框 (`border: 2px solid var(--ink)`)
- 阴影: `5px 6px 0 rgba(38, 29, 26, 0.1)`

**交互反馈**:
- `:hover` 时无变化（保持稳定）
- `:active` 时 `transform: translate(3px, 3px)` + 阴影收缩为 `1px 1px 0`
- `:disabled` 时背景改为 `#dcd6cc`，文字色变为 `rgba(38, 29, 26, 0.54)`

**示例代码**:

```jsx
<button
  className="primary-action"
  onClick={handleSubmit}
  disabled={isLoading}
>
  <Save size={19} />
  <span>保存</span>
</button>

// 或使用 inline styles:
<button style={{
  background: isLoading ? '#dcd6cc' : 'var(--ink)',
  color: isLoading ? 'rgba(38, 29, 26, 0.54)' : '#fff7eb',
  border: '2px solid var(--ink)',
  borderRadius: '999px',
  padding: '12px 20px',
  fontWeight: 900,
  boxShadow: isLoading ? 'none' : '5px 6px 0 rgba(38, 29, 26, 0.1)',
  cursor: isLoading ? 'not-allowed' : 'pointer',
}}>
  确认
</button>
```

### 2. 次级操作按钮 (`.secondary-action`)

**用途**: 次要操作（如"取消"、"返回"、"跳过"）

**特征**:
- 浅色背景 (`background: #fffcf7`)
- 圆形 (`border-radius: 999px`)
- 最小高度 54px
- 黑色文字 + 黑色边框
- 轻阴影: `4px 5px 0 rgba(38, 29, 26, 0.1)`

**示例代码**:

```jsx
<button style={{
  background: '#fffcf7',
  color: 'var(--ink)',
  border: '2px solid var(--ink)',
  borderRadius: '999px',
  padding: '10px 16px',
  fontWeight: 900,
  boxShadow: '4px 5px 0 rgba(38, 29, 26, 0.1)',
}}>
  返回
</button>
```

### 3. 多选按钮 (`.choice`)

**用途**: 多选问卷、标签选择

**特征**:
- 最小高度 38px
- 圆形 (`border-radius: 999px`)
- 浅色背景 + 黑色边框 (默认)
- 黑色背景 + 浅色文字 (`.is-active`)
- 粗体文字 (`font-weight: 900`)

**示例代码**:

```jsx
<button
  className={classNames('choice', active && 'is-active')}
  onClick={toggle}
>
  <span>选项文字</span>
  {active && <Check size={14} />}
</button>

// 或 inline styles:
<button style={{
  border: '2px solid var(--ink)',
  borderRadius: '999px',
  padding: '8px 13px',
  background: active ? 'var(--ink)' : '#fffcf7',
  color: active ? '#fff7eb' : 'var(--ink)',
  fontWeight: 900,
  cursor: 'pointer',
}}>
  选项
</button>
```

### 4. 分段控制按钮 (`.segmented` + `button`)

**用途**: 二元/多元切换（如"登录/注册"、"密码/验证码"）

**特征**:
- 网格布局: `grid-template-columns: repeat(2, minmax(0, 1fr))`
- 按钮间距: `gap: 10px`
- 每个按钮最小高度 46px
- 边框圆角 16px

**示例代码**:

```jsx
<div className="segmented" style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '10px',
}}>
  <button
    style={{
      minHeight: '46px',
      border: '2px solid var(--ink)',
      borderRadius: '16px',
      background: mode === 'login' ? 'var(--ink)' : '#fffcf7',
      color: mode === 'login' ? '#fff7eb' : 'var(--ink)',
      fontWeight: 900,
    }}
  >
    登录
  </button>
  <button
    style={{
      minHeight: '46px',
      border: '2px solid var(--ink)',
      borderRadius: '16px',
      background: mode === 'signup' ? 'var(--ink)' : '#fffcf7',
      color: mode === 'signup' ? '#fff7eb' : 'var(--ink)',
      fontWeight: 900,
    }}
  >
    注册
  </button>
</div>
```

### 5. 图标按钮 (`.icon-button`)

**用途**: 关闭、展开、声音开关等小操作

**特征**:
- 圆形 42×42px (aspect-ratio: 1)
- 圆角 50%
- 浅色背景 `#fffcf7`
- 黑色边框 2px
- 阴影: `3px 4px 0 rgba(38, 29, 26, 0.1)`

**示例代码**:

```jsx
<button className="icon-button" onClick={close}>
  <CircleX size={22} />
</button>

// 或 inline:
<button style={{
  width: '42px',
  height: '42px',
  borderRadius: '50%',
  background: '#fffcf7',
  border: '2px solid var(--ink)',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  boxShadow: '3px 4px 0 rgba(38, 29, 26, 0.1)',
}}>
  <X size={22} />
</button>
```

---

## 📝 全局表单组件

### 输入框 (`.title-input` / 标准输入)

**特征**:
- 边框: `2px solid var(--ink)`
- 圆角: 14px (普通) / 16px (大卡片)
- 背景: `#fffcf7`
- 阴影: `3px 4px 0 rgba(38, 29, 26, 0.07)`
- 最小高度: 42px
- Padding: `10px 12px`

**示例代码**:

```jsx
<input
  type="text"
  placeholder="请输入..."
  style={{
    width: '100%',
    padding: '10px 12px',
    border: '2px solid var(--ink)',
    borderRadius: '14px',
    background: '#fffcf7',
    fontSize: '16px',
    color: 'var(--ink)',
    fontFamily: 'inherit',
    boxShadow: '3px 4px 0 rgba(38, 29, 26, 0.07)',
  }}
/>
```

### 标签 (表单标签)

**特征**:
- 字号: 14px
- 粗体: `font-weight: 900`
- 颜色: `var(--ink)`
- 下间距: 8px

**示例代码**:

```jsx
<label style={{
  display: 'block',
  fontSize: '14px',
  fontWeight: 900,
  color: 'var(--ink)',
  marginBottom: '8px',
}}>
  邮箱地址
</label>
```

---

## 🎯 页面布局组件

### 控制栏 (`.control-band` / `.dialogue-band` / `.book-band`)

**用途**: 将相关内容分组，提供视觉分隔

**特征**:
- 上下边距: `margin: 0 -16px 14px`
- 内边距: `padding: 16px`
- 背景: 浅色渐变 + 线性网格图案
- 边框: `border-block: 1px solid rgba(74, 51, 39, 0.08)`

**示例代码**:

```jsx
<section className="control-band">
  {/* 内容 */}
</section>
```

### 模态框头部 (`.modal-header`)

**特征**:
- 网格布局: `grid-template-columns: 1fr auto`
- 间距: `gap: 10px`
- 对齐: `align-items: start`
- Padding: `14px 20px 12px`

### 模态框页脚 (`.modal-footer`)

**特征**:
- 网格布局: `grid-template-columns: 0.78fr 1.22fr`
- 间距: `gap: 10px`
- Padding: `12px 20px 20px`

---

## 🎨 文字排版规范

### 标题等级

| 元素 | 字号 | 粗体度 | 用途 |
|------|------|--------|------|
| 页面标题 h1 | `clamp(28px, 8vw, 36px)` | 950 | 大标题 |
| 组件标题 h2/h3 | `clamp(24px, 7vw, 34px)` | 950 | 部分标题 |
| 加粗正文 | 16px | 900 | 按钮、标签 |
| 常规正文 | 14-16px | 650 | 描述文字 |
| 辅助文字 | 12-14px | 600 | 提示、注释 |
| 最小文字 | 10-11px | 600 | 页脚 |

### 颜色使用

- **主文字**: `var(--ink)` (#17120f)
- **辅助文字**: `var(--muted)` (#908b83)
- **强调文字**: `var(--accent-main)` (#ffcf38)
- **成功色**: `var(--accent-alt)` (#bde8e4)
- **警告色**: `var(--accent-main)` (#ffcf38)
- **错误色**: 红色组 (用于校验错误，通常 #ff4444 或 #d32f2f)

---

## 🎬 动画与交互

### 过渡效果

**标准过渡**: `transition: all 0.2s ease`

适用于:
- 按钮背景颜色变化
- 阴影变化
- 不透明度变化

### 按钮按压反馈

**所有可点击按钮**应实现"物理按压"效果：

```jsx
onMouseDown={(e) => {
  e.currentTarget.style.transform = 'translate(3px, 3px)';
  e.currentTarget.style.boxShadow = '1px 1px 0 rgba(38, 29, 26, 0.18)';
}}
onMouseUp={(e) => {
  e.currentTarget.style.transform = 'none';
  e.currentTarget.style.boxShadow = '原始阴影值';
}}
```

### 动画列表

| 动画 | 时长 | 缓动函数 | 用途 |
|------|------|----------|------|
| appEnter | 0.52s | cubic-bezier(0.2, 0.8, 0.2, 1) | 应用进入 |
| modalPop | 0.36s | cubic-bezier(0.18, 1.05, 0.24, 1) | 模态框弹出 |
| cardPop | 0.42s | cubic-bezier(0.18, 1.1, 0.2, 1) | 卡片弹出 |
| fadeIn | 0.2s | ease | 淡入 |

---

## ✅ 错误提示样式

### 错误弹窗

```jsx
<div style={{
  padding: '12px 14px',
  background: '#fff8b8',  // 黄色背景
  border: '2px solid var(--accent-main)',
  borderRadius: '8px',
  display: 'flex',
  gap: '8px',
  alignItems: 'flex-start',
}}>
  <AlertCircle size={18} style={{ color: 'var(--ink)', flexShrink: 0 }} />
  <p style={{ color: 'var(--ink)', margin: 0 }}>
    错误信息文本
  </p>
</div>
```

### 成功提示

```jsx
<div style={{
  padding: '12px 14px',
  background: '#f0f7f4',   // 青绿背景
  border: '2px solid var(--accent-alt)',
  borderRadius: '8px',
  display: 'flex',
  gap: '8px',
  alignItems: 'flex-start',
}}>
  <CheckCircle size={18} style={{ color: 'var(--accent-alt)', flexShrink: 0 }} />
  <p style={{ color: 'var(--ink)', margin: 0 }}>
    成功信息文本
  </p>
</div>
```

---

## 📐 间距与尺寸规范

### 常用间距值

```css
/* 4px 系列 */
4px   → 最小间距（元素内部）
8px   → 小间距（相邻元素）
12px  → 标准间距（表单项间）
16px  → 大间距（卡片内）
18px  → 部分高度
20px  → 模态框内边距
22px  → 大间距
```

### 常用尺寸

| 尺寸 | 用途 |
|------|------|
| 42px | 小圆形按钮 |
| 44px | 小分段按钮 |
| 46px | 分段选择按钮 |
| 48px | 表单输入框最小高 |
| 52px | 登录/生成按钮 |
| 56px | 主操作按钮大 |

---

## 🚀 新页面/功能开发检查清单

### 在开发新页面时，必须检查：

- [ ] **使用 CSS 变量**：所有颜色值使用 `var(--ink)`, `var(--accent-main)` 等
- [ ] **按钮样式一致**：
  - 主操作用 `.primary-action` 或其样式
  - 次操作用 `.secondary-action` 或其样式
  - 多选用 `.choice` 样式
- [ ] **表单输入框**：都有 `border: 2px solid var(--ink)`, `border-radius: 14px`, 阴影
- [ ] **标题排版**：使用规范的字号、粗体度、间距
- [ ] **间距对齐**：使用 4px 倍数的间距（4, 8, 12, 16, 20...）
- [ ] **交互反馈**：按钮有 hover, active, disabled 状态，支持物理按压效果
- [ ] **模态框**：遵循 `.modal-layer`, `.info-modal`, `.modal-header`, `.modal-footer` 结构
- [ ] **无障碍**：
  - 所有交互元素有 `focus-visible` outline
  - 表单有关联的 `<label>`
  - 颜色对比度符合 WCAG AA 标准
- [ ] **响应式**：在移动端 (320px) 和桌面端 (1920px) 都能正常显示
- [ ] **文档**：在本文档中补充新组件/页面的说明

---

## 🎓 示例：完整的优化页面

```jsx
function NewPage() {
  return (
    <div style={{
      maxWidth: '430px',
      margin: '0 auto',
      padding: '20px 16px',
    }}>
      {/* 标题 */}
      <p style={{
        color: 'var(--accent-alt)',
        fontSize: '11px',
        fontWeight: 800,
        textTransform: 'uppercase',
        margin: '0 0 12px 0',
      }}>
        页面分类
      </p>
      <h1 style={{
        fontSize: 'clamp(28px, 8vw, 36px)',
        fontWeight: 950,
        color: 'var(--ink)',
        margin: '0 0 24px 0',
      }}>
        页面标题
      </h1>

      {/* 分段按钮 */}
      <div className="segmented" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '10px',
        marginBottom: '24px',
      }}>
        <button style={{
          minHeight: '46px',
          padding: '10px 16px',
          border: '2px solid var(--ink)',
          borderRadius: '16px',
          background: active ? 'var(--ink)' : '#fffcf7',
          color: active ? '#fff7eb' : 'var(--ink)',
          fontWeight: 900,
          cursor: 'pointer',
        }}>
          选项 A
        </button>
        <button style={{...}}>
          选项 B
        </button>
      </div>

      {/* 表单输入 */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: 900,
          color: 'var(--ink)',
          marginBottom: '8px',
        }}>
          邮箱地址
        </label>
        <input
          type="email"
          placeholder="请输入..."
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '2px solid var(--ink)',
            borderRadius: '14px',
            background: '#fffcf7',
            fontSize: '16px',
            color: 'var(--ink)',
            fontFamily: 'inherit',
            boxShadow: '3px 4px 0 rgba(38, 29, 26, 0.07)',
          }}
        />
      </div>

      {/* 主操作按钮 */}
      <button
        onClick={handleSubmit}
        style={{
          width: '100%',
          minHeight: '52px',
          padding: '12px 16px',
          background: 'var(--ink)',
          color: '#fff7eb',
          border: '2px solid var(--ink)',
          borderRadius: '999px',
          fontWeight: 900,
          fontSize: '16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '5px 6px 0 rgba(38, 29, 26, 0.1)',
          transition: 'all 0.2s ease',
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translate(3px, 3px)';
          e.currentTarget.style.boxShadow = '1px 1px 0 rgba(38, 29, 26, 0.18)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '5px 6px 0 rgba(38, 29, 26, 0.1)';
        }}
      >
        <Send size={18} />
        <span>提交</span>
      </button>
    </div>
  );
}
```

---

## 📞 问题反馈

如在开发过程中发现设计系统不足之处或需要扩展，请：

1. 在此文档中添加新规范或更新现有规范
2. 更新对应的组件实现
3. 在 git commit 中标注 `[Design System Update]`

---

**最后更新**: 2026-06-06  
**维护者**: UI & Design Team
