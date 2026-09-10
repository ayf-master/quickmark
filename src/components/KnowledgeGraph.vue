<template>
  <transition name="modal">
    <div v-if="store.knowledgeGraphVisible"
      class="graph-overlay" @click.self="close">
      <div class="graph-container">
        <div class="graph-header">
          <div class="graph-header-left">
            <h2 class="graph-title">知识图谱</h2>
            <span class="graph-stats">{{ nodes.length }} 个节点 · {{ edges.length }} 条连接</span>
          </div>
          <div class="graph-actions">
            <label class="graph-filter-label">
              <input type="checkbox" v-model="showIsolated" />
              <span>显示孤立节点</span>
            </label>
            <button class="btn btn-icon-sm btn-ghost" @click="resetZoom" title="重置缩放">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
            <button class="btn btn-icon-sm btn-ghost" @click="close" title="关闭">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="graph-viewport" ref="containerRef">
          <svg ref="svgRef" class="graph-svg">
            <g ref="gRef"></g>
          </svg>
          <!-- 焦点模式图例: 从笔记内打开时显示颜色含义 -->
          <div v-if="focusId" class="graph-legend">
            <span class="legend-item"><i class="legend-dot" :style="{ background: FOCUS_COLOR }"></i>当前笔记</span>
            <span class="legend-item"><i class="legend-dot" :style="{ background: LINKED_COLOR }"></i>链接的笔记</span>
            <span class="legend-item"><i class="legend-dot" style="background: var(--text-tertiary)"></i>其他</span>
          </div>
          <div v-if="tooltipVisible" class="graph-tooltip"
            :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }">
            <div class="tooltip-title">{{ tooltipTitle }}</div>
            <div class="tooltip-stats">入链 {{ tooltipIn }} · 出链 {{ tooltipOut }}</div>
            <div v-if="tooltipMastery > 0" class="tooltip-stats">掌握度 {{ tooltipMastery }}/5</div>
          </div>
          <div v-if="!hasGraphData" class="graph-empty">
            <p>还没有双向链接</p>
            <p class="text-sm" style="color: var(--text-tertiary);">在编辑器中添加链接后创建知识网络</p>
          </div>
          <div v-else-if="nodes.length === 0" class="graph-empty">
            <p>没有可显示的连接节点</p>
            <p class="text-sm" style="color: var(--text-tertiary);">勾选「显示孤立节点」查看所有笔记</p>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue';
import { store } from '@/store';
import { features } from '@/store/features.js';
import {
  forceSimulation, forceLink, forceManyBody,
  forceCenter, forceCollide
} from 'd3-force';
import { select } from 'd3-selection';
import { zoom as d3Zoom } from 'd3-zoom';
import { drag as d3Drag } from 'd3-drag';

const containerRef = ref(null);
const svgRef = ref(null);
const gRef = ref(null);
const showIsolated = ref(false);
const tooltipVisible = ref(false);
const tooltipX = ref(0);
const tooltipY = ref(0);
const tooltipTitle = ref('');
const tooltipIn = ref(0);
const tooltipOut = ref(0);

let simulation = null;

// 掌握度着色: 仅当「间隔重复」功能开启时按 mastery 着色, 否则保持主题色 (不干扰核心功能)
// mastery 0 = 主题色(未掌握); 1-5 = 红(0度) → 绿(120度) 渐变, 一眼看出哪块还没掌握
function masteryColor(m) {
  if (!features.spacedRepetition) return 'var(--color-primary)';
  const v = Number(m) || 0;
  if (v <= 0) return 'var(--color-primary)';
  const hue = Math.round((v / 5) * 120);
  return `hsl(${hue}, 62%, 48%)`;
}

// ===== 焦点高亮: 从笔记内打开图谱时, 当前笔记 + 直接链接的笔记用不同颜色突出 =====
const FOCUS_COLOR = '#f59e0b';   // 当前笔记: 橙金
const LINKED_COLOR = '#06b6d4';  // 链接的笔记: 青色

