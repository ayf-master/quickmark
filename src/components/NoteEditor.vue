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

      <!-- 左侧: 上一条 / 返回列表 / 模式切换 -->
      <div class="flex items-center gap-1 min-w-0">
        <!-- 回到上一条笔记 (导航历史栈非空时启用) -->
        <button v-if="store.editingNote && store.noteHistory.length > 0"
          class="btn btn-icon-sm btn-ghost flex-shrink-0"
          @click="goBackToPrev"
          :title="'回到上一条笔记 (Alt+←)' + (prevNoteTitle ? ' · ' + prevNoteTitle : '')"
          aria-label="回到上一条笔记">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h11a5 5 0 010 10H9m0-10l4-4M9 6l-4 4"/>
          </svg>
        </button>
        <!-- 反撤回: 前进到下一条 (前进栈非空时显示) -->
        <button v-if="store.editingNote && store.noteForward.length > 0"
          class="btn btn-icon-sm btn-ghost flex-shrink-0"
          @click="goForwardToNext"
          :title="'前进到下一条笔记 (Alt+→)' + (nextNoteTitle ? ' · ' + nextNoteTitle : '')"
          aria-label="前进到下一条笔记">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10H10a5 5 0 000 10h5m0-10l-4-4m4 4l-4 4"/>
          </svg>
        </button>
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
            :aria-selected="store.editMode === 'markdown'"
            :class="['mode-tab', { active: store.editMode === 'markdown' }]"
            @click="switchMode('markdown')"
            title="Markdown">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
            </svg>
            Markdown
          </button>
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
        </div>
      </div>

      <!-- 右侧: 计划 / 收藏 / 编辑分类 / 删除 -->
      <div class="flex items-center gap-1" style="flex-shrink:0;">
        <!-- 📅 计划甘特表 -->
        <div class="relative">
          <button @click="planPickerVisible = !planPickerVisible"
            class="btn btn-icon-sm btn-ghost"
            :class="{ 'is-active': planActive || planPickerVisible }"
            :title="planActive ? planStart + ' → ' + planEnd : '设为计划'">
            <span style="font-size:14px;line-height:1;">📅</span>
          </button>
          <div v-if="planPickerVisible"
            class="plan-picker absolute right-0 top-full mt-2 z-50 p-3 rounded-xl shadow-xl"
            style="background:var(--bg-elevated); border:1px solid var(--border-default); min-width:250px;"
            @click.stop>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold" style="color:var(--text-tertiary);">设定起止日期</span>
              <button @click="removePlan" v-if="planActive" class="text-xs" style="color:var(--color-danger);">移除计划</button>
            </div>
            <div class="flex flex-col gap-1.5 mb-2">
              <label class="flex items-center gap-2 text-xs" style="color:var(--text-secondary);">
                <span style="width:32px;">开始</span>
                <input type="date" v-model="planStart"
                  class="flex-1 px-2 py-1 rounded text-xs"
                  style="border:1px solid var(--border-default); background:var(--bg-input,var(--bg-panel)); color:var(--text-primary);" />
              </label>
              <label class="flex items-center gap-2 text-xs" style="color:var(--text-secondary);">
                <span style="width:32px;">结束</span>
                <input type="date" v-model="planEnd"
                  class="flex-1 px-2 py-1 rounded text-xs"
                  style="border:1px solid var(--border-default); background:var(--bg-input,var(--bg-panel)); color:var(--text-primary);" />
              </label>
            </div>
            <div class="flex items-center gap-2 text-xs mb-2" style="color:var(--text-secondary);">
              <span style="width:32px;">进度</span>
              <div style="flex:1;display:flex;align-items:center;gap:6px;">
                <input type="range" min="0" max="100" step="5" v-model.number="planProgress" class="plan-progress-slider" />
                <span style="width:28px;text-align:right;font-variant-numeric:tabular-nums;">{{ planProgress }}%</span>
              </div>
            </div>
            <div class="flex items-center gap-2 text-xs mb-3" style="color:var(--text-secondary);">
              <span style="width:32px;">颜色</span>
              <div class="flex gap-1.5 flex-wrap">
                <button v-for="c in PLAN_COLORS" :key="c"
                  @click="planColor = (planColor === c ? null : c)" class="plan-color-swatch"
                  :class="{ active: planColor === c, none: !c }"
                  :style="c ? { background: c } : {}" :title="c || '分类色'">
                  <template v-if="!c">🎨</template>
                </button>
              </div>
            </div>
            <div class="flex gap-2">
              <button @click="planPickerVisible = false" class="flex-1 py-1.5 rounded text-xs"
                style="border:1px solid var(--border-default); color:var(--text-secondary); background:transparent;">取消</button>
              <button @click="confirmPlan" class="flex-1 py-1.5 rounded text-xs font-semibold text-white"
                style="background:var(--color-accent);">确定</button>
            </div>
          </div>
        </div>
        <!-- 收藏 -->
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
            class="cat-picker absolute right-0 top-full mt-2 z-50 p-3 rounded-xl shadow-xl"
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

    <!-- 编辑器主体 (新手引导: 手机端高亮此区域而非整个全屏编辑器) -->
    <div class="flex-1 panel-scroll" v-if="store.editingNote" data-tour="editor-body">

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
          <div class="relative flex-1 min-w-[120px]">
            <input ref="linkInputRef"
              v-model="linkInputText"
              @keydown.enter.prevent="onLinkEnter"
              @keydown.arrow-down.prevent="moveLinkSuggestion(1)"
              @keydown.arrow-up.prevent="moveLinkSuggestion(-1)"
              @keydown.esc="linkSuggestions = []; linkSuggestIndex = -1"
              @keydown.backspace="handleLinkBackspace"
              @paste.prevent="handleLinkPaste"
              @blur="hideLinkSuggestions"
              placeholder="输入标题搜索笔记，回车添加链接..."
              class="w-full bg-transparent text-xs outline-none"
              style="color: var(--text-secondary);" />
            <!-- 候选下拉: 输入部分标题 → 模糊匹配已有笔记 -->
            <div v-if="linkSuggestions.length > 0"
              class="absolute left-0 right-0 top-full mt-1 z-30 rounded-lg overflow-hidden max-h-56 overflow-y-auto shadow-lg"
              style="background: var(--bg-elevated, var(--bg-card, #fff)); border: 1px solid var(--border-subtle);">
              <button v-for="(s, i) in linkSuggestions" :key="s.id" type="button"
                class="w-full text-left px-3 py-2 text-xs truncate"
                :style="i === linkSuggestIndex
                  ? 'background: var(--color-primary-bg, rgba(99,102,241,.12)); color: var(--text-primary);'
                  : 'color: var(--text-secondary);'"
                @mousedown.prevent="pickLinkSuggestion(s)"
                @mouseenter="linkSuggestIndex = i">
                {{ s.title || '无标题' }}
              </button>
            </div>
          </div>
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
          <button @click="toggleQuote()" class="md-tool" title="引用">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z"/>
            </svg>
          </button>
          <button @click="toggleInlineCode()" class="md-tool" title="行内代码">
            <code class="text-[11px] font-mono">{{ inlineCodeLabel }}</code>
          </button>
          <button @click="toggleCodeBlock()" class="md-tool" title="代码块">{{ codeBlockLabel }}</button>
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
          <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="onFileSelected" />
        </div>

        <div class="md-toolbar-divider"></div>
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
            @click="checkOrderedListMerge"
            @keyup="checkOrderedListMerge"
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

      <!-- 有序列表合并提示 -->
      <div v-if="orderedListMerge"
        class="flex items-center justify-center gap-2 py-1.5 px-3 text-xs rounded-md mx-4 sm:mx-6 mb-2 cursor-pointer select-none"
        style="background: var(--color-accent-15, #3b82f620); color: var(--color-accent, #3b82f6); border: 1px solid var(--color-accent-30, #3b82f640);"
        @click.stop="mergeOrderedList"
        title="点击将序号续接上方列表">
        <span>序号重新开始编排</span>
        <span style="opacity:0.6;">·</span>
        <span>点击合并为 <strong>{{ orderedListMerge.targetNum }}</strong>. 开始继续编号</span>
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
        <!-- 间隔重复: 到期笔记标记已复习 -->
        <button v-if="isDueNote"
          @click="markReviewed"
          :disabled="markingReview"
          class="review-mark-btn">
          <span v-if="markingReview">⏳</span>
          <span v-else>✓</span>
          标记已复习
        </button>
        <span class="w-1.5 h-1.5 rounded-full"
          :style="{ background: store.editorImageUploading ? 'var(--color-warning, #F59E0B)' : 'var(--color-success)' }"></span>
        {{ store.editorImageUploading ? '上传中...' : '自动保存' }}
      </span>
    </footer>

    <!-- 图片全屏查看 -->
    <Teleport to="body">
      <div v-if="fullscreenImage"
        class="img-fullscreen-overlay"
        @click.self="closeFullscreen"
        @touchstart.passive="onFullscreenTouchStart"
        @touchend.passive="onFullscreenTouchEnd"
        @keydown.escape="closeFullscreen"
        @keydown.left="goFullscreenPrev"
        @keydown.right="goFullscreenNext"
        tabindex="0"
        ref="fullscreenOverlay">
        <button class="img-fullscreen-close" @click="closeFullscreen" aria-label="关闭">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <!-- 上一张 -->
        <button v-if="fullscreenIndex > 0"
          class="img-fullscreen-nav img-fullscreen-nav-prev"
          @click.stop="goFullscreenPrev"
          aria-label="上一张">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <img :src="fullscreenImage" :key="fullscreenIndex" class="img-fullscreen-content" alt="全屏图片">

        <!-- 下一张 -->
        <button v-if="fullscreenIndex < fullscreenImages.length - 1"
          class="img-fullscreen-nav img-fullscreen-nav-next"
          @click.stop="goFullscreenNext"
          aria-label="下一张">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        <!-- 计数器 -->
        <div class="img-fullscreen-counter">{{ fullscreenIndex + 1 }} / {{ fullscreenImages.length }}</div>
      </div>
    </Teleport>
  </section>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount, nextTick, onMounted } from 'vue';
