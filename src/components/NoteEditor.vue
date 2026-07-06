<template>
  <section class="flex flex-col h-full fade-in-up"
    :class="{ 'editor-fullscreen': store.isCompact }"
    :style="panelStyle"
    role="region"
    aria-label="笔记编辑器">

    <!-- 顶部工具栏 -->
    <header class="flex items-center justify-between px-4 sm:px-6 py-3 flex-shrink-0 gap-2 flex-wrap"
      style="border-bottom: 1px solid var(--border-default); background: var(--bg-panel);"
      data-tour="editor">

      <!-- 左侧: 返回 / 模式切换 -->
      <div class="flex items-center gap-3 min-w-0">
        <button v-if="store.isCompact"
          class="btn btn-icon-sm btn-ghost flex-shrink-0"
          @click="store.closeEditor()"
          aria-label="返回列表">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>

        <!-- 模式分段切换 -->
        <div v-if="store.editingNote" class="mode-switcher" role="tablist" aria-label="编辑器模式">
          <button
            role="tab"
            :aria-selected="store.editMode === 'plain'"
            :class="['mode-tab', { active: store.editMode === 'plain' }]"
            @click="switchMode('plain')"
            title="纯文本">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7h16M4 12h16M4 17h16"/>
            </svg>
            纯文本
          </button>
          <button
            role="tab"
            :aria-selected="store.editMode === 'markdown'"
            :class="['mode-tab', { active: store.editMode === 'markdown' }]"
            @click="switchMode('markdown')"
            title="Markdown">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
            </svg>
            Markdown
          </button>
        </div>
      </div>

      <!-- 右侧: 收藏 / 编辑分类 / 删除 -->
      <div class="flex items-center gap-1">
        <button class="btn btn-icon-sm btn-ghost"
          :class="{ 'is-active': store.editingNote && store.editingNote.is_pinned }"
          @click="store.togglePin()"
          :title="store.editingNote && store.editingNote.is_pinned ? '取消收藏' : '收藏'"
          :aria-pressed="store.editingNote && !!store.editingNote.is_pinned"
          aria-label="切换收藏">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"
            :style="{ color: store.editingNote && store.editingNote.is_pinned ? 'var(--color-accent)' : 'currentColor' }">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
          </svg>
        </button>
        <div class="relative">
          <button @click="categoryEditorVisible = !categoryEditorVisible"
            class="btn btn-icon-sm btn-ghost"
            :class="{ 'is-active': categoryEditorVisible }"
            title="编辑分类"
            aria-label="编辑分类">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
            </svg>
          </button>
          <!-- 分类编辑浮层 -->
          <div v-if="categoryEditorVisible"
            class="absolute right-0 top-full mt-2 z-50 p-3 rounded-xl shadow-xl"
            style="background: var(--bg-elevated); border: 1px solid var(--border-default); min-width: 200px;">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold" style="color: var(--text-tertiary);">编辑分类</span>
              <button @click="categoryEditorVisible = false" class="btn btn-icon-sm" style="color: var(--text-tertiary);">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="flex flex-wrap gap-2">
              <template v-for="cat in store.categories" :key="cat.id">
                <button
                  @click="store.toggleNoteCategory(cat.id)"
                  class="px-3 py-1 rounded-full text-xs border transition-all"
                  :style="catStyle(cat)">
                  {{ cat.name }}
                </button>
              </template>
              <span v-if="store.categories.length === 0" class="text-xs"
                style="color: var(--text-tertiary);">暂无分类,可在左侧新建</span>
            </div>
          </div>
        </div>
        <button
          @click="store.deleteCurrentNote()"
          title="删除笔记"
          aria-label="删除笔记"
          class="btn btn-icon-sm"
          style="color: var(--color-danger);">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- 编辑器主体 -->
    <div class="flex-1 panel-scroll" v-if="store.editingNote">

      <!-- 标题 -->
      <div class="px-4 sm:px-6 pt-5 pb-3">
        <input type="text"
          v-model="store.editTitle"
          ref="titleInput"
          placeholder="笔记标题..."
          class="w-full bg-transparent text-2xl font-bold focus:outline-none pb-2"
          style="color: var(--text-primary);"
          aria-label="笔记标题" />
      </div>

      <!-- Wiki 链接编辑 -->
      <div class="px-4 sm:px-6 pb-3 flex flex-col gap-2"
        style="border-bottom: 1px solid var(--border-subtle);">
        <div class="flex items-center gap-2 flex-wrap min-h-[28px]">
          <span class="text-xs font-medium" style="color: var(--text-tertiary); width: 52px; flex-shrink: 0;">链接</span>
          <template v-for="(link, i) in store.editLinks" :key="i">
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
              style="border: 1px solid var(--color-primary-border); color: var(--color-primary);">
              <span class="cursor-pointer hover:underline" @click="openLinkNote(link.title)"
                :title="'打开笔记: ' + link.title">{{ link.title }}</span>
              <input
                :ref="el => { if (el) annotationRefs[i] = el }"
                v-model="link.annotation"
                @blur="onAnnotationChange"
                @keydown.enter="onAnnotationChange"
                placeholder="标注"
                class="bg-transparent outline-none text-xs"
                style="color: var(--text-secondary); max-width: 100px;"
                @click.stop
                @mousedown.stop />
              <button @click.stop="removeLink(i)" class="inline-flex items-center justify-center flex-shrink-0"
                style="color: var(--text-tertiary);" title="移除链接">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </span>
          </template>
          <input ref="linkInputRef"
            v-model="linkInputText"
            @keydown.enter.prevent="addLink"
            @keydown.backspace="handleLinkBackspace"
            @paste.prevent="handleLinkPaste"
            placeholder="输入标题后回车添加链接..."
            class="flex-1 min-w-[120px] bg-transparent text-xs outline-none"
            style="color: var(--text-secondary);" />
        </div>
      </div>

      <!-- 格式工具栏 (Markdown 模式显示更全) -->
      <div v-if="store.editMode === 'markdown'"
        class="px-4 sm:px-6 pb-2 flex items-center gap-1 flex-wrap"
        style="border-top: 1px dashed var(--border-subtle); padding-top: 8px;">
        <div class="md-toolbar-group">
          <button @click="toggleHeading(1)" class="md-tool" title="一级标题">H1</button>
          <button @click="toggleHeading(2)" class="md-tool" title="二级标题">H2</button>
          <button @click="toggleHeading(3)" class="md-tool" title="三级标题">H3</button>
        </div>
        <div class="md-toolbar-divider"></div>
        <div class="md-toolbar-group">
          <button @click="toggleBold()" class="md-tool" title="粗体">
            <strong>B</strong>
          </button>
          <button @click="toggleItalic()" class="md-tool" title="斜体">
            <em>I</em>
          </button>
          <button @click="toggleStrikethrough()" class="md-tool" title="删除线">
            <s>S</s>
          </button>
        </div>
        <div class="md-toolbar-divider"></div>
        <div class="md-toolbar-group">
          <button @click="annotateUnderline()" class="md-tool" title="划线">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 4v6a6 6 0 0012 0V4M4 20h16"/>
            </svg>
          </button>
          <button @click="annotateHighlight(currentColor)" class="md-tool" title="高亮" :style="{ color: currentColor }">
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 20l4-4 2 2 4-4-4-4 2-2 4 4 2-2-8-8-10 10 4 4zm2-10l4-4 2 2-4 4-2-2z"/>
              </svg>
            </button>
            <label class="md-tool" title="选择颜色" style="cursor:pointer; min-width:20px; width:20px; padding:0;">
              <span style="display:block; width:12px; height:12px; border-radius:2px; background:currentColor; border:1px solid var(--border-default);"></span>
              <input type="color" class="hidden" :value="currentColor" @input="currentColor = $event.target.value" />
            </label>
          <button @click="annotateComment()" class="md-tool" title="批注">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h6m-4 8l-4 4V4a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2H9l-3 3z"/>
            </svg>
          </button>
        </div>
        <div class="md-toolbar-divider"></div>
        <div class="md-toolbar-group">
          <button @click="toggleUnorderedList()" class="md-tool" title="无序列表">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>
            </svg>
          </button>
          <button @click="toggleOrderedList()" class="md-tool" title="有序列表">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6h11M10 12h11M10 18h11M4 5.5v4M4 11.5v4M4 15.5l2 2.5M4 18h2.5"/>
            </svg>
          </button>
          <button @click="mdInsert('> ', '', '引用')" class="md-tool" title="引用">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z"/>
            </svg>
          </button>
          <button @click="insertInlineCode" class="md-tool" title="行内代码">
            <code class="text-[11px] font-mono">{{ inlineCodeLabel }}</code>
          </button>
          <button @click="insertCodeBlock" class="md-tool" title="代码块">{{ codeBlockLabel }}</button>
        </div>
        <div class="md-toolbar-divider"></div>
        <div class="md-toolbar-group">
          <button @click="mdInsertLink()" class="md-tool" title="链接">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
          </button>
          <button @click="mdInsertImage()" class="md-tool" title="插入图片" :disabled="store.editorImageUploading">
            <svg v-if="!store.editorImageUploading" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <svg v-else class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke-width="3" stroke-opacity="0.25"/>
              <path d="M12 2a10 10 0 0110 10" stroke-width="3" stroke-linecap="round"/>
            </svg>
          </button>
          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileSelected" />
        </div>

        <div class="md-toolbar-spacer"></div>

        <button @click="store.editorPreviewVisible = !store.editorPreviewVisible"
          class="md-tool md-tool-toggle"
          :class="{ active: store.editorPreviewVisible }"
          :title="store.editorPreviewVisible ? '隐藏预览' : '显示预览'">
          <svg v-if="store.editorPreviewVisible" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
          </svg>
          <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12H3m0 0l4-4m-4 4l4 4"/>
          </svg>
          预览
        </button>

        <div class="md-toolbar-divider"></div>
        <div class="md-toolbar-group">
          <button @click="undo" class="md-tool" title="撤销">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 010 10H9m0-10l4-4M9 6l-4 4"/>
            </svg>
          </button>
          <button @click="redo" class="md-tool" title="重做">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10H11a5 5 0 000 10h4m0-10l-4-4m4 4l-4 4"/>
            </svg>
          </button>
        </div>
        <div class="md-toolbar-divider"></div>
        <div class="md-toolbar-group">
          <button @click="store.knowledgeGraphVisible = true" class="md-tool" title="知识图谱">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="8" cy="6" r="2" stroke-width="1.8"/>
              <circle cx="16" cy="12" r="2" stroke-width="1.8"/>
              <circle cx="10" cy="18" r="2" stroke-width="1.8"/>
              <line x1="10" y1="7" x2="14" y2="11" stroke-width="1.5"/>
              <line x1="14" y1="13" x2="11" y2="17" stroke-width="1.5"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 纯文本模式工具栏 (仅撤销) -->
      <div v-if="store.editMode === 'plain'"
        class="px-4 sm:px-6 pb-2 flex items-center gap-1 flex-wrap"
        style="border-top: 1px dashed var(--border-subtle); padding-top: 8px;">
        <div class="md-toolbar-group">
          <button @click="undo" class="md-tool" title="撤销">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 010 10H9m0-10l4-4M9 6l-4 4"/>
            </svg>
          </button>
          <button @click="redo" class="md-tool" title="重做">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10H11a5 5 0 000 10h4m0-10l-4-4m4 4l-4 4"/>
            </svg>
          </button>
        </div>
      </div>
