<template>
  <div v-if="!collapsed && orderedTasks.length" class="task-list">
    <div v-for="t in orderedTasks" :key="t.taskId" class="box-progress">
      <header class="progress-head">
        <span class="status-dot" :class="statusClass(t.state)" />
        <span class="layer-id" :title="t.layerId">{{
          t.layerId || "下载任务"
        }}</span>
        <span class="percent">{{ percentOf(t) }}%</span>
      </header>

      <div class="progress-track">
        <div class="progress-bar" :style="{ width: percentOf(t) + '%' }" />
      </div>

      <div class="progress-meta">
        <span>{{
          t.state === "queued"
            ? "排队中"
            : `${t.success + t.failed + t.skipped} / ${t.total}`
        }}</span>
        <span v-if="t.failed" class="fail">{{ t.failed }} 失败</span>
      </div>

      <footer class="progress-actions">
        <NButton
          v-if="!isFinished(t)"
          size="tiny"
          tertiary
          :disabled="!canPause(t)"
          @click="pause(t)"
        >
          暂停
        </NButton>
        <NButton
          v-if="!isFinished(t)"
          size="tiny"
          type="primary"
          secondary
          :disabled="!canResume(t)"
          @click="resume(t)"
        >
          继续
        </NButton>
        <NButton
          v-if="!isFinished(t)"
          size="tiny"
          type="error"
          quaternary
          @click="stop(t)"
        >
          停止
        </NButton>
        <NButton v-else size="tiny" tertiary @click="closeTask(t)">
          关闭
        </NButton>

        <span class="conc">
          <n-input-number
            v-model:value="concLocal[t.taskId]"
            :min="1"
            :max="512"
            size="tiny"
            :disabled="isFinished(t)"
            @update:value="(v) => onConcurrency(t, v)"
          >
            <template #prefix>并发</template>
          </n-input-number>
        </span>
      </footer>
    </div>

    <div v-if="hasFinished" class="task-list-footer">
      <NButton size="tiny" quaternary @click="clearFinished">
        清除已完成
      </NButton>
      <NButton size="tiny" quaternary @click="collapsed = true"> 收起 </NButton>
    </div>
  </div>

  <!-- 收起后保留入口，点击展开回看所有任务 -->
  <NButton
    v-else-if="orderedTasks.length"
    class="box-progress-entry"
    size="tiny"
    secondary
    @click="collapsed = false"
  >
    任务 ({{ orderedTasks.length }})
  </NButton>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import type {
  DownloadProgress,
  ProgressState,
  TaskSummary,
} from "../utils/downloadTypes";
import {
  onDownloadProgress,
  pauseDownload,
  resumeDownload,
  stopDownload,
  setConcurrency,
} from "../utils/backend";

/** 已结束的状态：允许关闭、禁用操作按钮 */
const FINISHED_STATES: ProgressState[] = ["done", "stopped", "error"];

// 已关闭/已清除的任务 ID，避免下次快照又把它们推回来
const hiddenIds = ref<Set<string>>(new Set());
const tasks = ref<TaskSummary[]>([]);
const collapsed = ref(false);

// 本地并发输入模型：只在任务首次出现时由后端值初始化，之后不再被 250ms 快照覆盖，
// 否则用户一输入就会被快照刷回，导致“无法设置并发数”
const concLocal = reactive<Record<string, number>>({});

// 严格按后端提交顺序显示，不在前端按状态重排（暂停的任务保持原位）
const orderedTasks = computed(() => tasks.value);
const hasFinished = computed(() => tasks.value.some(isFinished));
const totalCount = computed(() => tasks.value.length);

function stateClass(s: ProgressState): string {
  return `status-dot--${s}`;
}
function statusClass(s: ProgressState): string {
  return stateClass(s);
}
function isFinished(t: TaskSummary): boolean {
  return FINISHED_STATES.includes(t.state);
}
function canPause(t: TaskSummary): boolean {
  return !isFinished(t) && t.state !== "paused";
}
function canResume(t: TaskSummary): boolean {
  return !isFinished(t) && t.state !== "running";
}
function percentOf(t: TaskSummary): number {
  return t.total
    ? Math.round(((t.success + t.failed + t.skipped) / t.total) * 100)
    : 0;
}

// 卸载后 Go 侧仍会继续推送，用标志位跳过赋值
let unmounted = false;

onMounted(() => {
  // Go 侧每 250ms 推送一次整个队列快照（顺序即提交顺序）
  onDownloadProgress((progress: DownloadProgress) => {
    if (unmounted) return;
    const next = progress.tasks.filter((t) => !hiddenIds.value.has(t.taskId));
    // 新任务首次出现时用后端并发值初始化本地输入，已编辑过的不覆盖
    for (const t of next) {
      if (concLocal[t.taskId] === undefined)
        concLocal[t.taskId] = t.concurrency;
    }
    tasks.value = next;
  });
});

onBeforeUnmount(() => {
  unmounted = true;
});

function pause(t: TaskSummary): void {
  pauseDownload(t.taskId);
}
function resume(t: TaskSummary): void {
  resumeDownload(t.taskId);
}
function stop(t: TaskSummary): void {
  stopDownload(t.taskId);
}
function closeTask(t: TaskSummary): void {
  hiddenIds.value.add(t.taskId);
  tasks.value = tasks.value.filter((x) => x.taskId !== t.taskId);
}
function clearFinished(): void {
  for (const t of tasks.value) {
    if (isFinished(t)) hiddenIds.value.add(t.taskId);
  }
  tasks.value = tasks.value.filter((t) => !isFinished(t));
}
function onConcurrency(t: TaskSummary, v: number | null): void {
  if (v && v > 0) {
    concLocal[t.taskId] = v;
    void setConcurrency(t.taskId, v);
  }
}
</script>

<style lang="scss" scoped>
.task-list {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 80vh;
  overflow-y: auto;
  z-index: 100;
}

.box-progress {
  width: 248px;
  padding: 10px 12px;
  border: 1px solid rgb(24 40 55 / 8%);
  border-radius: 10px;
  background-color: #fff;
  box-shadow: 0 6px 20px rgb(24 40 55 / 14%);
  user-select: none;

  .progress-head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }
  .layer-id {
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 13px;
    font-weight: 600;
  }
  .percent {
    font-size: 12px;
    color: #8a8f99;
    font-variant-numeric: tabular-nums;
  }
  .progress-track {
    height: 6px;
    border-radius: 999px;
    background-color: rgb(24 40 55 / 8%);
    overflow: hidden;
  }
  .progress-bar {
    height: 100%;
    border-radius: inherit;
    background-color: #2080f0;
    transition: width 0.25s linear;
  }
  .progress-meta {
    display: flex;
    justify-content: space-between;
    margin: 6px 0 8px;
    color: #6b7078;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  .fail {
    color: #d03050;
  }
  .progress-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .conc {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #8a8f99;
  }
}

.task-list-footer {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.status-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #c2c4c8;

  &--running {
    background-color: #2080f0;
    animation: dot-pulse 1.2s ease-in-out infinite;
  }
  &--paused {
    background-color: #f0a020;
  }
  &--done {
    background-color: #18a058;
  }
  &--stopped {
    background-color: #8a8f99;
  }
  &--error {
    background-color: #d03050;
  }
  &--queued {
    background-color: #c2c4c8;
  }
}

@keyframes dot-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.box-progress-entry {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 100;
  box-shadow: 0 4px 14px rgb(24 40 55 / 16%);
}
</style>
