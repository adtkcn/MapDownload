<template>
  <n-modal
    v-model:show="showModal"
    draggable
    :show-icon="false"
    :on-mask-click="cancel"
    :on-esc="cancel"
    :on-close="cancel"
    preset="dialog"
  >
    <template #header> 下载参数配置 </template>
    <div class="dialog-content">
      <n-descriptions
        label-placement="left"
        title="下载范围"
        size="small"
        :column="1"
        class="descriptions"
      >
        <n-descriptions-item label="xmin">
          {{ downloadExtent.xmin }}
        </n-descriptions-item>
        <n-descriptions-item label="xmax">
          {{ downloadExtent.xmax }}
        </n-descriptions-item>
        <n-descriptions-item label="ymin">
          {{ downloadExtent.ymin }}
        </n-descriptions-item>
        <n-descriptions-item label="ymax">
          {{ downloadExtent.ymax }}
        </n-descriptions-item>
      </n-descriptions>
      <div class="item">
        <span class="label">最小层级：</span>
        <input v-model="minZoom" class="value" type="text" />
      </div>
      <div class="item">
        <span class="label">最大层级：</span>
        <input v-model="maxZoom" class="value" type="text" />
      </div>
      <div v-if="showMerge" class="item">
        <span class="label">合并标注：</span>
        <div class="value"><input v-model="mergeLayers" type="checkbox" />是否合并</div>
        <div v-if="mergeLayers" class="warning-merge">下载大量瓦片时，合并可能会造成卡死！</div>
      </div>

      <div class="item">
        <span class="label">下载路径：</span>
        <div class="value">
          <input v-model="savePath" type="text" disabled style="width: 215px" />
          <button @click="setFolder">选择</button>
        </div>
      </div>
      <div class="item">
        <span class="label">并发数：</span>
        <input v-model="concurrency" class="value" type="text" />
      </div>
    </div>
    <template #action>
      <n-button @click="cancel"> 取消 </n-button>
      <n-button type="info" @click="ok"> 确定 </n-button>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref, toRaw, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { selectFolder } from '../utils/backend'
import type { DownloadExtent, SaveFormParam } from './types'

/** 打开对话框时回填的默认层级 */
const DEFAULT_MIN_ZOOM = 5
const DEFAULT_MAX_ZOOM = 8
/** 默认并发下载数（用户可手动调整） */
const DEFAULT_CONCURRENCY = 48

const props = defineProps<{
  visible: boolean
  downloadExtent: Partial<DownloadExtent>
  baseLayer: unknown
  limitMinZoom: number
  limitMaxZoom: number
  isBaidu: boolean
}>()

const emit = defineEmits<{
  cancel: []
  ok: [param: SaveFormParam]
}>()

const message = useMessage()

const showModal = ref(props.visible)
const savePath = ref('')
const minZoom = ref('')
const maxZoom = ref('')
const mergeLayers = ref(false)
const concurrency = ref('')

const showMerge = computed(() => Array.isArray(props.baseLayer) && props.baseLayer.length > 1)

/** 把层级收敛到当前图层允许的范围内 */
function clampZoom(zoom: number): number {
  return Math.min(Math.max(zoom, props.limitMinZoom), props.limitMaxZoom)
}

function initForm(): void {
  savePath.value = window.localStorage.getItem('savePath') || ''
  minZoom.value = String(clampZoom(DEFAULT_MIN_ZOOM))
  maxZoom.value = String(clampZoom(DEFAULT_MAX_ZOOM))
  mergeLayers.value = false
  concurrency.value = String(DEFAULT_CONCURRENCY)
}

watch(
  () => props.visible,
  (val) => {
    showModal.value = val
    // 每次打开都重新初始化，避免上一次「取消」留下空表单
    if (val) initForm()
  }
)

initForm()

async function setFolder(): Promise<void> {
  const dir = await selectFolder()
  if (!dir) return
  savePath.value = dir
  window.localStorage.setItem('savePath', savePath.value)
}

function cancel(): void {
  emit('cancel')
}

function ok(): void {
  if (!savePath.value) {
    message.warning('请选择保存目录')
    return
  }
  if (!maxZoom.value) {
    message.warning('请输入最大层级')
    return
  }
  if (!minZoom.value) {
    message.warning('请输入最小层级')
    return
  }
  const minZoomValue = parseInt(minZoom.value)
  const maxZoomValue = parseInt(maxZoom.value)
  if (isNaN(minZoomValue) || isNaN(maxZoomValue)) {
    message.warning('层级格式错误，请输入非负整数')
    return
  }
  if (
    minZoomValue > maxZoomValue ||
    minZoomValue < props.limitMinZoom ||
    maxZoomValue > props.limitMaxZoom
  ) {
    message.warning('层级格式错误')
    return
  }

  const concurrencyValue = parseInt(concurrency.value)
  const concurrencyFinal = isNaN(concurrencyValue) || concurrencyValue < 1 ? DEFAULT_CONCURRENCY : concurrencyValue

  const param: SaveFormParam = {
    savePath: savePath.value,
    minZoom: minZoomValue,
    maxZoom: maxZoomValue,
    mergeLayers: mergeLayers.value,
    extent: toRaw(props.downloadExtent),
    concurrency: concurrencyFinal
  }
  emit('ok', param)
}
</script>

<style lang="scss" scoped>
.dialog-content {
  width: 100%;
  padding: 8px 16px;
  .item {
    margin: 3px 0;
  }
  .label {
    display: inline-block;
    width: 80px;
    text-align: right;
  }
  .value {
    display: inline-block;
    width: 260px;
  }
}
.descriptions {
  :deep(.n-descriptions-header) {
    font-size: 14px;
    margin-bottom: 3px;
  }
  :deep(.n-descriptions-table-content__label) {
    display: inline-block;
    width: 80px;
    text-align: right;
  }
}
.warning-merge {
  width: 100%;
  color: red;
  padding-left: 83px;
}
</style>
