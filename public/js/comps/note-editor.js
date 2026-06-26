// NoteEditor - 笔记编辑器
// 支持两种模式: 富文本 (contenteditable) + Markdown (textarea + 实时预览)
// 工具栏: 一键插入语法, 模式切换, 图片上传/粘贴
const NoteEditor = {
  template: `
    <section class="flex flex-col h-full"
      :class="{ 'editor-fullscreen': store.isCompact }"
      :style="panelStyle"
      role="region"
      aria-label="笔记编辑器">

      <!-- 顶部工具栏 -->
      <header class="flex items-center justify-between px-4 sm:px-6 py-3 flex-shrink-0 gap-2 flex-wrap"
        style="border-bottom: 1px solid var(--border-default); background: var(--bg-panel);">

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
              :aria-selected="store.editMode === 'rich'"
              :class="['mode-tab', { active: store.editMode === 'rich' }]"
              @click="switchMode('rich')"
              title="所见即所得 (Ctrl+Alt+R)">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              富文本
            </button>
            <button
              role="tab"
              :aria-selected="store.editMode === 'markdown'"
              :class="['mode-tab', { active: store.editMode === 'markdown' }]"
              @click="switchMode('markdown')"
              title="Markdown 编辑 (Ctrl+Alt+M)">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
              </svg>
              Markdown
            </button>
          </div>
        </div>

        <!-- 右侧: 置顶 / 删除 -->
        <div class="flex items-center gap-1">
          <button class="btn btn-icon-sm btn-ghost"
            :class="{ 'is-active': store.editingNote && store.editingNote.is_pinned }"
            @click="store.togglePin()"
            :title="store.editingNote && store.editingNote.is_pinned ? '取消置顶' : '置顶'"
            :aria-pressed="store.editingNote && !!store.editingNote.is_pinned"
            aria-label="切换置顶">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"
              :style="{ color: store.editingNote && store.editingNote.is_pinned ? 'var(--color-accent)' : 'currentColor' }">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
            </svg>
          </button>
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
            <span class="text-xs font-medium ml-1 hidden sm:inline">删除</span>
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

        <!-- 分类标签选择 -->
        <div class="px-4 sm:px-6 pb-3 flex items-center gap-2 flex-wrap">
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

        <!-- 格式工具栏 (Markdown 模式显示更全) -->
        <div v-if="store.editMode === 'markdown'"
          class="px-4 sm:px-6 pb-2 flex items-center gap-1 flex-wrap"
          style="border-top: 1px dashed var(--border-subtle); padding-top: 8px;">
          <div class="md-toolbar-group">
            <button @click="toggleHeading(1)" class="md-tool" title="一级标题 (点 H1 切到 H2, 反复点可清除)">H1</button>
            <button @click="toggleHeading(2)" class="md-tool" title="二级标题">H2</button>
            <button @click="toggleHeading(3)" class="md-tool" title="三级标题">H3</button>
          </div>
          <div class="md-toolbar-divider"></div>
          <div class="md-toolbar-group">
            <button @click="mdWrap('**', '**', '粗体')" class="md-tool" title="粗体 (Ctrl+B)">
              <strong>B</strong>
            </button>
            <button @click="mdWrap('*', '*', '斜体')" class="md-tool" title="斜体 (Ctrl+I)">
              <em>I</em>
            </button>
            <button @click="mdWrap('~~', '~~', '删除线')" class="md-tool" title="删除线">
              <s>S</s>
            </button>
          </div>
          <div class="md-toolbar-divider"></div>
          <div class="md-toolbar-group">
            <button @click="mdInsertLine('- ', '', '列表项')" class="md-tool" title="无序列表">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <button @click="mdInsertLine('1. ', '', '列表项')" class="md-tool" title="有序列表">
              <span class="text-[10px] font-bold">1.</span>
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
            <button @click="mdInsertLink()" class="md-tool" title="链接 (Ctrl+K)">
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
        </div>

        <!-- 富文本模式工具栏 (精简) -->
        <div v-else
          class="px-4 sm:px-6 pb-2 flex items-center gap-1 flex-wrap"
          style="border-top: 1px dashed var(--border-subtle); padding-top: 8px;">
          <div class="md-toolbar-group">
            <button @click="execCmd('bold')" class="md-tool" title="粗体 (Ctrl+B)"><strong>B</strong></button>
            <button @click="execCmd('italic')" class="md-tool" title="斜体 (Ctrl+I)"><em>I</em></button>
            <button @click="execCmd('underline')" class="md-tool" title="下划线 (Ctrl+U)"><u>U</u></button>
            <button @click="execCmd('strikeThrough')" class="md-tool" title="删除线"><s>S</s></button>
          </div>
          <div class="md-toolbar-divider"></div>
          <div class="md-toolbar-group">
            <button @click="execCmd('insertUnorderedList')" class="md-tool" title="无序列表">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <button @click="execCmd('insertOrderedList')" class="md-tool" title="有序列表">
              <span class="text-[10px] font-bold">1.</span>
            </button>
            <button @click="execCmd('formatBlock', 'blockquote')" class="md-tool" title="引用">
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z"/>
              </svg>
            </button>
          </div>
          <div class="md-toolbar-divider"></div>
          <div class="md-toolbar-group">
            <button @click="execCmd('createLink', prompt('链接地址:', 'https://') || '')" class="md-tool" title="插入链接">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"/>
              </svg>
            </button>
            <button @click="richInsertImage()" class="md-tool" title="插入图片" :disabled="store.editorImageUploading">
              <svg v-if="!store.editorImageUploading" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <svg v-else class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke-width="3" stroke-opacity="0.25"/>
                <path d="M12 2a10 10 0 0110 10" stroke-width="3" stroke-linecap="round"/>
              </svg>
            </button>
            <input ref="fileInputRich" type="file" accept="image/*" class="hidden" @change="onFileSelectedRich" />
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
              @keydown="handleMarkdownKeydown"
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

          <!-- 富文本模式: contenteditable -->
          <div v-else
            ref="richInput"
            class="rich-editor"
            contenteditable="true"
            @input="onRichInput"
            @paste="handleRichPaste"
            @keydown="handleRichKeydown"
            spellcheck="false"
            :data-placeholder="store.editorImageUploading ? '图片上传中...' : '开始记录你的想法...'"
            :aria-label="'富文本正文'"></div>
        </div>
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
  `,
  setup() {
    const titleInput = Vue.ref(null);
    const contentInput = Vue.ref(null);
    const richInput = Vue.ref(null);
    const fileInput = Vue.ref(null);
    const fileInputRich = Vue.ref(null);

    // markdown-it 实例
    const md = Vue.ref(null);
    if (typeof window.markdownit === 'function') {
      md.value = window.markdownit({
        html: true,
        linkify: true,
        typographer: true,
        breaks: true
      });
    }

    const panelStyle = Vue.computed(() => {
      if (store.isDesktop) {
        return { flex: '1', background: 'var(--bg-panel)', minWidth: '0' };
      }
      return { background: 'var(--bg-panel)' };
    });

    // 实时渲染 Markdown 预览 (安全包裹 try-catch)
    const renderedPreview = Vue.computed(() => {
      try {
        const src = store.editContent || '';
        if (!md.value) return '';
        return md.value.render(src);
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

    // ===== 模式切换 =====
    function switchMode(target) {
      if (store.editMode === target) return;
      if (!isAlive) return;
      // 切换前同步当前模式的数据到 store
      if (store.editMode === 'rich' && richInput.value) {
        store.editContent = richInput.value.innerHTML || '';
      }
      store.setEditMode(target);
      Vue.nextTick(() => {
        if (!isAlive) return;
        if (target === 'rich' && richInput.value) {
          richInput.value.innerHTML = store.editContent || '';
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
    // 行为:
    //   1. 找光标所在行
    //   2. 如果行首已有 # / ## / ### 等前缀, 删掉
    //   3. 在行首插入新前缀 (level 个 # + 空格)
    //   4. 如果行原本就是这个级别, 移除前缀 (toggle 关闭)
    //   5. 光标定位到行尾
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
    // Vue 3 模板编译器对 &lt;/&gt; + 反引号 + \n 组合敏感,
    // 把按钮文本挪到 setup 里用 {{ }} 表达式输出更稳
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

    // ===== 富文本模式操作 =====

    function execCmd(cmd, value) {
      richInput.value?.focus();
      // execCommand 已废弃但仍广泛支持
      document.execCommand(cmd, false, value);
      // 同步内容
      if (richInput.value) store.editContent = richInput.value.innerHTML;
    }

    function richInsertImage() {
      fileInputRich.value?.click();
    }
    async function onFileSelectedRich(e) {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      store.editorImageUploading = true;
      try {
        const url = await uploadImageFile(file);
        execCmd('insertImage', url);
      } catch (err) {
        store.showToast('图片上传失败: ' + err.message, 'error');
      } finally {
        store.editorImageUploading = false;
      }
    }

    function onRichInput() {
      if (richInput.value) store.editContent = richInput.value.innerHTML;
    }

    // ===== 粘贴处理 =====
    // Markdown 模式: 如果剪贴板有图片,自动上传并插入
    // 富文本模式: 保留默认行为 + 图片上传
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

    async function handleRichPaste(e) {
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
            execCmd('insertImage', url);
          } catch (err) {
            store.showToast('粘贴图片失败: ' + err.message, 'error');
          } finally {
            store.editorImageUploading = false;
          }
          return;
        }
      }
      // 普通文本粘贴让浏览器处理,粘贴后同步内容
      Vue.nextTick(() => {
        if (richInput.value) store.editContent = richInput.value.innerHTML;
      });
    }

    function handleRichKeydown(e) {
      // Ctrl/Cmd+B/I/U 走原生 execCommand
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'b') { e.preventDefault(); execCmd('bold'); }
      else if (k === 'i') { e.preventDefault(); execCmd('italic'); }
      else if (k === 'u') { e.preventDefault(); execCmd('underline'); }
    }

    // ===== Markdown 快捷语法 (行首 + 空格触发) =====
    function handleMarkdownKeydown(e) {
      if (!store.markdownAssistEnabled) return;
      if (e.key !== ' ') return;
      if (store.editMode !== 'markdown') return;

      const ta = e.target;
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
      if (a && a.href) {
        e.preventDefault();
        window.open(a.href, '_blank', 'noopener');
      }
    }

    // 组件存活标记, 防止卸载后回调中的副作用
    let isAlive = true;

    // ===== 切换 note / mode 时同步 UI 状态 =====
    // 注意: 这里直接 watch store.editingNote (不包 Vue.computed),
    // 避免 immediate:true 在 setup 阶段触发的 effect scheduler 错误
    const stopWatchNote = Vue.watch(
      () => store.editingNote,
      (note) => {
        if (!note || !isAlive) return;
        Vue.nextTick(() => {
          if (!isAlive) return;
          if (richInput.value) {
            if (store.editMode === 'rich') {
              richInput.value.innerHTML = store.editContent || '';
            }
          }
          if (!note.title || note.title === '新笔记') {
            titleInput.value?.focus();
            titleInput.value?.select();
          }
        });
      }
      // 不加 immediate: 组件挂载时 store.editingNote 已就绪, 首次同步由 openNote 完成后 nextTick 完成
    );

    // 监听 editMode 变化: 切换时同步 DOM
    const stopWatchMode = Vue.watch(() => store.editMode, (mode) => {
      if (!isAlive) return;
      Vue.nextTick(() => {
        if (!isAlive) return;
        if (mode === 'rich' && richInput.value) {
          richInput.value.innerHTML = store.editContent || '';
        }
      });
    });

    Vue.onBeforeUnmount(() => {
      isAlive = false;
      stopWatchNote();
      stopWatchMode();
      document.removeEventListener('keydown', onKeydown);
    });

    // 全局快捷键: Ctrl+Alt+R/M 切模式
    function onKeydown(e) {
      if (!(e.ctrlKey || e.metaKey) || !e.altKey) return;
      if (!isAlive || !store.editingNote) return;
      const k = e.key.toLowerCase();
      if (k === 'r') { e.preventDefault(); switchMode('rich'); }
      else if (k === 'm') { e.preventDefault(); switchMode('markdown'); }
    }
    document.addEventListener('keydown', onKeydown);

    return {
      store,
      panelStyle,
      catStyle,
      switchMode,
      renderedPreview,
      mdInsert,
      mdInsertLine,
      toggleHeading,
      mdWrap,
      mdInsertLink,
      mdInsertImage,
      onFileSelected,
      execCmd,
      richInsertImage,
      onFileSelectedRich,
      onRichInput,
      handlePaste,
      handleRichPaste,
      handleRichKeydown,
      handleMarkdownKeydown,
      handlePreviewClick,
      insertInlineCode,
      insertCodeBlock,
      inlineCodeLabel,
      codeBlockLabel,
      titleInput,
      contentInput,
      richInput,
      fileInput,
      fileInputRich
    };
  }
};

// scoped-style
(function () {
  const style = document.createElement('style');
  style.textContent = `
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
    .md-tool-toggle {
      gap: 4px;
      padding: 0 10px;
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
    .md-preview h1, .md-preview h2, .md-preview h3, .md-preview h4, .md-preview h5, .md-preview h6 {
      margin: 16px 0 8px;
      font-weight: 700;
      line-height: 1.3;
      color: var(--text-primary);
    }
    .md-preview h1 { font-size: 22px; border-bottom: 1px solid var(--border-default); padding-bottom: 6px; }
    .md-preview h2 { font-size: 19px; }
    .md-preview h3 { font-size: 17px; }
    .md-preview h4 { font-size: 15px; }
    .md-preview p { margin: 8px 0; }
    .md-preview a { color: var(--color-accent); text-decoration: none; }
    .md-preview a:hover { text-decoration: underline; }
    .md-preview ul, .md-preview ol { margin: 8px 0; padding-left: 24px; }
    .md-preview li { margin: 4px 0; }
    .md-preview blockquote {
      margin: 8px 0;
      padding: 6px 12px;
      border-left: 3px solid var(--color-accent);
      background: var(--color-accent-subtle, rgba(91,141,239,0.08));
      color: var(--text-secondary);
      border-radius: 0 4px 4px 0;
    }
    .md-preview code {
      background: var(--bg-panel);
      padding: 1px 6px;
      border-radius: 3px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12.5px;
      color: var(--color-accent);
    }
    .md-preview pre {
      background: var(--bg-panel);
      padding: 12px 14px;
      border-radius: 6px;
      overflow-x: auto;
    }
    .md-preview pre code {
      background: transparent;
      padding: 0;
      color: var(--text-primary);
    }
    .md-preview img {
      max-width: 100%;
      border-radius: 6px;
      margin: 8px 0;
    }
    .md-preview hr {
      border: none;
      border-top: 1px solid var(--border-default);
      margin: 16px 0;
    }
    .md-preview table {
      border-collapse: collapse;
      margin: 8px 0;
    }
    .md-preview table th, .md-preview table td {
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

    /* ===== Rich Editor (contenteditable) ===== */
    .rich-editor {
      background: var(--bg-input, var(--bg-panel-2));
      border: 1px solid var(--border-default);
      border-radius: 8px;
      padding: 14px 16px;
      color: var(--text-primary);
      font-size: 14.5px;
      line-height: 1.75;
      min-height: 50vh;
      outline: none;
      transition: border-color 0.15s;
    }
    .rich-editor:focus {
      border-color: var(--color-accent);
    }
    .rich-editor:empty::before {
      content: attr(data-placeholder);
      color: var(--text-tertiary);
      pointer-events: none;
    }
    .rich-editor h1, .rich-editor h2, .rich-editor h3 {
      margin: 14px 0 8px;
      font-weight: 700;
    }
    .rich-editor h1 { font-size: 22px; }
    .rich-editor h2 { font-size: 19px; }
    .rich-editor h3 { font-size: 17px; }
    .rich-editor p { margin: 6px 0; }
    .rich-editor ul, .rich-editor ol { margin: 6px 0; padding-left: 24px; }
    .rich-editor blockquote {
      margin: 8px 0;
      padding: 6px 12px;
      border-left: 3px solid var(--color-accent);
      background: var(--color-accent-subtle, rgba(91,141,239,0.08));
    }
    .rich-editor img {
      max-width: 100%;
      border-radius: 6px;
      margin: 6px 0;
    }
    .rich-editor a { color: var(--color-accent); }

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
  `;
  document.head.appendChild(style);
})();
