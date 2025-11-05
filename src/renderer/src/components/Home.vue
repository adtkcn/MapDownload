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
    <n-icon size="20" title="帮助" style="cursor: pointer" @click="showHelp(true)">
      <HelpCircleOutline />
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
    <help-dialog :visible="helpVisible" @ok="showHelp(false)" />
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
import HelpDialog from './Help.vue'
import MapKey from './MapKey.vue'
import Tips from './Tips.vue'
import { useMessage, useNotification } from 'naive-ui'
import GridIcon from './GridIcon.vue'
import ProgressControl from './ProgressControl.vue'

import type { saveParam } from './types.d.ts'
import {
  CloudDownloadOutline,
  HelpCircleOutline,
  SettingsOutline,
  SquareOutline
} from '@vicons/ionicons5'
import type { BaseLayerType } from '../utils/layerList'
import type * as MaptalksType from 'maptalks/src/index.ts'
// 设置全局消息通知
defineExpose({
  name: 'HomeMain'
})

// 全局消息和通知
const $message = useMessage()
const $notification = useNotification()

// 地图实例
let mapInstance: baseMap

// 响应式数据
const isDrawing = ref(false)
const saveVisible = ref(false)
const downloadExtent = ref({})
const helpVisible = ref(false)
const setVisible = ref(false)
const saveLayers = ref<Array<MaptalksType.Layer>>([])
const limitMinZoom = ref(1)
const limitMaxZoom = ref(18)
const isBaidu = ref(false)
let _currentLayer: BaseLayerType | null = null
let _drawStartInfo: any = null

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

function showSave(showMsg = true) {
  downloadExtent.value = mapInstance?.getDownloadExtent()
  if (!downloadExtent.value) {
    if (showMsg) $message.warning('获取下载范围错误，请重新绘制下载范围')
    return false
  }
  const { tileLayer, maxZoom, minZoom, projection } = mapInstance.getBaseMapConfig()
  saveLayers.value = tileLayer
  limitMaxZoom.value = maxZoom
  limitMinZoom.value = minZoom
  isBaidu.value = projection.code === 'BAIDU'
  saveVisible.value = true
  mapInstance?.fitExtent()

  return true
}

function save(val: saveParam) {
  saveVisible.value = false
  nextTick(() => {
    const mapConfig = mapInstance.getBaseMapConfig()
    if (mapConfig) {
      val.mapConfig = mapConfig
      new FileSave(val)
    }
  })
}

function cancelSave() {
  saveVisible.value = false
}

function showHelp(val: boolean) {
  helpVisible.value = val
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

function chooseArea(data: { option: any; geojson: any }) {
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
