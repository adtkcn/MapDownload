<template>
  <div ref="container" class="box-progress" :class="{ hide: hide }">
    <progress class="progress" :value="percentage" max="100" />
    <div class="item">
      状态:<span>{{ stateText }}</span>
    </div>
    <div class="item">
      图层:<span>{{ layerId }}</span>
    </div>
    <div class="item">
      总数:<span>
        {{ total }}
      </span>
    </div>

    <div class="item">
      已下载:<span class="success">
        {{ success }}
      </span>
    </div>
    <div class="item">
      已存在:<span class="exist">
        {{ skipped }}
      </span>
    </div>
    <div class="item">
      失败:<span class="error">
        {{ failed }}
      </span>
    </div>
    <div class="item">
      重试数:<span>
        {{ retried }}
      </span>
    </div>
    <div class="item">
      并发数:<span>
        {{ inFlight }}
      </span>
    </div>
    <NButton @click="pause">暂停</NButton>
    <NButton @click="stop">停止</NButton>
    <NButton @click="continueDownload">继续</NButton>
    <NButton @click="closeProgress">关闭</NButton>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { DownloadProgress } from '@shared/downloadTypes'

const STATE_TEXT: Record<DownloadProgress['state'], string> = {
  running: '下载中',
  paused: '已暂停',
  done: '已完成',
  stopped: '已停止',
  error: '异常'
}

export default defineComponent({
  name: 'ProgressControl',
  data() {
    return {
      hide: true,
      state: '' as DownloadProgress['state'] | '',
      layerId: '',
      success: 0,
      failed: 0, // 下载失败数
      skipped: 0, // 已存在文件数
      percentage: 0, // 下载进度百分比
      total: 0, // 下载总数
      inFlight: 0, // 并发数
      retried: 0 // 重试次数
    }
  },
  computed: {
    stateText(): string {
      return this.state ? STATE_TEXT[this.state] : ''
    }
  },
  mounted() {
    // 主进程每 250ms 推送一次，不再逐瓦片回调
    window.api.onDownloadProgress((state) => {
      this.hide = false

      this.state = state.state
      this.layerId = state.layerId
      this.total = state.total
      this.success = state.success
      this.failed = state.failed
      this.skipped = state.skipped
      this.inFlight = state.inFlight
      this.retried = state.retried
      this.percentage = state.total
        ? ((state.success + state.failed + state.skipped) / state.total) * 100
        : 0
    })
  },
  methods: {
    closeProgress() {
      this.hide = true
    },
    pause() {
      window.api.downloadPause()
    },
    stop() {
      window.api.downloadStop()
    },
    continueDownload() {
      window.api.downloadResume()
    }
  }
})
</script>

<style lang="scss" scoped>
.box-progress {
  position: absolute;
  right: 10px;
  bottom: 10px;
  background-color: white;
  box-shadow: 0px 2px 4px 0px rgb(54 58 80 / 30%);
  width: 200px;
  padding: 8px;
  z-index: 100;

  .progress {
    width: 100%;
  }
  .item {
    text-align: left;
  }
}
.hide {
  display: none;
}
</style>