import markdownit from 'markdown-it';
import { store } from '@/store';
import { features, refreshDueNotes, removeDueNote } from '@/store/features.js';
import API from '@/api/index.js';
import { uploadImageFile } from '@/utils/content';
import wikiPlugin from '@/utils/markdown-it-wiki';
import { renderAnnotations } from '@/utils/markdown-it-annotations';
import { findNoteByTitle } from '@/utils/wiki-link';
import BacklinkPanel from '@/components/BacklinkPanel.vue';
// 计划甘特表: 数据存于 store.editPlanData, 不污染笔记正文

const titleInput = ref(null);
const contentInput = ref(null);
const plainInput = ref(null);
const fileInput = ref(null);
const categoryEditorVisible = ref(false);
const linkInputText = ref('');
const linkInputRef = ref(null);
const annotationRefs = ref({});
// 间隔重复: 使用 features.dueCardMap (共享状态, 与 NoteList 联动)
const markingReview = ref(false);
const isDueNote = computed(() => {
  return store.editingNote?.id && features.dueCardMap[store.editingNote.id] != null;
});

// ===== 笔记导航历史: "回到上一条笔记" =====
const prevNoteTitle = computed(() => {
  const lastId = store.noteHistory[store.noteHistory.length - 1];
  if (!lastId) return '';
  const n = store.notes.find(x => x.id === lastId);
  return n ? n.title || '无标题' : '';
});
// goBackToPreviousNote 是 async, 返回的是 Promise, 不能用 !promise 判断成败
async function goBackToPrev() {
  await store.goBackToPreviousNote();
}

// ===== 反撤回: 前进到下一条笔记 =====
const nextNoteTitle = computed(() => {
  const lastId = store.noteForward[store.noteForward.length - 1];
  if (!lastId) return '';
  const n = store.notes.find(x => x.id === lastId);
  return n ? n.title || '无标题' : '';
});
async function goForwardToNext() {
  await store.goForwardToNextNote();
}