<!-- 正文编辑区 -->
      <div class="px-4 sm:px-6 pb-6">

        <!-- Markdown 模式: 编辑 + 预览 -->
        <div v-if="store.editMode === 'markdown'"
          :class="['md-pane', { 'with-preview': store.editorPreviewVisible }]">
          <textarea
            v-model="store.editContent"
            ref="contentInput"
            @keydown="handleEditorKeydown"
            @input="onEditorInput"
            @paste="handlePaste"
            :placeholder="store.editorImageUploading ? '图片上传中...' : '开始用 Markdown 记录...'"
            class="md-editor"
            :aria-label="'Markdown 正文'"
            spellcheck="false"></textarea>

          <div v-if="store.editorPreviewVisible"
            class="md-preview"
            v-html="renderedPreview"
            @click="handlePreviewClick"
            aria-label="Markdown 实时预览"></div>
        </div>

        <!-- 纯文本模式: textarea 无格式 -->
        <div v-else-if="store.editMode === 'plain'"
          class="plain-pane">
          <textarea
            v-model="store.editContent"
            ref="plainInput"
            @keydown="handleEditorKeydown"
            @input="onEditorInput"
            @paste="handlePlainPaste"
            :placeholder="store.editorImageUploading ? '图片上传中...' : '开始记录...'"
            class="plain-editor"
            :aria-label="'纯文本正文'"
            spellcheck="false"></textarea>
        </div>
      </div>

      <!-- 反向链接面板 -->
      <BacklinkPanel />
    </div>

    <!-- Footer stats -->
    <footer id="editor-footer"
      class="px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs flex-shrink-0"
      style="border-top: 1px solid var(--border-default); color: var(--text-tertiary); background: var(--bg-panel);"
      aria-live="polite">
      <span class="flex items-center gap-3">
        <span>{{ store.wordCount }} 字</span>
        <span style="color: var(--border-default);">·</span>
        <span>约 {{ store.readingTime }}阅读</span>
      </span>
      <span class="flex items-center gap-2">
        <span class="w-1.5 h-1.5 rounded-full"
          :style="{ background: store.editorImageUploading ? 'var(--color-warning, #F59E0B)' : 'var(--color-success)' }"></span>
        {{ store.editorImageUploading ? '上传中...' : '自动保存' }}
      </span>
    </footer>
  </section>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount, nextTick, onMounted } from 'vue';
