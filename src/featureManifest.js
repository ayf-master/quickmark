// QuickMark - 功能清单 (清单式注册表)
//
// slot 决定组件出现在页面哪个位置:
//   'sidebar-bottom' — 侧边栏底部 (常驻内联)
//   无 slot — 手动触发 (由 AppHeader 或页面按钮控制)

import { defineAsyncComponent } from 'vue';

const placeholder = defineAsyncComponent(() => import('@/components/FeaturePlaceholder.vue'));
const canvasBoard = defineAsyncComponent(() => import('@/components/CanvasBoard.vue'));

export const featuresManifest = [
  {
    id: 'spacedRepetition',
    title: '间隔重复',
    desc: '基于遗忘曲线提醒复习, 到期笔记在列表中高亮显示, 阅读后点击标记已复习即可。',
    available: true,
    hasBadge: true
  },
  {
    id: 'canvas',
    title: '2D 画布',
    desc: '无限缩放的知识画布，笔记是可拖拽的卡片。',
    available: true,
    component: canvasBoard
  },
  {
    id: 'ganttChart',
    title: '计划甘特表',
    desc: '为笔记设定起止日期，以甘特图直观展示时间规划与进度。',
    available: true
  }
];
