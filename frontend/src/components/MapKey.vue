<template>
  <n-modal
    v-model:show="showModal"
    :show-icon="false"
    :on-mask-click="cancel"
    :on-esc="cancel"
    :on-close="cancel"
    preset="dialog"
  >
    <template #header> 地图Key配置 </template>
    <div class="dialog-content">
      <div class="item">
        <span class="label">天地图：</span>
        <input v-model="tdtKey" class="value" type="text" />
      </div>
      <div class="item">
        <span class="label">MapBox：</span>
        <input v-model="mapboxKey" class="value" type="text" />
      </div>
    </div>
    <template #action>
      <n-button @click="cancel"> 取消 </n-button>
      <n-button type="info" @click="ok"> 确定 </n-button>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getKeys, setKeys } from '@renderer/utils/mapKey.js'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const showModal = ref(props.visible)
const tdtKey = ref('')
const mapboxKey = ref('')

function loadKeys(): void {
  const data = getKeys()
  tdtKey.value = data?.tdtKey || ''
  mapboxKey.value = data?.mapboxKey || ''
}

watch(
  () => props.visible,
  (val) => {
    showModal.value = val
  }
)

loadKeys()

function cancel(): void {
  emit('close')
}

function ok(): void {
  setKeys({
    tdtKey: tdtKey.value,
    mapboxKey: mapboxKey.value
  })
  cancel()
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
</style>
