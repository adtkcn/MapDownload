<template>
  <div ref="container" class="box-progress" :class="{ hide: hide }">
    <progress class="progress" :value="percentage" max="100" />
    <div class="item">
      总数:<span>
        {{ count }}
      </span>
    </div>

    <div class="item">
      已下载:<span class="success">
        {{ success }}
      </span>
    </div>
        <div class="item">
      已存在:<span class="exist">
        {{ existNum }}
      </span>
    </div>
    <div class="item">
      失败:<span class="error">
        {{ error }}
      </span>
    </div>
    <div class="item">
      并发数:<span>
        {{ requestNum }}
      </span>
    </div>
    <button @click="closeProgress">关闭</button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'ProgressControl',
  data() {
    return {
      hide: true,
      success: 0,
      error: 0, // 下载失败数
      existNum: 0, // 已存在文件数
      percentage: 0, // 下载进度百分比
      count: 0, // 下载总数
      requestNum: 0 // 并发数
    }
  },
  mounted() {
    window.api.imageDownloadDone((state) => {
      // console.log('state', state)

      this.hide = false

      this.count = state.count
      this.success = state.success
      this.error = state.error
      this.existNum = state.existNum
      this.requestNum = state.requestNum
      this.percentage = ((state.success + state.error) / state.count) * 100
    })
  },
  methods: {
    closeProgress() {
      this.hide = true
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
