<template>
  <n-dropdown
    :options="layers"
    placement="bottom-start"
    trigger="click"
    :key-field="'uuid'"
    :on-clickoutside="onClickoutside"
    @select="handleSelect"
  >
    <n-icon
      class="sourceLayer"
      size="20"
      title="切换地图源"
      style="cursor: pointer"
      :color="layerColor"
      @click="handleIconClick"
    >
      <Layers />
    </n-icon>
  </n-dropdown>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMessage } from 'naive-ui'
import { getMapList } from '@renderer/utils/layerList'
import { getKeys } from '@renderer/utils/mapKey.js'
import { Layers } from '@vicons/ionicons5'
import type { BaseLayerType, MapLayerType } from '@renderer/utils/layerList'

const emit = defineEmits<{
  choose: [payload: BaseLayerType]
}>()

/** n-dropdown 回传的 option，pid 指向所属地图源 */
type LayerOption = MapLayerType & { pid?: string }

const COLOR = {
  normal: '#333333',
  active: '#2080f0'
}

const $message = useMessage()
const layers = getMapList()
const layersVisible = ref(false)

const layerColor = computed(() => (layersVisible.value ? COLOR.active : COLOR.normal))

function handleSelect(_key: string | number, layer: LayerOption): void {
  const parent = layers.find((item) => item.uuid === layer.pid)
  if (!parent) {
    $message.warning('请选择地图源')
    return
  }
  const { mapboxKey, tdtKey } = getKeys()
  if ((parent.value === 'Mapbox' && !mapboxKey) || (parent.value === 'Tdt' && !tdtKey)) {
    $message.warning(`请设置${parent.label}地图Key`)
  }
  emit('choose', { parent: parent.value, layer: layer })

  layersVisible.value = false
}

function handleIconClick(e: MouseEvent): void {
  e.preventDefault()
  layersVisible.value = true
}

function onClickoutside(): void {
  layersVisible.value = false
}
</script>