async function markReviewed() {
  if (!store.editingNote?.id) return;
  const cardId = features.dueCardMap[store.editingNote.id];
  if (!cardId) return;
  markingReview.value = true;
  try {
    await API.markReviewed(cardId);
    store.showToast('已标记为已复习');
    // 从共享到期列表移除, NoteList 高亮即时消失
    removeDueNote(store.editingNote.id);
  } catch (e) {
    store.showToast('标记失败: ' + (e.message || '未知错误'), 'error');
  } finally {
    markingReview.value = false;
  }
}

watch(() => features.spacedRepetition, (val) => {
  if (val) refreshDueNotes();
  else { features.dueNoteIds = []; features.dueCardMap = {}; features.dueCount = 0; }
});

onMounted(() => {
  if (features.spacedRepetition) refreshDueNotes();
});

// ===== 计划甘特表: 设为计划 (存于 store.editPlanData, 不污染正文) =====
const PLAN_COLORS = [null, '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#ec4899'];
const planPickerVisible = ref(false);
const planStart = ref('');
const planEnd = ref('');
const planProgress = ref(0);
const planColor = ref(null);
const planActive = computed(() => !!(planStart.value && planEnd.value));

// 同步本地 ref ← store.editPlanData (浮层关闭时 / 初始加载时)
function syncPlanFromStore() {
  const p = store.editPlanData;
  planStart.value = p?.start || '';
  planEnd.value = p?.end || '';
  planProgress.value = p?.progress ?? 0;
  planColor.value = p?.color || null;
}
// 浮层打开时也从 store 同步 (丢弃未保存的改动)
watch(planPickerVisible, (vis) => { if (vis) syncPlanFromStore(); });
// store.editPlanData 变化时同步 (切换笔记等), 浮层打开时不覆盖用户编辑
watch(() => store.editPlanData, (val) => { if (!planPickerVisible.value) syncPlanFromStore(); }, { immediate: true });

function confirmPlan() {
  if (!planStart.value || !planEnd.value) return;
  store.editPlanData = {
    start: planStart.value,
    end: planEnd.value,
    progress: planProgress.value,
    color: planColor.value || undefined
  };
  planPickerVisible.value = false;
  store.showToast('计划已保存');
  store.saveCurrentNote();
}

function removePlan() {
  store.editPlanData = null;
  planStart.value = '';
  planEnd.value = '';
  planProgress.value = 0;
  planColor.value = null;
  planPickerVisible.value = false;
  store.showToast('已移除计划');
  store.saveCurrentNote();
}

// 图片全屏浏览（支持多张导航）
const fullscreenImages = ref([]);
const fullscreenIndex = ref(-1);
const fullscreenOverlay = ref(null);
const fullscreenImage = computed(() =>
  fullscreenIndex.value >= 0 && fullscreenIndex.value < fullscreenImages.value.length
    ? fullscreenImages.value[fullscreenIndex.value]
    : null
);
function goFullscreenPrev() {
  if (fullscreenIndex.value > 0) fullscreenIndex.value--;
}
function goFullscreenNext() {
  if (fullscreenIndex.value < fullscreenImages.value.length - 1) fullscreenIndex.value++;
}
function closeFullscreen() {
  fullscreenImages.value = [];
  fullscreenIndex.value = -1;
}
function goFullscreenByIndex(idx) {
  if (idx >= 0 && idx < fullscreenImages.value.length) fullscreenIndex.value = idx;
}

// 移动端全屏浏览: 左右滑动切换图片 (桌面端保留按钮/键盘)
const fullscreenTouchX = ref(null);
const fullscreenTouchY = ref(null);
const FULLSCREEN_SWIPE_THRESHOLD = 50; // px
function onFullscreenTouchStart(e) {
  const t = e.changedTouches[0];
  fullscreenTouchX.value = t.clientX;
  fullscreenTouchY.value = t.clientY;
}
function onFullscreenTouchEnd(e) {
  if (fullscreenTouchX.value == null) return;
  const dx = e.changedTouches[0].clientX - fullscreenTouchX.value;
  const dy = e.changedTouches[0].clientY - fullscreenTouchY.value;
  fullscreenTouchX.value = null;
  fullscreenTouchY.value = null;
  if (Math.abs(dx) < FULLSCREEN_SWIPE_THRESHOLD) return;   // 位移太小不算滑动
  if (Math.abs(dy) > Math.abs(dx)) return;                  // 垂直为主的滑动忽略, 不干扰滚动
  if (dx < 0) goFullscreenNext();
  else goFullscreenPrev();
}
// 从 Markdown 原文提取所有图片 URL
function extractImageUrls(markdown) {
  const urls = [];
  const mdRe = /!\[.*?\]\(([^)]+)\)/g;
  let m;
  while ((m = mdRe.exec(markdown)) !== null) urls.push(m[1]);
  const htmlRe = /<img[^>]+src="([^"]+)"/gi;
  while ((m = htmlRe.exec(markdown)) !== null) {
    if (!urls.includes(m[1])) urls.push(m[1]);
  }
  return urls;
}

// 全屏浮层出现时自动聚焦（响应键盘事件）
watch(fullscreenImage, (val) => {
  if (val) {
    nextTick(() => fullscreenOverlay.value?.focus());
  }
});

// Wiki 链接编辑

// ===== 链接输入自动补全: 输入部分标题 → 跨分类模糊搜索已有笔记 =====
const linkSuggestions = ref([]);
const linkSuggestIndex = ref(-1);
let linkSuggestTimer = null;

watch(linkInputText, (val) => {
  clearTimeout(linkSuggestTimer);
  const q = (val || '').trim();
  if (!q) {
    linkSuggestions.value = [];
    linkSuggestIndex.value = -1;
    return;
  }
  // 250ms 防抖, 避免每敲一个字就打一次搜索接口
  linkSuggestTimer = setTimeout(async () => {
    try {
      const results = await API.getNotes({ search: q });
      linkSuggestions.value = (results || [])
        // 排除已添加过的和当前笔记自身
        .filter(n => n.id !== store.editingNote?.id
          && !store.editLinks.some(l => l.title === n.title))
        .slice(0, 8);
      linkSuggestIndex.value = linkSuggestions.value.length ? 0 : -1;
    } catch (e) {
      linkSuggestions.value = [];
    }
  }, 250);
});

