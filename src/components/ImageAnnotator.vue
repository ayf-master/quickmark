<template>
  <Teleport to="body">
    <div v-if="visible" class="annotator-overlay" @keydown.escape="cancel" tabindex="0" ref="overlayRef">
      <!-- 工具栏 -->
      <div class="anno-toolbar">
        <div class="anno-group">
          <button class="anno-btn" :class="{ active: mode === 'pen' }" @click="mode = 'pen'" title="画笔涂改">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>
          </button>
          <button class="anno-btn anno-text-btn" :class="{ active: mode === 'text' }" @click="mode = 'text'" title="打字标注">
            T
          </button>
        </div>
        <div class="anno-group">
          <button v-for="c in COLORS" :key="c" class="anno-color" :class="{ active: color === c }"
            :style="{ background: c }" @click="color = c" :title="c"></button>
        </div>
        <div class="anno-group">
          <button class="anno-btn" :class="{ active: lineWidth === PEN_THIN }" @click="lineWidth = PEN_THIN" title="细笔">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 20h16"/><path d="M6 16L18 4"/></svg>
          </button>
          <button class="anno-btn" :class="{ active: lineWidth === PEN_THICK }" @click="lineWidth = PEN_THICK" title="粗笔">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M4 20h16"/><path d="M6 16L18 4"/></svg>
          </button>
        </div>
        <div class="anno-group">
          <button class="anno-btn" @click="undo" :disabled="strokes.length === 0" title="撤销">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg>
          </button>
          <button class="anno-btn" @click="clearAll" :disabled="strokes.length === 0" title="清空标注">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
          </button>
        </div>
        <div class="anno-group">
          <button class="anno-btn anno-save" @click="save" :disabled="saving" title="保存标注 (生成新图片替换)">
            {{ saving ? '保存中…' : '✓ 保存' }}
          </button>
          <button class="anno-btn anno-cancel" @click="cancel" title="放弃标注">✕</button>
        </div>
      </div>

      <!-- 画布区: img 底图 + canvas 标注层 (同尺寸重叠) -->
      <div class="anno-stage-wrap" @pointerdown.self="cancelText">
        <div class="anno-stage" ref="stageRef">
          <img ref="imgRef" :src="src" class="anno-img" alt="标注底图" @load="onImgLoad" draggable="false">
          <canvas ref="canvasRef" class="anno-canvas"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointerleave="onPointerUp"></canvas>
          <!-- 文字工具的内联输入框: 定位在点击处, 字号跟随显示缩放 -->
          <input v-if="textInput.visible" ref="textInputRef" v-model="textInput.value"
            class="anno-text-input"
            :style="textInputStyle"
            placeholder="输入后回车"
            @keydown.enter.prevent="confirmText"
            @keydown.esc="textInput.visible = false"
            @blur="confirmText" />
        </div>
      </div>
      <p class="anno-hint">{{ mode === 'pen' ? '按住鼠标涂改 · ' : '点击图片位置打字 · ' }}撤销可回退每一步, 保存后生成带标注的新图片</p>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue';
import { uploadImageFile } from '@/utils/content';

const props = defineProps({
  visible: { type: Boolean, default: false },
  src: { type: String, default: '' }
});
const emit = defineEmits(['close', 'save']);

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#111827'];
const PEN_THIN = 3;
const PEN_THICK = 7;
const TEXT_SIZE = 28; // 文字大小 (canvas 分辨率下的 px)

const mode = ref('pen');
const color = ref('#ef4444');
const lineWidth = ref(PEN_THIN);
const saving = ref(false);

const overlayRef = ref(null);
const stageRef = ref(null);
const imgRef = ref(null);
const canvasRef = ref(null);
const textInputRef = ref(null);

// 标注数据: 全部笔画/文字都在这个数组里, 撤销 = pop + 全量重绘
const strokes = reactive([]);
let currentStroke = null; // 正在画的笔画
let drawing = false;
let ctx = null;
let lastPt = null;

// 文字内联输入框状态
const textInput = reactive({ visible: false, value: '', x: 0, y: 0 });

const textInputStyle = computed(() => {
  const canvas = canvasRef.value;
  if (!canvas) return {};
  const rect = canvas.getBoundingClientRect();
  const scale = rect.width / canvas.width;
  return {
    left: (textInput.x * scale) + 'px',
    top: (textInput.y * scale) + 'px',
    fontSize: Math.max(12, TEXT_SIZE * scale) + 'px',
    color: textInput.color
  };
});

// ===== 画布初始化 =====

function onImgLoad() {
  const img = imgRef.value;
  const canvas = canvasRef.value;
  if (!img || !canvas) return;
  // 分辨率上限 2000px, 避免超大图导致 toBlob 巨大
  const scale = Math.min(1, 2000 / img.naturalWidth);
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  ctx = canvas.getContext('2d');
  strokes.length = 0; // 换图时清空旧标注
  redraw();
}

function redraw() {
  const canvas = canvasRef.value;
  const img = imgRef.value;
  if (!ctx || !canvas || !img) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  for (const s of strokes) {
    if (s.type === 'pen') drawPen(s);
    else if (s.type === 'text') drawText(s);
  }
}

function drawPen(s) {
  if (s.points.length < 2) return;
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(s.points[0].x, s.points[0].y);
  for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
  ctx.stroke();
}

