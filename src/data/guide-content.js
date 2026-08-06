// QuickMark - 用户指南内容
// ============================================================================
// 维护说明 (开发新功能时, 必须更新本文件):
// 1. 入口: src/data/guide-content.js  (本文件, 唯一内容源)
// 2. 组件: src/components/UserGuide.vue
// 3. 触发: AppHeader.vue 用户菜单 → "使用指南" / 快捷键 Ctrl+Shift+/
// 4. 内容结构:
//    chapters[]: 章节数组, 渲染为左侧目录
//      - id:    锚点 id (英文短词, 用于左侧目录点击跳转)
//      - title: 章节标题
//      - icon:  章节图标 (svg path d="..." 字符串)
//      - sections[]: 章节内分组
//        - heading:  分组小标题
//        - items[]:   条目
//          - label:  条目标题
//          - desc:   描述 (支持内联 <kbd> HTML)
//          - keys?:  可选快捷键数组 (渲染为 kbd 标签)
//          - tip?:   可选提示 (淡色背景小贴士, 在该条目下)
//          - action?: 可选可交互按钮 { id, label }, id 由 UserGuide.vue 解析
//                     支持: 'openNewCategory' / 'createNote' / 'focusSearch' / 'focusCategorySearch'
//                     新增 action: 在 UserGuide.vue 里的 actionHandlers 加分支
//        - tip?: 整段底部提示 (在分组底部)
// 5. 新增功能最小变更:
//    - 在 chapters 末尾 push 一个新 chapter, 或在已有 chapter 加 section
//    - VERSION 改一档 (如 1.1.0 → 1.2.0)
// 6. ANNOUNCEMENT: 平时 enabled=false 不打扰; 大版本更新时打开, 放 1-2 句公告
// ============================================================================

export const VERSION = '1.1.0';

// 章节图标 (svg path d 属性, 单色 24x24)
const I = {
  start:     'M12 4v16m8-8H4',
  note:      'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  category:  'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  markdown:  'M9 5l-7 7 7 7M15 5l7 7-7 7',
  shortcut:  'M13 10V3L4 14h7v7l9-11h-7z',
  theme:     'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
  account:   'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  faq:       'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
};