// Enter: 有候选时 = 选中高亮项; 没有候选 = 按原文添加 (保留旧行为)
function onLinkEnter() {
  if (linkSuggestions.value.length > 0 && linkSuggestIndex.value >= 0) {
    pickLinkSuggestion(linkSuggestions.value[linkSuggestIndex.value]);
    return;
  }
  addLink();
}

function moveLinkSuggestion(dir) {
  const n = linkSuggestions.value.length;
  if (!n) return;
  linkSuggestIndex.value = (linkSuggestIndex.value + dir + n) % n;
}

function pickLinkSuggestion(note) {
  if (!note) return;
  if (!store.editLinks.some(l => l.title === note.title)) {
    store.editLinks.push({ title: note.title, annotation: '' });
    store.scheduleAutoSave();
  }
  linkInputText.value = '';
  linkSuggestions.value = [];
  linkSuggestIndex.value = -1;
  nextTick(() => linkInputRef.value?.focus());
}

// blur 延迟清空: 给 mousedown.prevent 的候选点击留出触发时间
function hideLinkSuggestions() {
  setTimeout(() => {
    linkSuggestions.value = [];
    linkSuggestIndex.value = -1;
  }, 150);
}

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
async function openLinkNote(title) {
  let note = findNoteByTitle(store.notes, title);
  if (!note) {
    // 当前列表里没有: 链接的笔记可能在别的分类下 → 用搜索找
    try {
      const results = await API.getNotes({ search: title });
      // 搜索是模糊匹配, 优先取标题完全一致的那条
      note = (results || []).find(n => n.title === title) || (results || [])[0];
    } catch (e) {
      store.showToast('查找链接笔记失败', 'error');
      return;
    }
  }
  if (!note) {
    store.showToast('未找到笔记: ' + title, 'error');
    return;
  }
  // 分类栏 + 笔记列表一并切到目标笔记所在分类
  await store.openNoteFromElsewhere(note);
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

  // 自定义图片渲染：外包容器 + 放大按钮
  md.value.renderer.rules.image = (tokens, idx) => {
    const token = tokens[idx];
    const src = token.attrGet('src') || '';
    const alt = token.content || '';
    const title = token.attrGet('title') || '';
    const titleAttr = title ? ` title="${title}"` : '';
    const imgHtml = `<img src="${src}" alt="${alt}"${titleAttr} loading="lazy">`;
    const escapedSrc = src.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    return `<div class="img-wrapper">
      ${imgHtml}
      <button class="img-zoom-btn" data-img-src="${escapedSrc}" type="button" aria-label="放大图片">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="11" y1="8" x2="11" y2="14"/>
          <line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
      </button>
    </div>`;
  };
}

