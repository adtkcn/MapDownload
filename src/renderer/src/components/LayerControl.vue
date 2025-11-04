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

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { getMapList } from '@renderer/utils/layerList'
import { getKeys } from '@renderer/utils/mapKey.js'
import { Layers } from '@vicons/ionicons5'
import { useMessage } from 'naive-ui'

export default defineComponent({
  name: 'LayerControl',
  components: {
    Layers
  },
  props: {},
  emits: ['choose'],
  setup(prop, { emit }) {
    const showDropdownRef = ref(false)
    const $message = useMessage()
    const layerList = getMapList()
    return {
      layers: layerList,
      layersVisible: showDropdownRef,
      icon: {
        normal: '#333333',
        active: '#2080f0'
      },
      handleSelect(key, layer) {
        const parent = layerList.find((item) => {
          return item.uuid === layer.pid
        })
        if (!parent) {
          $message.warning('请选择地图源')
          return
        }
        const { mapboxKey, tdtKey } = getKeys()
        if ((parent.value === 'Mapbox' && !mapboxKey) || (parent.value === 'Tdt' && !tdtKey)) {
          $message.warning(`请设置${parent.label}地图Key`)
        }
        emit('choose', { parent: parent.value, layer: layer })

        showDropdownRef.value = false
      },
      handleIconClick(e) {
        e.preventDefault()
        showDropdownRef.value = true
      },
      onClickoutside() {
        showDropdownRef.value = false
      }
    }
  },
  data() {
    return {}
  },
  computed: {
    layerColor() {
      return this.layersVisible ? this.icon.active : this.icon.normal
    }
  }
})
</script>
