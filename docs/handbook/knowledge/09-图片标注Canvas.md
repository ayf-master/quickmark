# 09 · 图片标注（Canvas 2D）

> 目标：看懂 `ImageAnnotator.vue` 怎么用原生 Canvas 2D 做「画笔 + 文字」标注，并把结果导出回写笔记。

## 9.1 为什么用 Canvas 而不是 SVG

标注是「在已有图片上画画」。Canvas 2D 直接像素绘制、导出 PNG 简单（`toBlob`），适合自由笔迹；SVG 适合矢量交互但不便「导出带笔迹的位图」。本项目选 Canvas。

组件用 `Teleport to="body"` 挂到 body 末尾，`z-index:10000`，盖在图片预览浮层（`9999`）之上——形成双层浮层，Esc 关闭时**先退标注层、不穿透关掉预览层**（`@keydown.escape.stop`）。

## 9.2 坐标缩放：显示尺寸 ≠ 画布尺寸

图片在界面上被 CSS 缩放显示，但绘制要在「原始分辨率画布」上，否则导出模糊或笔迹错位。关键两步：

```js
// 1) 建立画布：限制最大边 2000，等比缩放
const natural = new Image();
natural.onload = () => {
  const scale = Math.min(1, 2000 / natural.naturalWidth);
  canvas.width  = scale * natural.naturalWidth;   // 画布内部分辨率
  canvas.height = scale * natural.naturalHeight;
};
// 2) 屏幕坐标 → 画布坐标：用 rect 比例换算
function toCanvasPt(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width  / rect.width),
    y: (e.clientY - rect.top)  * (canvas.height / rect.height)
  };
}
```

`canvas.width / rect.width` 是「内部分辨率 / 显示宽度」的比值，乘上鼠标相对偏移即得画布坐标。**这是 Canvas 标注/绘图类功能必会的换算公式**。

## 9.3 画笔与文字工具

工具状态：`pen`（5 色 × 2 线宽）与 `text`（点击插入文字输入框）。所有笔迹存进 `strokes` 响应式数组，便于撤销：

```js
const strokes = reactive([]);   // [{ type:'pen', color, width, points:[{x,y}...] }]
// 或 { type:'text', color, x, y, text }

function onPointerDown(e) {
  const p = toCanvasPt(e);
  current = { type: 'pen', color: penColor.value, width: penWidth.value, points: [p] };
  strokes.push(current);
}
function onPointerMove(e) {
  if (!current) return;
  current.points.push(toCanvasPt(e));
  redraw();                      // 每帧重绘全部 strokes
}
```

`redraw()` 遍历 `strokes` 重画——**保留完整笔画列表**，撤销只要 `strokes.pop()` 再 `redraw()`，不必逐像素擦除。

## 9.4 撤销 / 清空

```js
function undo() { strokes.pop(); redraw(); }
function clearAll() { strokes.length = 0; redraw(); }
```

因为笔迹是「数据」而非「像素」，撤销/清空都是改数据后重绘，干净可靠。

## 9.5 导出与回写

保存时把画布导出 PNG，上传到服务器得到新 URL，再**替换笔记里旧图的 URL**：

```js
function save() {
  canvas.toBlob(async (blob) => {
    const url = await uploadImageFile(blob, 'annotation.png');
    emit('save', url);            // 父组件 NoteEditor 处理替换
  }, 'image/png');
}

// NoteEditor.vue
async function onAnnotatorSave(newUrl) {
  const oldUrl = annotatorSrc.value;
  closeAnnotator();
  if (oldUrl && store.editContent && store.editContent.includes(oldUrl)) {
    store.editContent = store.editContent.split(oldUrl).join(newUrl);  // 全量替换旧 URL
    store.scheduleAutoSave();
  }
  closeFullscreen();
}
```

**为什么替换 URL 而非嵌新图？** 标注本质是「同一张图加了标记」，原地替换 URL 保持笔记结构稳定，历史引用不失效。

## 9.6 浮层关闭的 Esc 链

标注层 `@keydown.escape.stop`：在标注层按 Esc 只关标注层（`.stop` 阻止冒泡），不会连带关掉底下的图片预览。预览层自己也有 Esc 处理关整层。这就是「多层浮层谁该关谁关」的优先级控制。

## 9.7 本篇知识点小结

- 标注用 Canvas 2D，`Teleport` 到 body，`z-index` 高于预览层形成双层。
- 坐标换算 `canvas.width / rect.width` 是显示↔画布的核心公式。
- 笔迹存为「数据数组」，撤销/清空=改数据+重绘，比逐像素擦除稳。
- `toBlob` 导出 PNG → 上传 → 父组件替换旧图 URL，原地更新不破坏结构。
- `@keydown.escape.stop` 实现「先退上层、不穿透下层」。