const focusId = computed(() => {
  const id = store.graphFocusNoteId;
  // graphNotes 里存在才生效 (笔记可能已被删除)
  return (id != null && store.graphNotes.some(n => n.id === id)) ? id : null;
});

// 与焦点直接相连的节点集合 (打开图谱/切换焦点时计算一次)
const linkedIds = computed(() => {
  const set = new Set();
  const fid = focusId.value;
  if (fid == null) return set;
  for (const e of store.graphData.edges) {
    if (e.source === fid) set.add(e.target);
    if (e.target === fid) set.add(e.source);
  }
  return set;
});

function nodeColor(d) {
  const fid = focusId.value;
  if (fid != null) {
    if (d.id === fid) return FOCUS_COLOR;
    if (linkedIds.value.has(d.id)) return LINKED_COLOR;
    return 'var(--text-tertiary)'; // 无关节点: 灰
  }
  return masteryColor(d.mastery);
}

function nodeOpacity(d) {
  const fid = focusId.value;
  if (fid == null) return 0.82;
  if (d.id === fid || linkedIds.value.has(d.id)) return 0.92;
  return 0.3; // 无关节点淡化
}

function edgeColor(d) {
  const fid = focusId.value;
  if (fid == null) return 'var(--color-primary)';
  return (d.source === fid || d.target === fid) ? FOCUS_COLOR : 'var(--text-tertiary)';
}

function edgeOpacity(d) {
  const fid = focusId.value;
  if (fid == null) return 0.4;
  return (d.source === fid || d.target === fid) ? 0.75 : 0.1;
}

function edgeWidth(d) {
  const fid = focusId.value;
  if (fid == null) return 2;
  return (d.source === fid || d.target === fid) ? 2.5 : 1.5;
}

// 过滤后的图数据
const filteredData = computed(() => {
  const raw = store.graphData;
  if (showIsolated.value || raw.nodes.length === 0) return raw;
  const connected = new Set();
  for (const e of raw.edges) {
    connected.add(e.source);
    connected.add(e.target);
  }
  return {
    nodes: raw.nodes.filter(n => connected.has(n.id)),
    edges: raw.edges
  };
});

const nodes = computed(() => filteredData.value.nodes);
const edges = computed(() => filteredData.value.edges);
const hasGraphData = computed(() => store.graphData.edges.length > 0);

let zoomBehavior = null;