import markdownit from 'markdown-it';
import { store } from '@/store';
import { uploadImageFile } from '@/utils/content';
import wikiPlugin from '@/utils/markdown-it-wiki';
import { renderAnnotations } from '@/utils/markdown-it-annotations';
import { findNoteByTitle } from '@/utils/wiki-link';
import BacklinkPanel from '@/components/BacklinkPanel.vue';

const titleInput = ref(null);
const contentInput = ref(null);
const plainInput = ref(null);
const fileInput = ref(null);
const categoryEditorVisible = ref(false);
const linkInputText = ref('');
const linkInputRef = ref(null);
const annotationRefs = ref({});

// Wiki 链接编辑
function addLink() {
  const title = linkInputText.value.trim();
  if (!title) return;
  if (!store.editLinks.some(l => l.title === title)) {
    store.editLinks.push({ title, annotation: '' });
    store.scheduleAutoSave();
  }
  linkInputText.value = '';
  nextTick(() => linkInputRef.value?.focus());
}
function removeLink(index) {
  store.editLinks.splice(index, 1);
  store.scheduleAutoSave();
}
function openLinkNote(title) {
  const note = findNoteByTitle(store.notes, title);
  if (note) store.openNote(note);
}
function handleLinkBackspace(e) {
  if (linkInputText.value === '' && store.editLinks.length > 0) {
    store.editLinks.pop();
    store.scheduleAutoSave();
  }
}
function handleLinkPaste(e) {
  const text = e.clipboardData.getData('text/plain');
  const titles = text.split(/[,，\n\r]+/).map(s => s.trim()).filter(Boolean);
  for (const title of titles) {
    if (!store.editLinks.some(l => l.title === title)) {
      store.editLinks.push({ title, annotation: '' });
    }
  }
  store.scheduleAutoSave();
}
// 标注修改后触发保存
let annotationTimer = null;
function onAnnotationChange() {
  clearTimeout(annotationTimer);
  annotationTimer = setTimeout(() => store.scheduleAutoSave(), 500);
}

// ===== 标注工具 =====
const currentColor = ref('#ffeb3b');

// 获取当前编辑器的 DOM 元素
function getEditorEl() {
  return store.editMode === 'plain' ? plainInput.value : contentInput.value;
}

