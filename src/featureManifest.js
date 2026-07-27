// QuickMark - 功能清单 (清单式注册表)
// 加新功能只改这里: 声明 id / 标题 / 描述 / 懒加载组件 loader。
// loader 返回一个动态 import, Vite 会自动把它拆成独立分包 (默认不进主包)。
// Phase 0 三个功能共用 FeaturePlaceholder 占位; Phase 1 起把 spacedRepetition.loader
// 换成真正的 ReviewQueue.vue 即可, 其余不动。
const placeholder = () => import('@/components/FeaturePlaceholder.vue');
const reviewQueue = () => import('@/components/ReviewQueue.vue');

export const featuresManifest = [
  {
    id: 'spacedRepetition',
    title: '间隔重复',
    desc: '把笔记变成能复习的学习引擎，支持 [[quiz:问题|答案]] 自测卡与掌握度追踪。',
    loader: reviewQueue
  },
  {
    id: 'canvas',
    title: '2D 画布',
    desc: '无限缩放的知识画布，笔记是可拖拽的卡片。',
    loader: placeholder
  },
  {
    id: 'learningPath',
    title: '学习路径',
    desc: '带前置依赖的路线与完成度进度。',
    loader: placeholder
  }
];
