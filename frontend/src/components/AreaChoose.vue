<template>
  <n-popover ref="popover" trigger="click" width="200">
    <template #trigger>
      <span style="cursor: pointer; color: #2080f0" title="选择下载区域">
        {{ chooseArea || '选择下载区域' }}
      </span>
    </template>
    <n-tree
      block-line
      :data="layers"
      :key-field="'areaCode'"
      :label-field="'areaName'"
      :default-expanded-keys="[-1]"
      :on-update:selected-keys="handleSelect"
      selectable
      virtual-scroll
      style="height: 320px"
    />
  </n-popover>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getAreaList } from '@renderer/utils/areaList.js'

/** 区域树节点 */
type AreaOption = {
  areaCode: string | number
  areaName: string
  fetchLoad: () => Promise<unknown>
}

const emit = defineEmits<{
  choose: [payload: { option: AreaOption; geojson: unknown }]
}>()

/** n-popover 暴露的手动开关方法 */
type PopoverExpose = { setShow: (show: boolean) => void }

const layers = getAreaList()
const chooseArea = ref('')
const popover = ref<PopoverExpose | null>(null)

function handleSelect(_keys: Array<string | number>, options: AreaOption[]): void {
  const option = options[0]
  // n-tree 取消选中时 options 为空数组
  if (!option) return

  chooseArea.value = option.areaName
  popover.value?.setShow(false)
  option.fetchLoad().then((geojson) => {
    emit('choose', { option, geojson })
  })
}
</script>