function initSimulation() {
  if (!containerRef.value) return;
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  const rawNodes = filteredData.value.nodes.map(n => ({ ...n }));
  const rawEdges = filteredData.value.edges.map(e => ({ ...e }));
  // 给每条边加上来源笔记标题用于标签
  const edgeMeta = filteredData.value.edges.map((e, idx) => {
    const srcNote = store.graphNotes.find(n => n.id === e.source);
    return { ...rawEdges[idx], _src: srcNote?.title || '' };
  });

  if (simulation) simulation.stop();
  if (rawNodes.length === 0) return;

  // 初始圆形布局, 避免节点一开始全叠在中心
  // 有焦点笔记时: 焦点固定在画布中心, 其余节点环绕它 — 突出"以这篇笔记为中心"
  const focus = focusId.value;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.25;
  const others = focus != null ? rawNodes.filter(d => d.id !== focus) : rawNodes;
  others.forEach((d, i) => {
    const angle = (2 * Math.PI * i) / (others.length || 1) - Math.PI / 2;
    d.x = centerX + radius * Math.cos(angle);
    d.y = centerY + radius * Math.sin(angle);
  });
  if (focus != null) {
    const f = rawNodes.find(d => d.id === focus);
    if (f) { f.x = centerX; f.y = centerY; f.fx = centerX; f.fy = centerY; }
  }

  const svg = select(svgRef.value);
  svg.selectAll('*').remove();
  const g = svg.append('g');

  // 箭头标记 — 简洁实心三角
  g.append('defs').append('marker')
    .attr('id', 'graph-arrow')
    .attr('viewBox', '0 -4 12 8')
    .attr('refX', 24)
    .attr('refY', 0)
    .attr('markerWidth', 8)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-4L12,0L0,4Z')
    .attr('fill', 'var(--color-primary)')
    .attr('fill-opacity', '0.45');

  // 缩放
  zoomBehavior = d3Zoom()
    .scaleExtent([0.15, 5])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
  svg.call(zoomBehavior);

  // 判断哪些边有反向边 (双向链接要画两条曲线)
  const reverseSet = new Set();
  for (const e of edgeMeta) {
    if (edgeMeta.some(o => o.source === e.target && o.target === e.source)) {
      reverseSet.add(e.source + '-' + e.target);
    }
  }

  // 边 (曲线路径) — 双向时错开弯曲; 有焦点时与焦点相关的边高亮, 无关的淡化
  const link = g.append('g')
    .selectAll('path')
    .data(edgeMeta)
    .join('path')
    .attr('fill', 'none')
    .attr('stroke', d => edgeColor(d))
    .attr('stroke-width', d => edgeWidth(d))
    .attr('stroke-opacity', d => edgeOpacity(d))
    .attr('marker-end', 'url(#graph-arrow)');

  // 边标签 (用户自定义标注)
  const linkLabel = g.append('g')
    .selectAll('text')
    .data(edgeMeta)
    .join('text')
    .attr('font-size', 11)
    .attr('fill', 'var(--text-primary)')
    .attr('fill-opacity', 0.85)
    .attr('stroke', 'var(--bg-panel)')
    .attr('stroke-width', 3)
    .attr('stroke-opacity', 0.85)
    .attr('paint-order', 'stroke')
    .attr('text-anchor', 'middle')
    .attr('font-weight', 500)
    .text(d => d.annotation || '');

  // 节点
  const node = g.append('g')
    .selectAll('g')
    .data(rawNodes)
    .join('g')
    .attr('class', 'graph-node')
    .call(d3Drag()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      })
    );

  // 圆 — 按掌握度着色 (开启间隔重复时); 有焦点时按"焦点/链接/无关"三档着色
  node.append('circle')
    .attr('r', d => {
      const base = Math.max(6, Math.min(22, 4 + (d.totalCount || 0) * 3));
      return d.id === focusId.value ? base + 4 : base; // 焦点节点更大
    })
    .attr('fill', d => nodeColor(d))
    .attr('fill-opacity', d => nodeOpacity(d))
    .attr('stroke', d => d.id === focusId.value ? '#fff' : nodeColor(d))
    .attr('stroke-opacity', d => d.id === focusId.value ? 0.9 : 0.95)
    .attr('stroke-width', d => d.id === focusId.value ? 2.5 : 1.5)
    .style('cursor', 'pointer');

  // 标签 — 无关节点的标签同步淡化
  node.append('text')
    .text(d => d.title)
    .attr('font-size', d => d.id === focusId.value ? 13 : 11)
    .attr('font-weight', d => d.id === focusId.value ? 600 : 400)
    .attr('fill', d => d.id === focusId.value ? FOCUS_COLOR : 'var(--text-secondary)')
    .attr('fill-opacity', d => {
      const fid = focusId.value;
      if (fid == null) return 0.85;
      return (d.id === fid || linkedIds.value.has(d.id)) ? 0.95 : 0.35;
    })
    .attr('dx', d => Math.max(8, Math.min(24, 4 + (d.totalCount || 0) * 3)) + 5)
    .attr('dy', '0.35em')
    .style('pointer-events', 'none')
    .style('user-select', 'none');

  // 点击跳转
  node.on('click', (event, d) => {
    event.stopPropagation();
    const note = store.graphNotes.find(n => n.id === d.id);
    if (note) {
      store.openNote(note);
      close();
    }
  });

  // 悬停
  node.on('mouseenter', (event, d) => {
    tooltipTitle.value = d.title;
    tooltipIn.value = d.inCount || 0;
    tooltipOut.value = d.outCount || 0;
    tooltipMastery.value = features.spacedRepetition ? (d.mastery || 0) : 0;
    tooltipX.value = event.offsetX + 12;
    tooltipY.value = event.offsetY - 8;
    tooltipVisible.value = true;
  });
  node.on('mouseleave', () => {
    tooltipVisible.value = false;
    tooltipMastery.value = 0;
  });

  // 力模拟
  simulation = forceSimulation(rawNodes)
    .velocityDecay(0.4)
    .alpha(0.8)
    .force('link', forceLink(edgeMeta).id(d => d.id).distance(100))
    .force('charge', forceManyBody().strength(-120))
    .force('center', forceCenter(width / 2, height / 2))
    .force('collide', forceCollide(24))
    .alphaDecay(0.04)
    .on('tick', () => {
      link.attr('d', d => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return '';
        const key = d.source.id + '-' + d.target.id;
        if (reverseSet.has(key)) {
          const offset = 20;
          const nx = -dy / len * offset;
          const ny = dx / len * offset;
          const cx = (d.source.x + d.target.x) / 2 + nx;
          const cy = (d.source.y + d.target.y) / 2 + ny;
          return `M${d.source.x},${d.source.y} Q${cx},${cy} ${d.target.x},${d.target.y}`;
        }
        return `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`;
      });
      linkLabel
        .attr('x', d => {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const key = d.source.id + '-' + d.target.id;
          if (reverseSet.has(key)) {
            const offset = 24;
            const nx = -dy / len * offset;
            return (d.source.x + d.target.x) / 2 + nx;
          }
          return (d.source.x + d.target.x) / 2;
        })
        .attr('y', d => {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const key = d.source.id + '-' + d.target.id;
          if (reverseSet.has(key)) {
            const offset = 24;
            const ny = dx / len * offset;
            return (d.source.y + d.target.y) / 2 + ny - 6;
          }
          return (d.source.y + d.target.y) / 2 - 6;
        });
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

  // 预跑 30 帧, 让布局快速摊开
  simulation.tick(30);
}