const panelStyle = computed(() => {
  if (store.isDesktop || store.isTablet) {
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

// ===== 撤销 / 重做 (历史栈, 记录光标位置) =====
// 历史条目: { content: string, cursor: number } — 记录修改前的内容快照和光标位置
let historyUndo = [];
let historyRedo = [];
let historyReady = false;
let historyLastTime = 0;
let historyMergeMs = 500; // 连续输入合并窗口 (ms)
let historyPrevContent = "";

// 有序列表合并（重新开始编排的序号 → 续号合并）
const orderedListMerge = ref(null);

function checkOrderedListMerge() {
  const ta = store.editMode === 'markdown' ? contentInput.value : null;
  if (!ta) { orderedListMerge.value = null; return; }
  const pos = ta.selectionStart;
  const value = store.editContent;
  if (!value) { orderedListMerge.value = null; return; }
  const curLineStart = value.lastIndexOf('\n', pos - 1) + 1;
  const nextNl = value.indexOf('\n', curLineStart);
  const curLineEnd = nextNl === -1 ? value.length : nextNl;
  const curLine = value.slice(curLineStart, curLineEnd);
  const curM = curLine.match(/^(\d+)\.\s+/);
  // 需要前一行也存在有序前缀
  if (!curM || curLineStart === 0) { orderedListMerge.value = null; return; }
  const curNum = parseInt(curM[1], 10);
  const prevLineStart = value.lastIndexOf('\n', curLineStart - 2) + 1;
  const prevLine = value.slice(prevLineStart, curLineStart - 1);
  const prevM = prevLine.match(/^(\d+)\.\s+/);
  if (!prevM) { orderedListMerge.value = null; return; }
  const prevNum = parseInt(prevM[1], 10);
  // 当前行序号不是前一行的续号 → 是重新开始的 → 提供合并
  if (curNum !== prevNum + 1) {
    orderedListMerge.value = { lineStart: curLineStart, targetNum: prevNum + 1, prevNum };
  } else {
    orderedListMerge.value = null;
  }
}

function mergeOrderedList() {
  const merge = orderedListMerge.value;
  if (!merge || !contentInput.value) return;
  const ta = contentInput.value;
  const value = store.editContent;
  // 从合并行开始，收集所有连续的有序行
  const lines = [];
  let pos = merge.lineStart;
  while (pos < value.length) {
    const nl = value.indexOf('\n', pos);
    const lineEnd = nl === -1 ? value.length : nl;
    const line = value.slice(pos, lineEnd);
    if (!/^(\d+)\.\s+/.test(line)) break;
    lines.push({ start: pos, end: lineEnd, content: line });
    if (nl === -1) break;
    pos = nl + 1;
  }
  if (lines.length === 0) { orderedListMerge.value = null; return; }
  // 手动记录撤销历史
  if (historyReady && value !== historyPrevContent) {
    historyUndo.push({ content: historyPrevContent, cursor: ta.selectionStart });
    if (historyUndo.length > 100) historyUndo.shift();
    historyRedo.length = 0;
  }
  let newContent = value;
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    const m = l.content.match(/^(\d+)\.\s+/);
    if (m) {
      const prefix = (merge.targetNum + i) + '. ';
      newContent = newContent.slice(0, l.start) + prefix + l.content.slice(m[0].length) + newContent.slice(l.end);
    }
  }
  historyPrevContent = newContent;
  historyLastTime = Date.now();
  store.editContent = newContent;
  orderedListMerge.value = null;
}

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

// @input 事件: 记录历史 + 当前光标位置
function onEditorInput(e) {
  if (!historyReady) return;
  const newVal = e.target.value;
  if (newVal === historyPrevContent) return;
  const ta = e.target;
  const cursorAfter = ta.selectionStart;
  const isGrowing = newVal.length > historyPrevContent.length;
  // 估算修改前的光标位置:
  //   打字/粘贴(增长) → 光标在选中内容开始处
  //   删除(缩短) → 光标已在删除位置
  const cursorBefore = isGrowing
    ? Math.max(0, cursorAfter - (newVal.length - historyPrevContent.length))
    : cursorAfter;
  const now = Date.now();
  const lastIdx = historyUndo.length - 1;
  const entry = { content: historyPrevContent, cursor: cursorBefore };
  if (lastIdx >= 0 && (now - historyLastTime) < historyMergeMs && isGrowing) {
    // 合并窗口内 + 内容增长(打字): 替换最后一条
    historyUndo[lastIdx] = entry;
  } else {
    historyUndo.push(entry);
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
  const raw = historyUndo.pop();
  // 兼容旧版纯字符串条目
  const prev = typeof raw === 'string' ? raw : raw.content;
  const cursor = typeof raw === 'string' ? prev.length : Math.min(raw.cursor, prev.length);
  // 删除(恢复后变长) → 光标在被删文字之后; 打字(恢复后变短) → 光标在插入起始处
  const changeSize = prev.length - current.length;
  const targetCursor = changeSize > 0
    ? Math.min(cursor + changeSize, prev.length)
    : cursor;
  historyRedo.push({ content: current, cursor: ta.selectionStart });
  historyPrevContent = prev;
  store.editContent = prev;
  nextTick(() => {
    ta.setSelectionRange(targetCursor, targetCursor);
    ta.focus();
  });
}
function redo() {
  const ta = getEditorEl();
  if (!ta || historyRedo.length === 0) return;
  const current = store.editContent;
  const raw = historyRedo.pop();
  const next = typeof raw === 'string' ? raw : raw.content;
  const cursor = typeof raw === 'string' ? next.length : Math.min(raw.cursor, next.length);
  const changeSize = next.length - current.length;
  const targetCursor = changeSize > 0
    ? Math.min(cursor + changeSize, next.length)
    : cursor;
  historyUndo.push({ content: current, cursor: ta.selectionStart });
  historyPrevContent = next;
  store.editContent = next;
  nextTick(() => {
    ta.setSelectionRange(targetCursor, targetCursor);
    ta.focus();
  });
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
// 在当前光标处插入文本 (替换当前选区)
// 修复 cursor 位置 bug: 原来 cursor = start + prefix.length + selected.length
//   会停在 prefix 后, suffix (如 "](url)") 还在后面, 下次插入会嵌进 suffix 前
//   表现为多图粘贴时 markdown 嵌套: ![a![b![c(...)
// 改为 cursor = start + newText.length, 让光标停在完整 newText 末尾
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
  const cursor = start + newText.length;
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

// 切换无序列表: 有前缀去掉, 无前缀加上; 有序可交叉切换（支持多行选中）
function toggleUnorderedList() {
  const ta = contentInput.value;
  if (!ta) return;
  ta.focus();
  const start = ta.selectionStart;
  const end = ta.selectionEnd;

  // 确定选中区域覆盖的行范围
  const firstLineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
  const actualEnd = start === end ? start : end;
  const lastNl = ta.value.indexOf('\n', actualEnd);
  const lastLineEnd = lastNl === -1 ? ta.value.length : lastNl;

  // 收集所有受影响的行（统一单行/多行）
  const lines = [];
  let pos = firstLineStart;
  while (pos <= lastLineEnd) {
    const nextNl = ta.value.indexOf('\n', pos);
    if (nextNl === -1 || nextNl > lastLineEnd) {
      if (lastLineEnd > pos) lines.push({ start: pos, end: lastLineEnd });
      break;
    }
    if (nextNl > pos) lines.push({ start: pos, end: nextNl });
    pos = nextNl + 1;
  }
  if (lines.length === 0) return;

  const allOrdered = lines.every(l => /^(\d+)\.\s+/.test(ta.value.slice(l.start, l.end)));
  const allUnordered = lines.every(l => /^([-*+])\s+/.test(ta.value.slice(l.start, l.end)));

  if (allOrdered) {
    // 有序 → 无序（交叉切换）
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      const content = ta.value.slice(l.start, l.end);
      const m = content.match(/^(\d+)\.\s+/);
      if (m) {
        ta.value = ta.value.slice(0, l.start) + '- ' + content.slice(m[0].length) + ta.value.slice(l.end);
      }
    }
  } else if (allUnordered) {
    // 全部去掉无序前缀（取消列表）
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      const content = ta.value.slice(l.start, l.end);
      const m = content.match(/^([-*+])\s+/);
      if (m) {
        ta.value = ta.value.slice(0, l.start) + content.slice(m[0].length) + ta.value.slice(l.end);
      }
    }
  } else {
    // 全部加上无序前缀
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      const content = ta.value.slice(l.start, l.end);
      ta.value = ta.value.slice(0, l.start) + '- ' + content + ta.value.slice(l.end);
    }
  }

  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

// 切换有序列表: 有前缀去掉, 无前缀加上编号; 无序可交叉切换（支持多行选中）
function toggleOrderedList() {
  const ta = contentInput.value;
  if (!ta) return;
  ta.focus();
  const start = ta.selectionStart;
  const end = ta.selectionEnd;

  const firstLineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
  const actualEnd = start === end ? start : end;
  const lastNl = ta.value.indexOf('\n', actualEnd);
  const lastLineEnd = lastNl === -1 ? ta.value.length : lastNl;

  // 收集所有受影响的行（统一单行/多行）
  const lines = [];
  let pos = firstLineStart;
  while (pos <= lastLineEnd) {
    const nextNl = ta.value.indexOf('\n', pos);
    if (nextNl === -1 || nextNl > lastLineEnd) {
      if (lastLineEnd > pos) lines.push({ start: pos, end: lastLineEnd });
      break;
    }
    if (nextNl > pos) lines.push({ start: pos, end: nextNl });
    pos = nextNl + 1;
  }
  if (lines.length === 0) return;

  const allUnordered = lines.every(l => /^([-*+])\s+/.test(ta.value.slice(l.start, l.end)));
  const allOrdered = lines.every(l => /^(\d+)\.\s+/.test(ta.value.slice(l.start, l.end)));

  if (allUnordered) {
    // 无序 → 有序（交叉切换），自动编序号
    let num = 1;
    if (firstLineStart > 0) {
      const prevLineStart = ta.value.lastIndexOf('\n', firstLineStart - 2) + 1;
      const prevLine = ta.value.slice(prevLineStart, firstLineStart - 1);
      const prevNum = prevLine.match(/^(\d+)\.\s+/);
      if (prevNum) num = parseInt(prevNum[1], 10) + 1;
    }
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      const content = ta.value.slice(l.start, l.end);
      const m = content.match(/^([-*+])\s+/);
      if (m) {
        const prefix = (num + i) + '. ';
        ta.value = ta.value.slice(0, l.start) + prefix + content.slice(m[0].length) + ta.value.slice(l.end);
      }
    }
  } else if (allOrdered) {
    // 全部去掉有序前缀（取消列表）
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      const content = ta.value.slice(l.start, l.end);
      const m = content.match(/^(\d+)\.\s+/);
      if (m) {
        ta.value = ta.value.slice(0, l.start) + content.slice(m[0].length) + ta.value.slice(l.end);
      }
    }
  } else {
    // 全部加上有序前缀（从下往上）
    let baseNum = 1;
    if (firstLineStart > 0) {
      const prevLineStart = ta.value.lastIndexOf('\n', firstLineStart - 2) + 1;
      const prevLine = ta.value.slice(prevLineStart, firstLineStart - 1);
      const prevNum = prevLine.match(/^(\d+)\.\s+/);
      if (prevNum) baseNum = parseInt(prevNum[1], 10) + 1;
    }
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      const content = ta.value.slice(l.start, l.end);
      const prefix = (baseNum + i) + '. ';
      ta.value = ta.value.slice(0, l.start) + prefix + content + ta.value.slice(l.end);
    }
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
  // 检查选中内容本身是否已被包裹 (选中了标记+文字, 如 **text**)
  if (selected.startsWith(prefix) && selected.endsWith(suffix) && selected.length > prefix.length + suffix.length) {
    const inner = selected.slice(prefix.length, -suffix.length);
    ta.value = before + inner + after;
    ta.setSelectionRange(start, start + inner.length);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  // 检查上下文是否已包裹 (标记在选区外面, 和 wrapAnnotation 一样的逻辑)
  if (before.endsWith(prefix) && after.startsWith(suffix)) {
    ta.value = before.slice(0, -prefix.length) + selected + after.slice(suffix.length);
    ta.setSelectionRange(start - prefix.length, start - prefix.length + selected.length);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  // 包裹选中文本
  ta.value = before + prefix + selected + suffix + after;
  ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}
function toggleBold() { toggleInline('**', '**'); }
function toggleItalic() { toggleInline('*', '*'); }
function toggleStrikethrough() { toggleInline('~~', '~~'); }

// 切换引用: 行首有 > 则去掉, 无则加上（支持多行）
function toggleQuote() {
  const ta = contentInput.value;
  if (!ta) return;
  ta.focus();
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const value = store.editContent;
  const firstLineStart = value.lastIndexOf('\n', start - 1) + 1;
  const actualEnd = start === end ? start : end;
  const lastNl = value.indexOf('\n', actualEnd);
  const lastLineEnd = lastNl === -1 ? value.length : lastNl;

  // 收集所有受影响的行
  const lines = [];
  let pos = firstLineStart;
  while (pos <= lastLineEnd) {
    const nextNl = value.indexOf('\n', pos);
    if (nextNl === -1 || nextNl > lastLineEnd) {
      if (lastLineEnd > pos) lines.push({ start: pos, end: lastLineEnd });
      break;
    }
    if (nextNl > pos) lines.push({ start: pos, end: nextNl });
    pos = nextNl + 1;
  }
  if (lines.length === 0) return;

  const allHavePrefix = lines.every(l => value.slice(l.start, l.end).startsWith('> '));
  let newContent = value;
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    const content = newContent.slice(l.start, l.end);
    if (allHavePrefix) {
      newContent = newContent.slice(0, l.start) + content.replace(/^> /, '') + newContent.slice(l.end);
    } else {
      newContent = newContent.slice(0, l.start) + '> ' + content + newContent.slice(l.end);
    }
  }

  // 手动记录撤销历史
  if (historyReady && value !== historyPrevContent) {
    const entry = { content: historyPrevContent, cursor: start };
    historyUndo.push(entry);
    if (historyUndo.length > 100) historyUndo.shift();
    historyRedo.length = 0;
  }
  historyPrevContent = newContent;
  historyLastTime = Date.now();

  store.editContent = newContent;

  // Vue 渲染后恢复光标
  nextTick(() => {
    const delta = allHavePrefix ? -2 : 2;
    ta.setSelectionRange(
      Math.max(0, start + delta),
      Math.max(0, end + delta)
    );
  });
}

// 切换行内代码: 有 ` 则去掉, 无则加上（上下文感知, 和粗体/斜体一样）
function toggleInlineCode() {
  const ta = contentInput.value;
  if (!ta) return;
  ta.focus();
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const before = ta.value.slice(0, start);
  const selected = ta.value.slice(start, end);
  const after = ta.value.slice(end);

  if (start === end) {
    ta.value = before + '``' + after;
    ta.setSelectionRange(start + 1, start + 1);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  // 选中了标记+文字: ``code`` 或 `code`
  if (selected.startsWith('`') && selected.endsWith('`') && selected.length > 2) {
    const inner = selected.slice(1, -1);
    ta.value = before + inner + after;
    ta.setSelectionRange(start, start + inner.length);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  // 上下文已包裹: `code` 选中了中间的 code
  if (before.endsWith('`') && after.startsWith('`')) {
    ta.value = before.slice(0, -1) + selected + after.slice(1);
    ta.setSelectionRange(start - 1, start - 1 + selected.length);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  // 包裹
  ta.value = before + '`' + selected + '`' + after;
  ta.setSelectionRange(start + 1, start + 1 + selected.length);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

// 切换代码块: 有 ``` 环绕则去掉, 无则加上
function toggleCodeBlock() {
  const ta = contentInput.value;
  if (!ta) return;
  ta.focus();
  const start = ta.selectionStart;
  const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
  const nlIdx = ta.value.indexOf('\n', start);
  const lineEnd = nlIdx === -1 ? ta.value.length : nlIdx;
  const currentLine = ta.value.slice(lineStart, lineEnd);

  // 检查前后行是否 ``` 包围
  const prevLineStart = lineStart > 0 ? ta.value.lastIndexOf('\n', lineStart - 2) + 1 : -1;
  const prevLine = prevLineStart >= 0 ? ta.value.slice(prevLineStart, lineStart - 1) : '';
  const nextNl = ta.value.indexOf('\n', lineEnd + 1);
  const nextLine = nextNl > 0 ? ta.value.slice(lineEnd + 1, nextNl) : '';
  const prevIsFence = prevLine.trim() === '```';
  const nextIsFence = nextLine.trim() === '```';

  if (prevIsFence && nextIsFence) {
    // 去掉上下包围的 ``` 行
    const beforeFence = prevLineStart >= 0 ? ta.value.slice(0, prevLineStart) : '';
    const afterFence = ta.value.slice(nextNl);
    ta.value = beforeFence + currentLine + afterFence;
    const newCursor = beforeFence.length;
    ta.setSelectionRange(newCursor, newCursor + currentLine.length);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  // 当前行本身就是 ``` 行 → 去掉本行
  if (/^```/.test(currentLine.trim())) {
    const before = ta.value.slice(0, lineStart);
    const after = ta.value.slice(lineEnd + 1); // 跳过换行符
    ta.value = before + after;
    ta.setSelectionRange(lineStart, lineStart);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  // 包裹为代码块
  const before = ta.value.slice(0, lineStart);
  const after = ta.value.slice(lineEnd);
  const newText = '```\n' + (currentLine || '代码') + '\n```';
  ta.value = before + newText + after;
  const cursor = lineStart + 4 + (currentLine || '代码').length;
  ta.setSelectionRange(cursor, cursor);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

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

function mdInsertImage() {
  fileInput.value?.click();
}
// ===== 批量图片上传 (粘贴 / 文件选择共用) =====
// 串行上传逐张插入: 光标位置稳定, 不会因并发 race 错位
// 任一失败不影响其他图片; 结束按成功/失败数给总提示
async function insertImages(files, labelPrefix = '图片') {
  if (!files || files.length === 0) return; // 防御: 空数组不弹 toast
  if (files.length === 1) {
    store.editorImageUploading = true;
    try {
      const url = await uploadImageFile(files[0]);
      mdInsert(`![`, `](${url})`, labelPrefix);
    } catch (err) {
      store.showToast('图片上传失败: ' + err.message, 'error');
    } finally {
      store.editorImageUploading = false;
    }
    return;
  }

  store.editorImageUploading = true;
  store.showToast(`开始上传 ${files.length} 张图片...`, 'success');
  let ok = 0;
  const failed = [];
  try {
    for (let i = 0; i < files.length; i++) {
      try {
        const url = await uploadImageFile(files[i]);
        mdInsert(`![`, `](${url})`, `${labelPrefix}${i + 1}`);
        ok++;
      } catch (err) {
        failed.push({ index: i, msg: err.message || '上传失败' });
      }
    }
  } finally {
    store.editorImageUploading = false;
  }
  if (failed.length === 0) {
    store.showToast(`已插入 ${ok} 张图片`, 'success');
  } else {
    const failedList = failed.map(f => `#${f.index + 1}: ${f.msg}`).join('; ');
    store.showToast(`已插入 ${ok} 张, ${failed.length} 张失败 (${failedList})`, 'error');
  }
}

async function onFileSelected(e) {
  const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
  e.target.value = ''; // 重置以允许同文件再选
  if (files.length === 0) return;
  await insertImages(files, '图片');
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

// 间隔重复: 到期笔记在 NoteList 中高亮, 无需自测卡

// ===== 粘贴处理 =====
// 一次粘贴多张图片: 收集剪贴板所有 image 文件, 逐张上传并以 markdown 形式插入
// 上传中显示总进度 toast; 任一失败回滚不影响其他图片插入
async function handlePaste(e) {
  if (store.editMode !== 'markdown') return;
  const items = e.clipboardData?.items;
  if (!items) return;
  // 收集所有图片文件 (dataTransfer.files 是另一份来源, 有些浏览器只走其中之一)
  const files = [];
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const f = item.getAsFile();
      if (f) files.push(f);
    }
  }
  if (files.length === 0 && e.clipboardData?.files) {
    for (const f of e.clipboardData.files) {
      if (f.type && f.type.startsWith('image/')) files.push(f);
    }
  }
  if (files.length === 0) return;
  // 阻止默认: 否则浏览器会把图片以 base64/文件名形式再插一次
  e.preventDefault();
  // 收集完交给公共批量上传逻辑, 与文件选择走同一条路径
  await insertImages(files, '粘贴图片');
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

// 预览区点击: 链接 / 图片放大
function handlePreviewClick(e) {
  // 点击图片本身或放大按钮 → 全屏
  const img = e.target.closest('.img-wrapper img, .img-zoom-btn');
  if (img) {
    const src = img.dataset.imgSrc || img.getAttribute('src');
    if (src) {
      const allImages = extractImageUrls(store.editContent || '');
      const idx = allImages.indexOf(src);
      fullscreenImages.value = allImages;
      fullscreenIndex.value = idx >= 0 ? idx : 0;
    }
    return;
  }

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

// 全局快捷键:
//   Ctrl/Cmd+Alt+M/P 切模式
//   Alt+左方向键      回到上一条笔记 (栈非空时)
//   Alt+右方向键      前进 / 反撤回 (前进栈非空时)
function onKeydown(e) {
  if (!isAlive || !store.editingNote) return;
  // Alt+左 = 回到上一条
  if (e.altKey && e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) {
    if (store.noteHistory.length > 0) {
      e.preventDefault();
      goBackToPrev();
    }
    return;
  }
  // Alt+右 = 反撤回 (前进)
  if (e.altKey && e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
    if (store.noteForward.length > 0) {
      e.preventDefault();
      goForwardToNext();
    }
    return;
  }
  if (!(e.ctrlKey || e.metaKey) || !e.altKey) return;
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
/* 触摸设备: 28px 按钮手指难命中, 加大到 ~38px (工具栏 flex-wrap 会自动换行) */
@media (hover: none) {
  .md-tool {
    min-width: 38px;
    height: 34px;
    padding: 0 8px;
    font-size: 14px;
  }
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
  /* min-width: 0: 防止内容(长代码行/长URL)把编辑框撑出屏幕 */
  min-width: 0;
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
  min-width: 0;
  background: var(--bg-input, var(--bg-panel-2));
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 12px 16px;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.75;
  overflow-x: auto;
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
  display: block;
}
.md-preview :deep(.img-wrapper) {
  position: relative;
  display: inline-block;
  max-width: 100%;
  min-width: 60px;
  min-height: 60px;
  vertical-align: top;
}
/* 图片本身点击也可放大 */
.md-preview :deep(.img-wrapper img) {
  cursor: zoom-in;
}
.md-preview :deep(.img-wrapper:hover .img-zoom-btn) {
  opacity: 1;
  background: rgba(0,0,0,0.7);
}
.md-preview :deep(.img-zoom-btn) {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(0,0,0,0.5);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.2s, background 0.2s, transform 0.15s;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1;
}
.md-preview :deep(.img-zoom-btn:hover) {
  opacity: 1;
  background: rgba(0,0,0,0.75);
  transform: scale(1.1);
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
/* 平板竖屏时编辑器很窄 (721px 屏只剩 ~260px), 双栏并排不可用, 折叠为单列 */
@media (max-width: 1024px) {
  .md-pane.with-preview { flex-direction: column; }
  .md-pane.with-preview .md-editor,
  .md-pane.with-preview .md-preview {
    flex: 1 1 auto;
    /* 明确全宽 + 允许收缩: 编辑/预览框撑满容器, 不被长内容撑出屏幕 */
    min-width: 0;
    width: 100%;
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
  min-width: 0;
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

/* ===== Image Fullscreen Overlay ===== */
.img-fullscreen-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
  animation: fadeIn 0.2s ease;
}
.img-fullscreen-overlay .img-fullscreen-content {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.5);
  cursor: default;
}
.img-fullscreen-overlay .img-fullscreen-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.img-fullscreen-overlay .img-fullscreen-close:hover {
  background: rgba(255,255,255,0.3);
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ===== Fullscreen Navigation ===== */
.img-fullscreen-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(0,0,0,0.55);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.15s, border-color 0.2s;
  z-index: 10;
  box-shadow: 0 2px 12px rgba(0,0,0,0.3);
}
.img-fullscreen-nav:hover {
  background: rgba(255,255,255,0.2);
  border-color: rgba(255,255,255,0.5);
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}
.img-fullscreen-nav-prev {
  left: 24px;
}
.img-fullscreen-nav-next {
  right: 24px;
}
/* 移动端: 左右 48px 的大按钮会遮挡图片, 隐藏改用左右滑动切换 */
@media (max-width: 1024px) {
  .img-fullscreen-nav {
    display: none;
  }
  /* 切换图片时淡入, 提示滑动已生效 */
  .img-fullscreen-overlay .img-fullscreen-content {
    animation: fadeIn 0.18s ease;
  }
}

/* 手机: 编辑器工具栏的下拉浮层锚在右侧按钮上, 窄屏会向左溢出屏幕;
   改为屏幕居中弹层, 超长可滚动 (平板 721-1024px 空间足够, 保持下拉) */
@media (max-width: 720px) {
  .plan-picker,
  .cat-picker {
    position: fixed;
    left: 12px;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    min-width: 0;
    max-height: calc(100vh - 48px);
    overflow-y: auto;
  }
}
.img-fullscreen-counter {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255,255,255,0.6);
  font-size: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  background: rgba(0,0,0,0.4);
  padding: 4px 14px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  user-select: none;
}

        /* ===== 标记已复习按钮 ===== */
        .review-mark-btn {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 3px 8px;
          font-size: 11px;
          font-weight: 600;
          border-radius: 6px;
          border: 1px solid var(--color-accent);
          color: var(--color-accent);
          background: transparent;
          cursor: pointer;
          transition: all .15s;
          white-space: nowrap;
        }
        .review-mark-btn:hover {
          background: var(--color-accent);
          color: #fff;
        }
        .review-mark-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ===== 计划甘特表: 右下角按钮 ===== */
        .plan-footer-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 22px; height: 22px; padding: 0;
          border-radius: 4px; border: 1px solid transparent;
          background: transparent; cursor: pointer;
          font-size: 13px; line-height: 1;
          transition: all .12s;
        }
        .plan-footer-btn:hover {
          border-color: var(--border-default);
          background: var(--bg-hover);
        }
        .plan-footer-btn.active {
          border-color: var(--color-accent);
          background: var(--color-accent-subtle,rgba(91,110,245,0.12));
        }
        /* ===== 计划甘特表: 浮层控件 ===== */
        .plan-progress-slider {
          flex: 1;
          height: 4px;
          -webkit-appearance: none;
          appearance: none;
          border-radius: 4px;
          background: var(--border-default);
          outline: none;
          cursor: pointer;
        }
        .plan-progress-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--color-accent);
          border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          cursor: pointer;
        }
        .plan-progress-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--color-accent);
          border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          cursor: pointer;
        }
        .plan-color-swatch {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          transition: all .12s;
          background: var(--bg-hover);
        }
        .plan-color-swatch:hover { transform: scale(1.15); }
        .plan-color-swatch.active { border-color: var(--text-primary); box-shadow: 0 0 0 1px #fff; }
        .plan-color-swatch.none { font-size: 10px; }
</style>
