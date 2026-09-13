<template>
  <div id="map" />

  <div class="box-controls">
    <layer-control @choose="chooseLayers" />
    <div class="splitLine" />
    <n-icon
      size="20"
      title="绘制矩形"
      style="cursor: pointer"
      :color="isDrawing ? '#2080f0' : '#333333'"
      @click="drawRect"
    >
      <SquareOutline />
    </n-icon>
    <div class="splitLine" />
    <n-icon size="20" title="下载地图" style="cursor: pointer" @click="showSave">
      <CloudDownloadOutline />
    </n-icon>
    <div class="splitLine" />
    <GridIcon @show-grid="showGrid" />
    <div class="splitLine" />
    <n-icon size="20" title="设置" style="cursor: pointer" @click="showSet(true)">
      <SettingsOutline />
    </n-icon>
    <div class="splitLine" />
    <area-choose @choose="chooseArea" />

    <save-dialog
      :visible="saveVisible"
      :download-extent="downloadExtent"
      :base-layer="saveLayers"
      :limit-max-zoom="limitMaxZoom"
      :limit-min-zoom="limitMinZoom"
      :is-baidu="isBaidu"
      @ok="save"
      @cancel="cancelSave"
    />
    <map-key :visible="setVisible" @close="showSet(false)" />
  </div>
  <ProgressControl />
  <tips />
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import baseMap from '../utils/baseMap.js'

import LayerControl from './LayerControl.vue'
import AreaChoose from './AreaChoose.vue'
import SaveDialog from './Save.vue'
import FileSave from '../utils/fileSave.js'
import MapKey from './MapKey.vue'
import Tips from './Tips.vue'
import { useMessage, useNotification } from 'naive-ui'
import GridIcon from './GridIcon.vue'
import ProgressControl from './ProgressControl.vue'

import type { DownloadExtent, SaveFormParam, saveParam } from './types'
import {
  CloudDownloadOutline,
  SettingsOutline,
  SquareOutline
} from '@vicons/ionicons5'
import type { BaseLayerType } from '../utils/layerList'
// 与 utils/baseMap.ts 保持一致：都从包内源码取类型，避免 dist 与 src 两套类型互不兼容
import type * as MaptalksType from 'maptalks/src/index.ts'

defineOptions({
  name: 'HomeMain'
})

// 全局消息和通知
const $message = useMessage()
const $notification = useNotification()
type NotificationHandle = ReturnType<typeof $notification.create>

// 地图实例
let mapInstance: baseMap | null = null

// 响应式数据
const isDrawing = ref(false)
const saveVisible = ref(false)
const downloadExtent = ref<Partial<DownloadExtent>>({})
const setVisible = ref(false)
const saveLayers = ref<Array<MaptalksType.Layer>>([])
const limitMinZoom = ref(1)
const limitMaxZoom = ref(18)
const isBaidu = ref(false)
let _currentLayer: BaseLayerType | null = null
let _drawStartInfo: NotificationHandle | null = null

// 生命周期钩子
onMounted(() => {
  mapInstance = new baseMap('map')
  addMapRightClickHandle()
})

// 方法
function chooseLayers(data: BaseLayerType) {
  _currentLayer = data
  mapInstance?.switchBaseLayer(data)
}

function drawRect() {
  isDrawing.value = !isDrawing.value
  if (isDrawing.value) {
    hideDrawTips()
    _drawStartInfo = $notification.create({
      content: '已开启矩形绘制，右键下载瓦片',
      duration: 10000
    })
    mapInstance?.startDraw()
  } else {
    mapInstance?.endDraw()
  }
}

function hideDrawTips() {
  if (_drawStartInfo) {
    _drawStartInfo.destroy()
    _drawStartInfo = null
  }
}

// 地图右键下载瓦片
function addMapRightClickHandle() {
  mapInstance?.getMap().addEventListener('contextmenu', () => {
    if (!isDrawing.value) return
    if (!showSave(false)) {
      setTimeout(() => {
        isDrawing.value = false
        mapInstance?.endDraw()
        hideDrawTips()
      }, 50)
      return
    }
  })
}

function showSave(showMsg = true): boolean {
  // 未绘制范围时 getDownloadExtent 返回 null，此时不能继续
  const extent = mapInstance?.getDownloadExtent()
  const config = mapInstance?.getBaseMapConfig()
  if (!extent || !config) {
    if (showMsg) $message.warning('获取下载范围错误，请重新绘制下载范围')
    return false
  }
  // 转成普通对象，避免把 maptalks 的 Extent 实例直接放进响应式 ref；
  // Extent 的字段可能是 null，这里归一成可选属性
  downloadExtent.value = {
    xmin: extent.xmin ?? undefined,
    ymin: extent.ymin ?? undefined,
    xmax: extent.xmax ?? undefined,
    ymax: extent.ymax ?? undefined
  }
  const { tileLayer, maxZoom, minZoom, projection } = config
  saveLayers.value = tileLayer
  limitMaxZoom.value = maxZoom
  limitMinZoom.value = minZoom
  isBaidu.value = projection.code === 'BAIDU'
  saveVisible.value = true
  mapInstance?.fitExtent()

  return true
}

function save(val: SaveFormParam): void {
  saveVisible.value = false
  nextTick(() => {
    const mapConfig = mapInstance?.getBaseMapConfig()
    if (mapConfig) {
      // 补上地图配置后交给下载器，extent 已由 showSave 校验过
      new FileSave({ ...val, mapConfig } as unknown as saveParam)
    }
  })
}

function cancelSave() {
  saveVisible.value = false
}

function showSet(val: boolean) {
  setVisible.value = val
  if (
    !val &&
    _currentLayer &&
    (_currentLayer.parent === 'Tdt' || _currentLayer.parent === 'Mapbox')
  ) {
    mapInstance?.switchBaseLayer(_currentLayer)
  }
}

function chooseArea(data: { option: unknown; geojson: unknown }): void {
  // 结束绘制
  isDrawing.value = false
  mapInstance?.endDraw()
  hideDrawTips()
  // 添加区域至地图
  const { geojson } = data
  // console.log(option);
  mapInstance?.addGeometry(geojson, true, () => {
    showSave()
  })
  mapInstance?.fitExtent()
}

function showGrid(bool: boolean) {
  mapInstance?.showTileGrid(bool)
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
.loadingSpin {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}
#map {
  position: absolute;
  margin: 0;
  padding: 0;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.box-controls {
  position: absolute;
  left: 70px;
  top: 10px;
  background-color: white;
  box-shadow: 0px 2px 4px 0px rgb(54 58 80 / 30%);

  padding: 8px;
  display: flex;

  .splitLine {
    width: 1px;
    height: 20px;
    margin: 0 8px;
    background-color: #999999;
  }
}
</style>
