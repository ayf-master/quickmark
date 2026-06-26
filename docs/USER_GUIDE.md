# QuickMark 用户指南维护手册

> 本文档说明如何更新应用内"使用指南"功能（用户菜单 → 📖 使用指南）。

## 📁 相关文件

| 文件 | 作用 |
|---|---|
| `src/data/guide-content.js` | **唯一内容源** - 所有章节、版本日志、公告都在这里 |
| `src/components/UserGuide.vue` | 渲染组件 - 不需要改 |
| `src/store/index.js` | `userGuideVisible` + `openUserGuide/closeUserGuide/toggleUserGuide` - 一般不需要改 |
| `src/components/AppHeader.vue` | 用户菜单的"使用指南"入口 - 一般不需要改 |
| `src/App.vue` | 挂载 `<UserGuide />` - 已经加好, 不需要改 |
| `src/main.js` | 快捷键 `Ctrl+Shift+/` / `Alt+?` - 已经加好 |

**核心原则：新增功能 / 改文案，只改 `src/data/guide-content.js` 一个文件就够了。**

## 🎯 内容结构

`guide-content.js` 导出 4 个东西：

```js
export const VERSION = '1.0.0';                              // 顶部版本徽章
export const CHANGELOG = [{ ver, date, desc }, ...];        // 左侧底部版本日志
export const ANNOUNCEMENT = { enabled, text, type };         // 顶部公告
export const chapters = [                                    // 章节数组
  { id, title, icon, sections: [{ heading, items: [...] }] }
];
```

### 字段说明

- `id`: 英文短词，做锚点和左侧目录 key
- `title`: 章节标题
- `icon`: emoji 字符串（推荐）或 SVG path
- `sections[].heading`: 分组小标题（UPPERCASE 灰色）
- `sections[].items[]`:
  - `label`: 条目标题
  - `desc`: 描述（**支持内联 HTML**：` <kbd>Ctrl</kbd> ` `<code>npm</code>` `<a>` 都行）
  - `keys?`: 快捷键数组（渲染为 kbd 标签）
  - `tip?`: 提示（淡色背景小贴士）
- `sections[].tip?`: 整段 tip（在分组底部）

## 📝 更新流程

### 场景 1：加新功能模块（推荐做法）

```js
// 1. 在 chapters 末尾加新 chapter
{
  id: 'export',
  title: '导入导出',
  icon: '📤',
  sections: [
    {
      heading: '导出',
      items: [
        { label: '导出 Markdown', desc: '编辑器右上角菜单 → "导出为 .md"。' },
        { label: '导出全部', desc: '用户菜单 → "导出备份"。', keys: ['Ctrl', 'Shift', 'E'] }
      ]
    }
  ]
}

// 2. 在 CHANGELOG 顶部加一行
{ ver: '1.1.0', date: '2026-07-15', desc: '新增导入导出功能' }

// 3. 同步更新顶部 VERSION
export const VERSION = '1.1.0';
```

### 场景 2：改文案 / 修小错

直接改 `chapters` 里对应条目的 `label` / `desc`，**不需要**改 VERSION。

### 场景 3：加新快捷键

1. `main.js` 里加 keydown 分支
2. `guide-content.js` 找到对应章节（一般是 `id: 'shortcut'`），加一个 item
3. `CHANGELOG` 加一行

### 场景 4：临时公告

```js
export const ANNOUNCEMENT = {
  enabled: true,
  text: '7 月 1 日 0:00-2:00 系统维护, 可能短暂无法访问。',
  type: 'warning'  // 'info' | 'warning' | 'success'
};
```

`enabled: false` 即关闭。

## ✅ 写好后自检

1. `npm run dev` 起 Vite，浏览器打开 http://localhost:5173
2. 登录任意账号
3. 右上角头像 → "使用指南" → 弹层
4. 检查：
   - 左侧目录能不能点击跳转
   - 滚动到某个章节, 左侧高亮是否同步
   - 所有章节都能正常渲染（特别是 HTML 标签是否被转义了）
   - kbd / code 标签显示正常
5. 确认后即可，不用 build（dev 模式 HMR 自动更新）

## 🐛 常见问题

### Q: HTML 没生效

A: 模板里用的是 `v-html="item.desc"`，确认是 `v-html` 不是 `{{ }}`。

### Q: 加了新章节但左侧没出现

A: 检查 `id` 是否唯一，且没在 `chapters` 数组里漏写逗号。

### Q: 中文显示乱码

A: 文件保存为 UTF-8。VSCode 右下角切编码。

### Q: 版本号该写几

A: 跟 `package.json` 的 `version` 同步。语义版本：
- `1.0.0` → `1.0.1`: 修小错、文案调整
- `1.0.0` → `1.1.0`: 加新功能（不破坏兼容）
- `1.0.0` → `2.0.0`: 大改 / 破坏兼容
