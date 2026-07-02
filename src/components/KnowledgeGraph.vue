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
          <div v-if="tooltipVisible" class="graph-tooltip"
            :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }">
            <div class="tooltip-title">{{ tooltipTitle }}</div>
            <div class="tooltip-stats">入链 {{ tooltipIn }} · 出链 {{ tooltipOut }}</div>
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
    const srcNote = store.notes.find(n => n.id === e.source);
    return { ...rawEdges[idx], _src: srcNote?.title || '' };
  });

  if (simulation) simulation.stop();
  if (rawNodes.length === 0) return;

  // 初始圆形布局, 避免节点一开始全叠在中心
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.25;
  rawNodes.forEach((d, i) => {
    const angle = (2 * Math.PI * i) / rawNodes.length - Math.PI / 2;
    d.x = centerX + radius * Math.cos(angle);
    d.y = centerY + radius * Math.sin(angle);
  });

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

  // 边 (曲线路径) — 双向时错开弯曲
  const link = g.append('g')
    .selectAll('path')
    .data(edgeMeta)
    .join('path')
    .attr('fill', 'none')
    .attr('stroke', 'var(--color-primary)')
    .attr('stroke-width', 2)
    .attr('stroke-opacity', 0.4)
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

  // 圆
  node.append('circle')
    .attr('r', d => Math.max(6, Math.min(22, 4 + (d.totalCount || 0) * 3)))
    .attr('fill', 'var(--color-primary)')
    .attr('fill-opacity', 0.8)
    .attr('stroke', 'var(--color-primary-border)')
    .attr('stroke-width', 1.5)
    .style('cursor', 'pointer');

  // 标签
  node.append('text')
    .text(d => d.title)
    .attr('font-size', 11)
    .attr('fill', 'var(--text-secondary)')
    .attr('dx', d => Math.max(8, Math.min(24, 4 + (d.totalCount || 0) * 3)) + 5)
    .attr('dy', '0.35em')
    .style('pointer-events', 'none')
    .style('user-select', 'none');

  // 点击跳转
  node.on('click', (event, d) => {
    event.stopPropagation();
    const note = store.notes.find(n => n.id === d.id);
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
    tooltipX.value = event.offsetX + 12;
    tooltipY.value = event.offsetY - 8;
    tooltipVisible.value = true;
  });
  node.on('mouseleave', () => {
    tooltipVisible.value = false;
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

watch(() => store.knowledgeGraphVisible, (v) => {
  if (v) nextTick(() => initSimulation());
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