// 在选区上包裹通用固定标签 (切换)
function wrapAnnotation(openTag, closeTag) {
  const el = getEditorEl();
  if (!el) return;
  el.focus();
  const start = el.selectionStart;
  const end = el.selectionEnd;
  if (start === end) { store.showToast('请先选中文字', 'error'); return; }
  const value = el.value;
  const before = value.slice(0, start);
  const selected = value.slice(start, end);
  const after = value.slice(end);

  // 检查选中内容本身是否已被包裹
  if (selected.startsWith(openTag) && selected.endsWith(closeTag)) {
    const inner = selected.slice(openTag.length, -closeTag.length);
    el.value = before + inner + after;
    el.setSelectionRange(start, start + inner.length);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  // 检查选中内容前后的上下文是否有包裹 (选中了标签内部的文字)
  if (before.endsWith(openTag) && after.startsWith(closeTag)) {
    const inner = value.slice(start, end);
    el.value = before.slice(0, -openTag.length) + inner + after.slice(closeTag.length);
    el.setSelectionRange(start - openTag.length, start - openTag.length + inner.length);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  // 包裹选中内容
  el.value = before + openTag + selected + closeTag + after;
  el.setSelectionRange(start + openTag.length, start + openTag.length + selected.length);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function annotateUnderline() {
  wrapAnnotation('<qm-u>', '</qm-u>');
}

function annotateHighlight(color) {
  if (!color) color = currentColor.value;
  const el = getEditorEl();
  if (!el) return;
  el.focus();
  const start = el.selectionStart;
  const end = el.selectionEnd;
  if (start === end) { store.showToast('请先选中文字', 'error'); return; }
  const value = el.value;
  const selected = value.slice(start, end);
  const before = value.slice(0, start);
  const after = value.slice(end);
  // 检查是否已被高亮包裹: 前面紧贴 <qm-mark...> 后面紧贴 </qm-mark>
  const ctxOpen = before.match(/<qm-mark[^>]*>$/);
  if (ctxOpen && after.startsWith('</qm-mark>')) {
    el.value = before.slice(0, -ctxOpen[0].length) + selected + after.slice(10);
    el.setSelectionRange(start - ctxOpen[0].length, start - ctxOpen[0].length + selected.length);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  // 包裹
  const tag = `<qm-mark color="${color}">`;
  el.value = before + tag + selected + '</qm-mark>' + after;
  el.setSelectionRange(start + tag.length, start + tag.length + selected.length);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function annotateComment() {
  const el = getEditorEl();
  if (!el) return;
  el.focus();
  const start = el.selectionStart;
  const end = el.selectionEnd;
  if (start === end) { store.showToast('请先选中文字', 'error'); return; }
  const value = el.value;
  const before = value.slice(0, start);
  const selected = value.slice(start, end);
  const after = value.slice(end);
  // 选中内容已被批注 → 去掉
  const cmtFull = selected.match(/^<qm-cmt\s+note="[^"]*">(.*)<\/qm-cmt>$/s);
  if (cmtFull) {
    el.value = before + cmtFull[1] + after;
    el.setSelectionRange(start, start + cmtFull[1].length);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  // 上下文有批注 → 去掉
  const cmtBefore = before.match(/<qm-cmt\s+note="[^"]*">$/);
  if (cmtBefore && after.startsWith('</qm-cmt>')) {
    el.value = before.slice(0, cmtBefore[0].length * -1) + selected + after.slice(10);
    el.setSelectionRange(start - cmtBefore[0].length, start - cmtBefore[0].length + selected.length);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  // 新增批注
  const note = window.prompt('批注内容:');
  if (note === null || note.trim() === '') return;
  const tag = `<qm-cmt note="${note.replace(/"/g, '&quot;').trim()}">`;
  el.value = before + tag + selected + '</qm-cmt>' + after;
  el.setSelectionRange(start + tag.length, start + tag.length + selected.length);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

// markdown-it 实例
const md = ref(null);
if (typeof markdownit === 'function') {
  md.value = markdownit({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true
  });
  md.value.use(wikiPlugin);
}

const panelStyle = computed(() => {
  if (store.isDesktop) {
    return { flex: '1', background: 'var(--bg-panel)', minWidth: '0' };
  }
  return { background: 'var(--bg-panel)' };
});

// 纯文本标注渲染 (将标注标签转为可见样式, 其余文本转义)


// 实时渲染 Markdown 预览 + 标注 (安全包裹 try-catch)
const renderedPreview = computed(() => {
  try {
    const src = store.editContent || '';
    if (!md.value) return '';
    return renderAnnotations(md.value.render(src));
  } catch (e) {
    console.warn('Markdown 渲染失败:', e.message, '→ 回退原文');
    return '<pre style="white-space:pre-wrap;word-break:break-word">' +
           (store.editContent || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
           '</pre>';
  }
});

function catStyle(cat) {
  const active = store.editCategoryIds.includes(cat.id);
  if (active) {
    return {
      backgroundColor: cat.color + '20',
      borderColor: cat.color + '80',
      color: cat.color
    };
  }
  return {
    backgroundColor: 'transparent',
    borderColor: 'var(--border-default)',
    color: 'var(--text-tertiary)'
  };
}

// ===== 撤销 / 重做 (历史栈) =====
// 通过 @input 事件直接记录, 比 Vue watch 更可靠 (无响应式时序问题)
let historyUndo = [];
let historyRedo = [];
let historyReady = false;
let historyLastTime = 0;
let historyMergeMs = 500; // 连续输入合并窗口 (ms)
let historyPrevContent = ""; // 跟踪上次记录的内容快照

// 切换笔记时清空历史栈 + 同步初始内容
watch(() => store.editingNote?.id, () => {
  historyUndo = [];
  historyRedo = [];
  historyReady = false;
  nextTick(() => {
    const ta = getEditorEl();
    if (ta) historyPrevContent = ta.value;
    historyReady = true;
  });
});
nextTick(() => {
  const ta = getEditorEl();
  if (ta) historyPrevContent = ta.value;
  historyReady = true;
});

// @input 事件: 直接在 DOM 事件中记录历史, 不依赖 Vue watch
function onEditorInput(e) {
  if (!historyReady) return;
  const newVal = e.target.value;
  if (newVal === historyPrevContent) return; // 无实际变化
  const now = Date.now();
  const isGrowing = newVal.length > historyPrevContent.length;
  const lastIdx = historyUndo.length - 1;
  if (lastIdx >= 0 && (now - historyLastTime) < historyMergeMs && isGrowing) {
    // 合并窗口内 + 内容增长(打字): 替换最后一条, 实现"连续输入一次撤销"
    historyUndo[lastIdx] = historyPrevContent;
  } else {
    historyUndo.push(historyPrevContent);
    if (historyUndo.length > 100) historyUndo.shift();
  }
  historyLastTime = now;
  historyRedo.length = 0;
  historyPrevContent = newVal;
}

function undo() {
  const ta = getEditorEl();
  if (!ta || historyUndo.length === 0) return;
  const current = store.editContent;
  const prev = historyUndo.pop();
  historyRedo.push(current);
  historyPrevContent = prev;
  store.editContent = prev;
  ta.focus();
}
function redo() {
  const ta = getEditorEl();
  if (!ta || historyRedo.length === 0) return;
  const current = store.editContent;
  const next = historyRedo.pop();
  historyUndo.push(current);
  historyPrevContent = next;
  store.editContent = next;
  ta.focus();
}

// ===== 模式切换 =====
function switchMode(target) {
  if (store.editMode === target) return;
  if (!isAlive) return;
  store.setEditMode(target);
  nextTick(() => {
    if (!isAlive) return;
    if (target === 'plain' && plainInput.value) {
      plainInput.value.value = store.editContent || '';
    }
  });
}

// ===== Markdown 工具栏操作 =====

// 在当前光标处插入文本 (替换当前选区)
function mdInsert(prefix, suffix, placeholder) {
  const ta = contentInput.value;
  if (!ta) return;
  ta.focus();
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.slice(start, end) || placeholder || '';
  const before = ta.value.slice(0, start);
  const after = ta.value.slice(end);
  const newText = prefix + selected + (suffix || '');
  ta.value = before + newText + after;
  const cursor = start + prefix.length + selected.length;
  ta.setSelectionRange(cursor, cursor);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

// 整行前缀 (在当前行开头插入)
function mdInsertLine(prefix, suffix, placeholder) {
  const ta = contentInput.value;
  if (!ta) return;
  ta.focus();
  const start = ta.selectionStart;
  // 找当前行起点
  const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
  const before = ta.value.slice(0, lineStart);
  const lineEnd = ta.value.indexOf('\n', start);
  const actualLineEnd = lineEnd === -1 ? ta.value.length : lineEnd;
  const currentLine = ta.value.slice(lineStart, actualLineEnd) || placeholder || '';
  const after = ta.value.slice(actualLineEnd);
  const newText = prefix + currentLine + (suffix || '');
  ta.value = before + newText + after;
  const cursor = lineStart + prefix.length + currentLine.length;
  ta.setSelectionRange(cursor, cursor);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

// 切换当前行标题级别 (1-6) — 切换语义, 替代旧的 mdInsert 插入语义
function toggleHeading(level) {
  const ta = contentInput.value;
  if (!ta) return;
  ta.focus();
  const start = ta.selectionStart;
  // 找当前行起止
  const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
  const nlIdx = ta.value.indexOf('\n', start);
  const lineEnd = nlIdx === -1 ? ta.value.length : nlIdx;
  const currentLine = ta.value.slice(lineStart, lineEnd);
  // 提取现有标题前缀
  const m = currentLine.match(/^(#{1,6})\s+/);
  const hadPrefix = m ? m[0].length : 0;
  const cleaned = hadPrefix ? currentLine.slice(hadPrefix) : currentLine;
  const newPrefix = '#'.repeat(level) + ' ';
  // toggle 关闭: 行原本就是这个级别 → 清除前缀还原成普通行
  const isSameLevel = m && m[1].length === level;
  // 空行时插入占位符, 方便用户接着打字
  const placeholder = '标题' + level;
  const newLine = isSameLevel
    ? (cleaned || '')
    : (newPrefix + (cleaned || placeholder));
  const before = ta.value.slice(0, lineStart);
  const after = ta.value.slice(lineEnd);
  ta.value = before + newLine + after;
  // 光标定位到行尾 (Word/语雀 习惯)
  const newCursor = lineStart + newLine.length;
  ta.setSelectionRange(newCursor, newCursor);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

// 切换无序列表: 有前缀去掉, 无前缀加上
function toggleUnorderedList() {
  const ta = contentInput.value;
  if (!ta) return;
  ta.focus();
  const start = ta.selectionStart;
  const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
  const nlIdx = ta.value.indexOf('\n', start);
  const lineEnd = nlIdx === -1 ? ta.value.length : nlIdx;
  const currentLine = ta.value.slice(lineStart, lineEnd);
  const m = currentLine.match(/^([-*+])\s+/);
  if (m) {
    const newLine = currentLine.slice(m[0].length);
    ta.value = ta.value.slice(0, lineStart) + newLine + ta.value.slice(lineEnd);
    ta.setSelectionRange(lineStart + newLine.length, lineStart + newLine.length);
  } else {
    ta.value = ta.value.slice(0, lineStart) + '- ' + currentLine + ta.value.slice(lineEnd);
    ta.setSelectionRange(lineStart + 2 + currentLine.length, lineStart + 2 + currentLine.length);
  }
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

// 切换有序列表: 有前缀去掉, 无前缀加上编号
function toggleOrderedList() {
  const ta = contentInput.value;
  if (!ta) return;
  ta.focus();
  const start = ta.selectionStart;
  const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
  const nlIdx = ta.value.indexOf('\n', start);
  const lineEnd = nlIdx === -1 ? ta.value.length : nlIdx;
  const currentLine = ta.value.slice(lineStart, lineEnd);
  const m = currentLine.match(/^(\d+)\.\s+/);
  if (m) {
    const newLine = currentLine.slice(m[0].length);
    ta.value = ta.value.slice(0, lineStart) + newLine + ta.value.slice(lineEnd);
    ta.setSelectionRange(lineStart + newLine.length, lineStart + newLine.length);
  } else {
    let num = 1;
    if (lineStart > 0) {
      const prevLineStart = ta.value.lastIndexOf('\n', lineStart - 2) + 1;
      const prevLine = ta.value.slice(prevLineStart, lineStart - 1);
      const prevNum = prevLine.match(/^(\d+)\.\s+/);
      if (prevNum) num = parseInt(prevNum[1], 10) + 1;
    }
    const prefix = num + '. ';
    ta.value = ta.value.slice(0, lineStart) + prefix + currentLine + ta.value.slice(lineEnd);
    ta.setSelectionRange(lineStart + prefix.length + currentLine.length, lineStart + prefix.length + currentLine.length);
  }
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

// ===== 行内格式切换 (有标记去掉, 无标记加上) =====
function toggleInline(prefix, suffix) {
  const ta = contentInput.value;
  if (!ta) return;
  ta.focus();
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const before = ta.value.slice(0, start);
  const selected = ta.value.slice(start, end);
  const after = ta.value.slice(end);
  if (start === end) {
    // 无选区: 插入空标记, 光标放中间
    ta.value = before + prefix + suffix + after;
    ta.setSelectionRange(start + prefix.length, start + prefix.length);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  // 检查是否已被包裹
  if (selected.startsWith(prefix) && selected.endsWith(suffix) && selected.length > prefix.length + suffix.length) {
    // 去掉包裹
    const inner = selected.slice(prefix.length, -suffix.length);
    ta.value = before + inner + after;
    ta.setSelectionRange(start, start + inner.length);
  } else {
    ta.value = before + prefix + selected + suffix + after;
    ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
  }
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}
function toggleBold() { toggleInline('**', '**'); }
function toggleItalic() { toggleInline('*', '*'); }
function toggleStrikethrough() { toggleInline('~~', '~~'); }

// 包裹选中文本
function mdWrap(prefix, suffix, placeholder) {
  const ta = contentInput.value;
  if (!ta) return;
  ta.focus();
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.slice(start, end) || placeholder || '';
  const before = ta.value.slice(0, start);
  const after = ta.value.slice(end);
  const newText = prefix + selected + suffix;
  ta.value = before + newText + after;
  const cursor = start + prefix.length + selected.length;
  ta.setSelectionRange(cursor, cursor);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

// ===== 工具栏标签字面量 (避免在模板里写 </> 与反引号) =====
const inlineCodeLabel = '</>';
const codeBlockLabel = '{}';

// 行内代码 (反引号 \u0060 在 JS 字符串里合法, 不经过模板 parser)
function insertInlineCode() {
  mdWrap('\u0060', '\u0060', '代码');
}

// 代码块 (反引号 \u0060 + 换行 \n 在 setup 体内正常, 不进模板)
function insertCodeBlock() {
  mdInsertLine('\u0060\u0060\u0060\n', '\n\u0060\u0060\u0060', '代码块');
}

// 插入图片 (Markdown): 弹文件选择 -> 上传 -> 插入 ![](url)
function mdInsertImage() {
  fileInput.value?.click();
}
async function onFileSelected(e) {
  const file = e.target.files?.[0];
  e.target.value = ''; // 重置以允许同文件再选
  if (!file) return;
  store.editorImageUploading = true;
  try {
    const url = await uploadImageFile(file);
    mdInsert(`![`, `](${url})`, '图片描述');
  } catch (err) {
    store.showToast('图片上传失败: ' + err.message, 'error');
  } finally {
    store.editorImageUploading = false;
  }
}

// 插入链接
function mdInsertLink() {
  const ta = contentInput.value;
  if (!ta) return;
  ta.focus();
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.slice(start, end) || '链接文字';
  const url = window.prompt('链接地址:', 'https://');
  if (!url) return;
  const before = ta.value.slice(0, start);
  const after = ta.value.slice(end);
  const newText = `[${selected}](${url})`;
  ta.value = before + newText + after;
  const cursor = start + newText.length;
  ta.setSelectionRange(cursor, cursor);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

// ===== 粘贴处理 =====
async function handlePaste(e) {
  if (store.editMode !== 'markdown') return;
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) return;
      store.editorImageUploading = true;
      try {
        const url = await uploadImageFile(file);
        mdInsert(`![`, `](${url})`, '粘贴图片');
      } catch (err) {
        store.showToast('粘贴图片失败: ' + err.message, 'error');
      } finally {
        store.editorImageUploading = false;
      }
      return;
    }
  }
}

// 纯文本滚动同步 (textarea → preview div)
const plainPreviewRef = ref(null);
function syncPlainScroll() {
  const ta = plainInput.value;
  const preview = plainPreviewRef.value;
  if (ta && preview) {
    preview.scrollTop = ta.scrollTop;
    preview.scrollLeft = ta.scrollLeft;
  }
}

// 纯文本粘贴: 只保留纯文本
function handlePlainPaste(e) {
  e.preventDefault();
  const text = e.clipboardData?.getData('text/plain') || '';
  if (!text) return;
  const ta = plainInput.value;
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const before = ta.value.slice(0, start);
  const after = ta.value.slice(end);
  ta.value = before + text + after;
  const cursor = start + text.length;
  ta.setSelectionRange(cursor, cursor);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

// ===== 编辑器键盘快捷键 =====
function handleEditorKeydown(e) {
  // Ctrl+Z/Y 撤销/重做 (所有模式)
  if ((e.ctrlKey || e.metaKey) && !e.altKey) {
    if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); return; }
  }

  if (store.editMode !== 'markdown') return;
  const ta = contentInput.value;
  if (!ta) return;

  // Enter: 在列表行按回车, 下一行继续列表
  if (e.key === 'Enter' && !e.shiftKey) {
    const start = ta.selectionStart;
    const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
    const nlIdx = ta.value.indexOf('\n', start);
    const lineEnd = nlIdx === -1 ? ta.value.length : nlIdx;
    const currentLine = ta.value.slice(lineStart, lineEnd);
    const ulMatch = currentLine.match(/^([-*+])\s+/);
    const olMatch = currentLine.match(/^(\d+)\.\s+/);
    if (ulMatch || olMatch) {
      e.preventDefault();
      const prefix = ulMatch ? ulMatch[0] : (parseInt(olMatch[1], 10) + 1) + '. ';
      const content = currentLine.slice((ulMatch || olMatch)[0].length);
      if (!content.trim()) {
        // 空列表项 → 结束列表
        ta.value = ta.value.slice(0, lineStart) + '\n' + ta.value.slice(lineEnd);
        ta.setSelectionRange(lineStart + 1, lineStart + 1);
      } else {
        ta.value = ta.value.slice(0, lineEnd) + '\n' + prefix + ta.value.slice(lineEnd);
        ta.setSelectionRange(lineEnd + 1 + prefix.length, lineEnd + 1 + prefix.length);
      }
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
  }

  if (!store.markdownAssistEnabled) return;
  if (e.key !== ' ') return;

  const start = ta.selectionStart;
  const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
  const prefix = ta.value.slice(lineStart, start);
  // 用 \x60 拼接, 避免源文件出现反引号字面量 (Vue 模板 + 浏览器 parser 防御)
  const TRIPLE_BACKTICK = '\x60\x60\x60';
  if (new RegExp('^(#{1,6}\\s|[-*+]\\s|\\d+\\.\\s|>\\s|' + TRIPLE_BACKTICK + ')').test(prefix)) return;

  const map = {
    '#':    '## ',
    '##':   '### ',
    '###':  '#### ',
    '-':    '- ',
    '*':    '- ',
    '+':    '- ',
    '>':    '> '
  };
  const replacement = map[prefix];
  if (!replacement) return;

  e.preventDefault();
  const before = ta.value.slice(0, lineStart);
  const after = ta.value.slice(start);
  ta.value = before + replacement + after;
  const cursor = lineStart + replacement.length;
  ta.setSelectionRange(cursor, cursor);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

// 预览区点击链接: 阻止默认跳转,改为新窗口打开
function handlePreviewClick(e) {
  const a = e.target.closest('a');
  if (!a) return;
  // Wiki 链接: 跳转到对应笔记
  if (a.dataset.wikiLink) {
    e.preventDefault();
    const title = a.dataset.wikiLink;
    const note = findNoteByTitle(store.notes, title);
    if (note) {
      store.openNote(note);
    } else {
      store.showToast('笔记「' + title + '」还不存在', 'error');
    }
    return;
  }
  // 普通链接: 新窗口打开
  if (a.href) {
    e.preventDefault();
    window.open(a.href, '_blank', 'noopener');
  }
}

// 组件存活标记, 防止卸载后回调中的副作用
let isAlive = true;

// ===== 切换 note / mode 时同步 UI 状态 =====
const stopWatchNote = watch(
  () => store.editingNote,
  (note) => {
    if (!note || !isAlive) return;
    nextTick(() => {
      if (!isAlive) return;
      if (!note.title || note.title === '新笔记') {
        titleInput.value?.focus();
        titleInput.value?.select();
      }
    });
  }
);

const stopWatchMode = watch(() => store.editMode, (mode) => {
  if (!isAlive) return;
  nextTick(() => {
    if (!isAlive) return;
    if (mode === 'plain' && plainInput.value) {
      plainInput.value.value = store.editContent || '';
    }
  });
});

onBeforeUnmount(() => {
  isAlive = false;
  stopWatchNote();
  stopWatchMode();
  document.removeEventListener('keydown', onKeydown);
});

// 全局快捷键: Ctrl+Alt+M/P 切模式
function onKeydown(e) {
  if (!(e.ctrlKey || e.metaKey) || !e.altKey) return;
  if (!isAlive || !store.editingNote) return;
  const k = e.key.toLowerCase();
  if (k === 'm') { e.preventDefault(); switchMode('markdown'); }
  else if (k === 'p') { e.preventDefault(); switchMode('plain'); }
}
document.addEventListener('keydown', onKeydown);
</script>

<style scoped>
/* ===== Mode Switcher ===== */
.mode-switcher {
  display: inline-flex;
  background: var(--bg-input, var(--bg-panel-2));
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 2px;
}
.mode-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-tertiary);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.mode-tab:hover { color: var(--text-secondary); }
.mode-tab.active {
  background: var(--color-accent-subtle, rgba(91,141,239,0.12));
  color: var(--color-accent);
}

/* ===== Markdown Toolbar ===== */
.md-toolbar-group {
  display: inline-flex;
  gap: 1px;
  background: var(--bg-input, var(--bg-panel-2));
  border: 1px solid var(--border-default);
  border-radius: 6px;
  padding: 1px;
}
.md-toolbar-divider {
  width: 4px;
}
.md-toolbar-spacer { flex: 1; }
.md-tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 26px;
  padding: 0 6px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.12s;
}
.md-tool:hover {
  background: var(--color-accent-subtle, rgba(91,141,239,0.12));
  color: var(--color-accent);
}
.md-tool:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.md-tool.active {
  background: var(--color-accent-subtle, rgba(91,141,239,0.12));
  color: var(--color-accent);
}

/* ===== Markdown Editor + Preview ===== */
.md-pane {
  display: flex;
  gap: 12px;
  min-height: 50vh;
}
.md-pane.with-preview {
  flex-direction: row;
}
.md-editor {
  flex: 1;
  background: var(--bg-input, var(--bg-panel-2));
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 12px 14px;
  color: var(--text-secondary);
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 13.5px;
  line-height: 1.7;
  resize: none;
  outline: none;
  min-height: 50vh;
  white-space: pre-wrap;
  word-wrap: break-word;
}
.md-editor:focus {
  border-color: var(--color-accent);
}
.md-pane.with-preview .md-editor {
  flex: 1 1 50%;
}
.md-preview {
  flex: 1 1 50%;
  background: var(--bg-input, var(--bg-panel-2));
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 12px 16px;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.75;
  overflow-y: auto;
  min-height: 50vh;
  max-height: 70vh;
}
/* v-html 注入的元素没有 data-v-xxx, 必须用 :deep() 穿透 scoped 边界 */
.md-preview :deep(h1), .md-preview :deep(h2), .md-preview :deep(h3),
.md-preview :deep(h4), .md-preview :deep(h5), .md-preview :deep(h6) {
  margin: 16px 0 8px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--text-primary);
}
.md-preview :deep(h1) { font-size: 22px; border-bottom: 1px solid var(--border-default); padding-bottom: 6px; }
.md-preview :deep(h2) { font-size: 19px; }
.md-preview :deep(h3) { font-size: 17px; }
.md-preview :deep(h4) { font-size: 15px; }
.md-preview :deep(p) { margin: 8px 0; }
.md-preview :deep(a) { color: var(--color-accent); text-decoration: none; }
.md-preview :deep(a:hover) { text-decoration: underline; }
.md-preview :deep(.wiki-link) {
  color: var(--color-primary);
  border-bottom: 1px dashed var(--color-primary-border);
  cursor: pointer;
  padding: 0 2px;
  border-radius: 2px;
  transition: background 0.12s;
  text-decoration: none;
}
.md-preview :deep(.wiki-link:hover) {
  background: var(--color-primary-subtle);
  text-decoration: none;
}
.md-preview :deep(ul), .md-preview :deep(ol) { margin: 8px 0; padding-left: 24px; }
.md-preview :deep(ul) { list-style-type: disc; }
.md-preview :deep(ol) { list-style-type: decimal; }
.md-preview :deep(li) { margin: 4px 0; }
.md-preview :deep(blockquote) {
  margin: 8px 0;
  padding: 6px 12px;
  border-left: 3px solid var(--color-accent);
  background: var(--color-accent-subtle, rgba(91,141,239,0.08));
  color: var(--text-secondary);
  border-radius: 0 4px 4px 0;
}
.md-preview :deep(code) {
  background: var(--bg-panel);
  padding: 1px 6px;
  border-radius: 3px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
  color: var(--color-accent);
}
.md-preview :deep(pre) {
  background: var(--bg-panel);
  padding: 12px 14px;
  border-radius: 6px;
  overflow-x: auto;
}
.md-preview :deep(pre code) {
  background: transparent;
  padding: 0;
  color: var(--text-primary);
}
.md-preview :deep(img) {
  max-width: 100%;
  border-radius: 6px;
  margin: 8px 0;
}
.md-preview :deep(hr) {
  border: none;
  border-top: 1px solid var(--border-default);
  margin: 16px 0;
}
.md-preview :deep(table) {
  border-collapse: collapse;
  margin: 8px 0;
}
.md-preview :deep(table th), .md-preview :deep(table td) {
  border: 1px solid var(--border-default);
  padding: 6px 10px;
}
@media (max-width: 768px) {
  .md-pane.with-preview { flex-direction: column; }
  .md-pane.with-preview .md-editor,
  .md-pane.with-preview .md-preview {
    flex: 1 1 auto;
    min-height: 30vh;
  }
}

/* ===== Plain Text Editor + Annotation Overlay ===== */
.editor-fullscreen {
  position: fixed !important;
  inset: 0 !important;
  z-index: 40 !important;
}


.btn-ghost.is-active {
  background: var(--color-accent-subtle) !important;
  color: var(--color-accent) !important;
}
button[aria-label="删除笔记"] {
  transition: background 0.15s, color 0.15s;
}
button[aria-label="删除笔记"]:hover {
  background: var(--color-danger-subtle, #FEE2E2) !important;
  color: var(--color-danger) !important;
}
/* ===== 标注样式 (:deep 穿透 v-html 内容) ===== */
:deep(.md-preview .qm-underline),
:deep(.plain-annot-preview .qm-underline) {
  text-decoration: underline !important;
  text-decoration-color: var(--color-primary) !important;
  text-underline-offset: 2px;
  border-bottom: 1px solid var(--color-primary) !important;
  padding-bottom: 0;
}
:deep(.md-preview .qm-highlight),
:deep(.plain-annot-preview .qm-highlight) {
  padding: 0 2px;
  border-radius: 2px;
}
:deep(.md-preview .qm-comment),
:deep(.plain-annot-preview .qm-comment) {
  cursor: help;
  border-bottom: 1px dashed var(--color-accent);
}
:deep(.md-preview .qm-comment:hover),
:deep(.plain-annot-preview .qm-comment:hover) {
  background: var(--color-accent-subtle);
}
:deep(.md-preview .qm-cmt-marker),
:deep(.plain-annot-preview .qm-cmt-marker) {
  font-size: 9px;
  margin-left: 1px;
  vertical-align: super;
  line-height: 0;
}
/* ===== Plain Text Editor ===== */
.plain-pane {
  display: flex;
  min-height: 50vh;
}
.plain-editor {
  flex: 1;
  background: var(--bg-input, var(--bg-panel-2));
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 14px 16px;
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 14.5px;
  line-height: 1.75;
  resize: none;
  outline: none;
  min-height: 50vh;
  white-space: pre-wrap;
  word-wrap: break-word;
}
.plain-editor:focus {
  border-color: var(--color-accent);
}
</style>