// 章节内容
export const chapters = [

  // ========== 1. 快速上手 (新手必读) ==========
  {
    id: 'start',
    title: '快速上手',
    icon: I.start,
    sections: [
      {
        heading: '三栏布局',
        items: [
          { label: '左侧', desc: '分类列表 + 全局搜索, 点分类筛选笔记。' },
          { label: '中间', desc: '当前分类下的笔记, 顶部可切换只看收藏。' },
          { label: '右侧', desc: '编辑器, 写笔记正文, 2 秒自动保存。' }
        ]
      },
      {
        heading: '5 分钟入门',
        items: [
          { label: '1. 建分类', desc: '先建一个分类来组织笔记。', action: { id: 'openNewCategory', label: '新建分类' } },
          { label: '2. 写笔记', desc: '现在试试新建第一篇笔记, 弹层里选个分类, 2 秒自动保存。', action: { id: 'createNote', label: '新建笔记' } },
          { label: '3. 搜索试试', desc: '在搜索框搜刚写的关键词, 看实时过滤。', action: { id: 'focusSearch', label: '聚焦搜索框' }, keys: ['Ctrl', 'K'] }
        ],
        tip: '走完这三步就上手了。后续不会的随时打开本指南。'
      }
    ]
  },

  // ========== 2. 笔记操作 ==========
  {
    id: 'note',
    title: '笔记操作',
    icon: I.note,
    sections: [
      {
        heading: '创建与删除',
        items: [
          { label: '新建', desc: '顶部 <kbd>+</kbd> 新建, 弹层里选个分类。新建前必须先选一个分类。', keys: ['Alt', 'N'] },
          { label: '关闭编辑器', desc: '返回按钮收起, 改动会先自动保存。', keys: ['Esc'] },
          { label: '删除', desc: '编辑器底部"删除"按钮 (二次确认), 或列表条目上的删除图标。' }
        ]
      },
      {
        heading: '组织与查找',
        items: [
          { label: '置顶', desc: '编辑器工具栏"收藏"按钮。', keys: ['Ctrl', 'Shift', 'P'] },
          { label: '只看置顶', desc: '列表头部置顶按钮, 一键筛选。' },
          { label: '搜索笔记', desc: '在搜索框输入关键词, 实时按标题/正文模糊匹配。', keys: ['Ctrl', 'K'] },
          { label: '搜索分类', desc: '在分类搜索框输入关键词, 命中分类+祖先路径完整展示。', keys: ['Ctrl', 'Shift', 'F'] },
          { label: '多分类', desc: '编辑器内可给一篇笔记选多个分类, 列表显示所有关联分类名。' }
        ]
      }
    ]
  },

  // ========== 3. 分类管理 ==========
  {
    id: 'category',
    title: '分类管理',
    icon: I.category,
    sections: [
      {
        heading: '树形结构',
        items: [
          { label: '顶级', desc: '侧边栏"分类"区域右侧 <kbd>+</kbd> 创建。' },
          { label: '子分类', desc: '鼠标悬停条目 → 点"子"图标。' },
          { label: '展开/折叠', desc: '点分类名前的箭头, 折叠后只显示顶级。' }
        ]
      },
      {
        heading: '编辑与删除',
        items: [
          { label: '改名字/颜色', desc: '悬停条目 → 编辑图标, 8 种预设颜色可选。' },
          { label: '删除', desc: '删除图标需二次确认, 分类下笔记不会被删, 只取消关联。' }
        ]
      }
    ]
  },

  // ========== 4. Markdown ==========
  {
    id: 'markdown',
    title: 'Markdown',
    icon: I.markdown,
    sections: [
      {
        heading: '模式切换',
        items: [
          {
            label: '富文本 ↔ Markdown',
            desc: '编辑器顶部两个 tab: "所见即所得"直接打字, "Markdown" 写源码 + 实时预览。',
            keys: ['Ctrl', 'Alt', 'M']
          },
          {
            label: '自动检测',
            desc: '打开旧笔记时, 系统按内容自动选模式 (有 <code>#</code>/<code>**</code> 等符号 → Markdown)。'
          }
        ]
      },
      {
        heading: '常用语法',
        items: [
          { label: '一级标题', desc: '行首 <kbd>#</kbd> + 空格', keys: ['#', 'Space'] },
          { label: '二级标题', desc: '行首 <kbd>##</kbd> + 空格', keys: ['##', 'Space'] },
          { label: '无序列表', desc: '行首 <kbd>-</kbd> + 空格', keys: ['-', 'Space'] },
          { label: '引用', desc: '行首 <kbd>&gt;</kbd> + 空格', keys: ['>', 'Space'] }
        ]
      },
      {
        heading: '图片',
        items: [
          { label: '粘贴', desc: '复制图片后在编辑器里粘贴, 自动上传并插入。' },
          { label: '拖拽', desc: '把图片文件直接拖到编辑器里, 同上自动上传。' }
        ]
      }
    ]
  },

  // ========== 5. 快捷键 ==========
  {
    id: 'shortcut',
    title: '快捷键',
    icon: I.shortcut,
    sections: [
      {
        heading: '全局',
        items: [
          { label: '搜索', desc: '聚焦搜索框。', keys: ['Ctrl', 'K'] },
          { label: '新建笔记', desc: '弹层选分类再建 (v1.1 起)。', keys: ['Alt', 'N'] },
          { label: '使用指南', desc: '打开/关闭本指南。', keys: ['Ctrl', 'Shift', '/'] },
          { label: '快捷键面板', desc: '仅看快捷键速查 (更紧凑)。', keys: ['?'] }
        ]
      },
      {
        heading: '编辑器内',
        items: [
          { label: '切换置顶', desc: '当前笔记置顶/取消。', keys: ['Ctrl', 'Shift', 'P'] },
          { label: '切换模式', desc: '富文本 ↔ Markdown。', keys: ['Ctrl', 'Alt', 'M'] },
          { label: '关闭编辑器', desc: '改动会被先自动保存。', keys: ['Esc'] }
        ]
      },
      {
        heading: 'Esc 关闭顺序',
        items: [
          { label: '1', desc: '快捷键面板 / 使用指南' },
          { label: '2', desc: '移动端抽屉菜单' },
          { label: '3', desc: '分类编辑弹窗' },
          { label: '4', desc: '编辑器 (最后才关, 避免误操作)' }
        ]
      }
    ]
  }
];

// 顶部公告 (大版本变化时启用, 平时保持 false 不打扰)
export const ANNOUNCEMENT = {
  enabled: false,
  text: '',
  type: 'info'
};