function drawText(s) {
  ctx.fillStyle = s.color;
  ctx.font = `600 ${s.size}px sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(s.text, s.x, s.y);
}

// ===== 坐标换算: 显示坐标 → canvas 分辨率坐标 =====

function toCanvasPt(e) {
  const canvas = canvasRef.value;
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  };
}

// ===== 指针事件 (画笔 / 文字定位) =====

function onPointerDown(e) {
  if (saving.value) return;
  const pt = toCanvasPt(e);

  if (mode.value === 'text') {
    // 在点击处打开内联输入框
    textInput.visible = true;
    textInput.value = '';
    textInput.x = pt.x;
    textInput.y = pt.y - TEXT_SIZE / 2;
    textInput.color = color.value;
    nextTick(() => textInputRef.value?.focus());
    return;
  }

  drawing = true;
  currentStroke = { type: 'pen', color: color.value, width: lineWidth.value, points: [pt] };
  lastPt = pt;
  canvasRef.value.setPointerCapture?.(e.pointerId);
}

function onPointerMove(e) {
  if (!drawing || !currentStroke) return;
  const pt = toCanvasPt(e);
  // 增量画最后一段, 避免每次 move 全量重绘
  ctx.strokeStyle = currentStroke.color;
  ctx.lineWidth = currentStroke.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(lastPt.x, lastPt.y);
  ctx.lineTo(pt.x, pt.y);
  ctx.stroke();
  currentStroke.points.push(pt);
  lastPt = pt;
}

function onPointerUp() {
  if (!drawing) return;
  drawing = false;
  if (currentStroke && currentStroke.points.length > 1) strokes.push(currentStroke);
  currentStroke = null;
  lastPt = null;
}

// ===== 文字输入 =====

function confirmText() {
  if (!textInput.visible) return;
  const text = textInput.value.trim();
  textInput.visible = false;
  if (!text) return;
  strokes.push({ type: 'text', color: textInput.color, size: TEXT_SIZE, x: textInput.x, y: textInput.y, text });
  redraw();
}

function cancelText() {
  textInput.visible = false;
}

// ===== 撤销 / 清空 / 保存 =====

function undo() {
  strokes.pop();
  redraw();
}

function clearAll() {
  if (strokes.length === 0) return;
  strokes.length = 0;
  redraw();
}

async function save() {
  const canvas = canvasRef.value;
  if (!canvas || strokes.length === 0) {
    // 没有任何标注 → 直接关闭, 不生成新图
    emit('close');
    return;
  }
  saving.value = true;
  try {
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('导出失败'))), 'image/png');
    });
    const file = new File([blob], 'annotated.png', { type: 'image/png' });
    const url = await uploadImageFile(file);
    emit('save', url);
  } catch (err) {
    console.warn('标注保存失败:', err);
  } finally {
    saving.value = false;
  }
}

function cancel() {
  emit('close');
}

// Esc 关闭
function onKeydown(e) {
  if (e.key === 'Escape') cancel();
}
onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));

// 每次打开重置状态
watch(() => props.visible, (v) => {
  if (v) {
    strokes.length = 0;
    mode.value = 'pen';
    nextTick(() => overlayRef.value?.focus());
  }
});
</script>

<style scoped>
.annotator-overlay {
  position: fixed;
  inset: 0;
  z-index: 300; /* 盖在全屏图片查看器之上 */
  background: rgba(0, 0, 0, 0.88);
  display: flex;
  flex-direction: column;
  align-items: center;
  outline: none;
}
.anno-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  padding: 10px 16px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-default);
  width: 100%;
  flex-shrink: 0;
}
.anno-group {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 10px;
  border-right: 1px solid var(--border-default);
}
.anno-group:last-child { border-right: none; }
.anno-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid var(--border-default);
  background: var(--bg-panel);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 13px;
  transition: all .15s;
}
.anno-btn:hover:not(:disabled) { border-color: var(--color-primary); color: var(--color-primary); }
.anno-btn.active {
  background: var(--color-primary-subtle);
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.anno-btn:disabled { opacity: .4; cursor: not-allowed; }
.anno-text-btn { font-weight: 700; font-family: Georgia, serif; }
.anno-color {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform .15s;
}
.anno-color:hover { transform: scale(1.15); }
.anno-color.active { border-color: var(--text-primary); transform: scale(1.15); }
.anno-save {
  width: auto;
  padding: 0 12px;
  background: var(--color-success, #22c55e);
  border-color: var(--color-success, #22c55e);
  color: #fff;
  font-weight: 600;
}
.anno-save:hover:not(:disabled) { background: #16a34a; color: #fff; }
.anno-cancel:hover { border-color: var(--color-danger, #ef4444); color: var(--color-danger, #ef4444); }

.anno-stage-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 16px;
}
.anno-stage {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  line-height: 0;
}
.anno-img {
  max-width: 100%;
  max-height: 74vh;
  display: block;
  user-select: none;
  -webkit-user-drag: none;
}
.anno-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
}
.anno-text-input {
  position: absolute;
  min-width: 140px;
  background: rgba(255,255,255,.92);
  border: 2px dashed var(--color-primary);
  border-radius: 4px;
  padding: 2px 6px;
  outline: none;
  line-height: 1.4;
  font-family: sans-serif;
}
.anno-hint {
  flex-shrink: 0;
  padding: 8px 0 12px;
  font-size: 12px;
  color: rgba(255,255,255,.6);
}
</style>
