<template>
  <div class="review-q" v-if="!loading && !error">
    <!-- 复习统计条 -->
    <div v-if="stats" class="stats-bar">
      <div class="stat"><span class="stat-num">🔥 {{ stats.streak }}</span><span class="stat-label">连续天</span></div>
      <div class="stat"><span class="stat-num">{{ stats.dueToday }}</span><span class="stat-label">待复习</span></div>
      <div class="stat"><span class="stat-num">{{ stats.totalCards }}</span><span class="stat-label">复习卡</span></div>
      <div class="stat"><span class="stat-num">{{ stats.masteredCount }}</span><span class="stat-label">已掌握</span></div>
    </div>

    <!-- 空状态: 没有任何 [[quiz]] 笔记 -->
    <div v-if="queue.length === 0" class="empty">
      <div class="empty-emoji">📭</div>
      <p class="empty-title">今日没有复习卡片</p>
      <p class="empty-sub">
        在笔记里写 <code>[[quiz:问题|答案]]</code> 就能生成自测卡。<br>
        开关一开，旧笔记里的自测卡会自动点亮。
      </p>
    </div>

    <!-- 复习流 -->
    <div v-else class="flow">
      <div class="progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: doneRatio + '%' }"></div>
        </div>
        <span class="progress-text">已复习 {{ done }} / {{ total }}</span>
      </div>

      <Transition name="flip" mode="out-in">
        <div class="card" :key="current.cardId">
          <div class="card-meta">
            <span class="note-title">{{ current.title }}</span>
            <span class="mastery-dot" :style="{ background: masteryColor(current.mastery) }"
              :title="'掌握度 ' + (current.mastery ?? 0) + '/5'"></span>
          </div>

          <div class="q">{{ current.q }}</div>

          <Transition name="reveal">
            <div v-if="revealed" class="a">{{ current.a }}</div>
          </Transition>

          <div class="actions">
            <button v-if="!revealed" class="btn-show" @click="revealed = true">显示答案</button>
            <template v-else>
              <button class="grade again" @click="grade(0)">忘记</button>
              <button class="grade hard" @click="grade(3)">模糊</button>
              <button class="grade good" @click="grade(4)">记得</button>
              <button class="grade easy" @click="grade(5)">熟练</button>
            </template>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 全部完成 -->
    <div v-if="finished" class="done">
      <div class="empty-emoji">🎉</div>
      <p class="empty-title">今天的复习完成！</p>
      <p class="empty-sub">明天会有新的复习卡片出现。坚持就是胜利。</p>
    </div>
  </div>

  <div v-else-if="loading" class="state">加载中…</div>
  <div v-else-if="error" class="state err">{{ error }}</div>
</template>

<script setup>
import { ref, computed } from 'vue';
import API from '@/api/index.js';

// props 由 FeaturePanel 抽屉传入 (title/desc), 这里声明避免告警
defineProps({ title: String, desc: String });

const loading = ref(true);
const error = ref('');
const stats = ref(null);    // 复习统计: streak / dueToday / totalCards / masteredCount
const queue = ref([]);      // [{ cardId, noteId, title, q, a, mastery }]
const idx = ref(0);
const revealed = ref(false);
const finished = ref(false);

const total = computed(() => queue.value.length);
const done = computed(() => Math.min(idx.value, total.value));
const doneRatio = computed(() => (total.value ? Math.round((done.value / total.value) * 100) : 0));
const current = computed(() => queue.value[idx.value] || {});

function masteryColor(m) {
  // 0 红 -> 5 绿
  const v = Math.max(0, Math.min(5, m ?? 0)) / 5;
  const r = Math.round(255 * (1 - v));
  const g = Math.round(180 + 75 * v);
  return `rgb(${r},${g},90)`;
}

async function grade(quality) {
  const card = current.value;
  if (!card || card.cardId == null) return;
  try {
    await API.gradeReview(card.cardId, quality);
  } catch (e) {
    error.value = e.message || '评分失败';
    return;
  }
  // 进入下一张
  revealed.value = false;
  idx.value += 1;
  if (idx.value >= queue.value.length) finished.value = true;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    // 并行取统计 + 今日队列
    const [statsData, queueData] = await Promise.all([
      API.getReviewStats().catch(() => null),
      API.getReviewQueue()
    ]);
    stats.value = statsData;
    let data = queueData;
    // 今日为空时, 先扫描注册旧笔记里的 [[quiz]], 再取一次
    if (!data.today || data.today.length === 0) {
      await API.enrollReview();
      data = await API.getReviewQueue();
    }
    queue.value = (data.today || []).map(c => ({
      cardId: c.cardId,
      noteId: c.noteId,
      title: c.title || '未命名笔记',
      q: c.q,
      a: c.a,
      mastery: c.mastery ?? 0
    }));
    idx.value = 0;
    revealed.value = false;
    finished.value = queue.value.length === 0;
  } catch (e) {
    error.value = e.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

load();
</script>

<style scoped>
.review-q { padding: 4px 2px; }
.stats-bar { display: flex; gap: 6px; margin-bottom: 16px; }
.stat { flex: 1; background: var(--bg-panel); border: 1px solid var(--border-default); border-radius: 10px; padding: 8px 6px; text-align: center; }
.stat-num { display: block; font-size: 16px; font-weight: 700; color: var(--text-primary); }
.stat-label { font-size: 11px; color: var(--text-tertiary); }
.empty, .done { text-align: center; padding: 32px 12px; }
.empty-emoji { font-size: 40px; margin-bottom: 8px; }
.empty-title { font-weight: 600; color: var(--text-primary); margin: 0 0 6px; }
.empty-sub { font-size: 13px; color: var(--text-tertiary); line-height: 1.6; margin: 0; }
code { background: var(--bg-panel); padding: 1px 5px; border-radius: 4px; color: var(--color-accent); }

.progress { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.progress-bar { flex: 1; height: 6px; border-radius: 999px; background: var(--bg-panel); overflow: hidden; }
.progress-fill { height: 100%; background: var(--color-accent); transition: width .3s; }
.progress-text { font-size: 12px; color: var(--text-tertiary); white-space: nowrap; }

.card { background: var(--bg-panel); border: 1px solid var(--border-default); border-radius: 12px; padding: 16px; }
.card-meta { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.note-title { font-size: 12px; color: var(--text-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80%; }
.mastery-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.q { font-size: 16px; font-weight: 600; color: var(--text-primary); line-height: 1.5; min-height: 48px; }
.a { margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border-default); font-size: 15px; color: var(--text-secondary); line-height: 1.6; }

.actions { margin-top: 16px; }
.btn-show { width: 100%; padding: 10px; border: none; border-radius: 8px; background: var(--color-accent); color: #fff; font-weight: 600; cursor: pointer; }
.grade { flex: 1; padding: 9px 4px; border: none; border-radius: 8px; color: #fff; font-weight: 600; cursor: pointer; font-size: 13px; }
.actions { display: flex; gap: 8px; }
.grade.again { background: #ef4444; }
.grade.hard { background: #f59e0b; }
.grade.good { background: #10b981; }
.grade.easy { background: #3b82f6; }

.state { text-align: center; padding: 32px; color: var(--text-tertiary); }
.state.err { color: #ef4444; }

.flip-enter-active, .flip-leave-active { transition: opacity .2s, transform .2s; }
.flip-enter-from { opacity: 0; transform: translateY(8px); }
.flip-leave-to { opacity: 0; transform: translateY(-8px); }
.reveal-enter-active { transition: opacity .25s; }
.reveal-enter-from { opacity: 0; }
</style>