function resetZoom() {
  if (!zoomBehavior) return;
  const svg = select(svgRef.value);
  svg.transition().duration(400).call(zoomBehavior.transform, d3Zoom.zoomIdentity);
}

function close() {
  store.knowledgeGraphVisible = false;
}

watch(() => store.knowledgeGraphVisible, async (v) => {
  if (v) {
    await store.loadGraphNotes();
    nextTick(() => initSimulation());
  }
});

watch(filteredData, () => {
  if (store.knowledgeGraphVisible) initSimulation();
}, { deep: true });

onBeforeUnmount(() => {
  if (simulation) simulation.stop();
});
</script>

<style scoped>
.graph-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}
.graph-container {
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl, 14px);
  width: 100%;
  max-width: 1100px;
  height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
  overflow: hidden;
}
.graph-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-default);
}
.graph-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.graph-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.graph-stats {
  font-size: 12px;
  color: var(--text-tertiary);
}
.graph-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.graph-filter-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.12s;
}
.graph-filter-label:hover {
  background: var(--bg-hover);
}
.graph-viewport {
  flex: 1;
  position: relative;
  overflow: hidden;
}
.graph-svg {
  width: 100%;
  height: 100%;
  display: block;
}
.graph-legend {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  font-size: 11px;
  color: var(--text-secondary);
  pointer-events: none;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}
.graph-tooltip {
  position: absolute;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md, 10px);
  padding: 8px 12px;
  box-shadow: var(--shadow-md);
  pointer-events: none;
  z-index: 10;
  white-space: nowrap;
}
.tooltip-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.tooltip-stats {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 2px;
}
.graph-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 14px;
  gap: 4px;
}
</style>
