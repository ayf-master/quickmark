<template>
  <div class="backlink-panel" v-if="store.editingNote && (store.currentNoteOutlinks.length > 0 || store.currentNoteBacklinks.length > 0)">
    <div class="backlink-header" @click="store.backlinkPanelVisible = !store.backlinkPanelVisible">
      <svg class="w-4 h-4 arrow" :class="{ rotated: store.backlinkPanelVisible }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
      </svg>
      <span class="backlink-title">
        反向链接
        <span class="backlink-count">{{ store.currentNoteBacklinks.length }}</span>
      </span>
      <span v-if="store.currentNoteOutlinks.length > 0" class="outlink-info">
        出链 {{ store.currentNoteOutlinks.length }}
      </span>
    </div>

    <div v-if="store.backlinkPanelVisible" class="backlink-body">
      <!-- 出链: 本笔记引用了哪些 -->
      <div v-if="store.currentNoteOutlinks.length > 0" class="link-section">
        <div class="link-section-label">链接到</div>
        <div
          v-for="item in store.currentNoteOutlinks"
          :key="item.title"
          class="backlink-item"
          :class="{ resolved: item.note }"
          @click="item.note && store.openNote(item.note)">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
          <span class="backlink-title-text" :class="{ unresolved: !item.note }">
            <span>{{ item.title }}</span>
            <span v-if="item.annotation" class="annotation-text"> — {{ item.annotation }}</span>
            <span v-if="!item.note" class="unresolved-badge">未创建</span>
          </span>
        </div>
      </div>

      <!-- 反向: 哪些笔记引用了本篇 -->
      <div v-if="store.currentNoteBacklinks.length > 0" class="link-section">
        <div class="link-section-label">被以下笔记引用</div>
        <div
          v-for="bl in store.currentNoteBacklinks"
          :key="bl.id"
          class="backlink-item"
          @click="store.openNote(store.graphNotes.find(n => n.id === bl.id))">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          <span class="backlink-title-text">{{ bl.title }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { store } from '@/store';
</script>

<style scoped>
.backlink-panel {
  border-top: 1px solid var(--border-default);
  margin: 0 16px;
  margin-top: 8px;
}
.backlink-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 0;
  cursor: pointer;
  user-select: none;
  color: var(--text-tertiary);
  font-size: 13px;
  transition: color 0.15s;
}
.backlink-header:hover {
  color: var(--text-secondary);
}
.arrow { transition: transform 0.15s; }
.arrow.rotated { transform: rotate(90deg); }
.backlink-title { font-weight: 500; }
.backlink-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 600;
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  margin-left: 4px;
}
.outlink-info {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-tertiary);
}
.backlink-body { padding-bottom: 12px; }
.link-section { margin-bottom: 8px; }
.link-section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
  padding-left: 4px;
}
.backlink-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background 0.12s;
}
.backlink-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.backlink-item svg { flex-shrink: 0; color: var(--text-tertiary); }
.backlink-title-text {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.backlink-title-text.unresolved { color: var(--text-tertiary); }
.unresolved-badge {
  font-size: 10px;
  color: var(--color-danger);
  margin-left: 6px;
  opacity: 0.7;
}
.annotation-text {
  font-size: 11px;
  color: var(--text-tertiary);
  font-style: italic;
}
</style>
