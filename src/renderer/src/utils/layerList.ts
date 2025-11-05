// 地图列表
import { uuid } from './random'
// const BaiduConstomSubdomains = [0, 1, 2] // 百度自定义瓦片子域名

export type MapType =
  | 'Amap'
  | 'Baidu'
  | 'Google'
  | 'Mapbox'
  | 'Tencent'
  | 'Osm'
  | 'CartoDb'
  | 'Geoq'
  | 'Tdt'
export type MapLayerType = {
  label: string
  value: string
  prejection: string
  exteral: {
    attribution: string
    subdomains?: number[] | string[]
  }
}
export type MapListType = {
  label: string
  value: MapType
  uuid?: string
  children: MapLayerType[]
}
export type BaseLayerType = {
  parent: MapType
  layer: MapLayerType
}

const mapList: MapListType[] = [
  {
    label: '高德',
    value: 'Amap',
    children: [
      {
        label: '电子地图',
        value: 'Amap_Normal',
        prejection: 'EPSG:3857',
        exteral: {
          subdomains: [1, 3, 4],
          attribution: '高德-电子地图'
        }
      },
      {
        label: '卫星地图',
        value: 'Amap_Satellite',
        prejection: 'EPSG:3857',
        exteral: { subdomains: [1, 3, 4], attribution: '高德-卫星地图' }
      },
      {
        label: '电子地图(英文)',
        value: 'Amap_NormalEn',
        prejection: 'EPSG:3857',
        exteral: { subdomains: [1, 3, 4], attribution: '高德-电子地图(英文)' }
      }
    ]
  },
  {
    label: '百度',
    value: 'Baidu',
    children: [
      {
        label: '电子地图',
        value: 'Baidu_Normal',
        prejection: 'baidu',
        exteral: {
          subdomains: [0, 1, 2, 3],
          attribution: '百度-电子地图'
        }
      }
      // {
      //   label: '卫星地图',
      //   value: 'Baidu_Satellite',
      //   prejection: 'baidu',
      //   exteral: {
      //     subdomains: [0, 1, 2, 3],
      //     attribution: '百度-卫星地图'
      //   }
      // },
      // {
      //   label: '午夜蓝',
      //   value: 'Baidu_midnight',
      //   prejection: 'baidu',
      //   exteral: {
      //     subdomains: BaiduConstomSubdomains,
      //     attribution: '百度-自定义-午夜蓝'
      //   }
      // },
      // {
      //   label: '清新蓝',
      //   value: 'Baidu_light',
      //   prejection: 'baidu',
      //   exteral: {
      //     subdomains: BaiduConstomSubdomains,
      //     attribution: '百度-自定义-清新蓝'
      //   }
      // },
      // {
      //   label: '黑夜',
      //   value: 'Baidu_dark',
      //   prejection: 'baidu',
      //   exteral: {
      //     subdomains: BaiduConstomSubdomains,
      //     attribution: '百度-自定义-黑夜'
      //   }
      // },
      // {
      //   label: '红色警戒',
      //   value: 'Baidu_redalert',
      //   prejection: 'baidu',
      //   exteral: {
      //     subdomains: BaiduConstomSubdomains,
      //     attribution: '百度-自定义-红色警戒'
      //   }
      // },
      // {
      //   label: '精简(仿google)',
      //   value: 'Baidu_googlelite',
      //   prejection: 'baidu',
      //   exteral: {
      //     subdomains: BaiduConstomSubdomains,
      //     attribution: '百度-自定义-精简'
      //   }
      // },
      // {
      //   label: '自然绿',
      //   value: 'Baidu_grassgreen',
      //   prejection: 'baidu',
      //   exteral: {
      //     subdomains: BaiduConstomSubdomains,
      //     attribution: '百度-自定义-自然绿'
      //   }
      // },
      // {
      //   label: '浪漫粉',
      //   value: 'Baidu_pink',
      //   prejection: 'baidu',
      //   exteral: {
      //     subdomains: BaiduConstomSubdomains,
      //     attribution: '百度-自定义-浪漫粉'
      //   }
      // },
      // {
      //   label: '青春绿',
      //   value: 'Baidu_darkgreen',
      //   prejection: 'baidu',
      //   exteral: {
      //     subdomains: BaiduConstomSubdomains,
      //     attribution: '百度-自定义-青春绿'
      //   }
      // },
      // {
      //   label: '清新蓝绿',
      //   value: 'Baidu_bluish',
      //   prejection: 'baidu',
      //   exteral: {
      //     subdomains: BaiduConstomSubdomains,
      //     attribution: '百度-自定义-清新蓝绿'
      //   }
      // },
      // {
      //   label: '高端灰',
      //   value: 'Baidu_grayscale',
      //   prejection: 'baidu',
      //   exteral: {
      //     subdomains: BaiduConstomSubdomains,
      //     attribution: '百度-自定义-高端灰'
      //   }
      // },
      // {
      //   label: '强边界',
      //   value: 'Baidu_hardedge',
      //   prejection: 'baidu',
      //   exteral: {
      //     subdomains: BaiduConstomSubdomains,
      //     attribution: '百度-自定义-强边界'
      //   }
      // }
    ]
  },
  {
    label: '腾讯',
    value: 'Tencent',
    children: [
      {
        label: '电子地图',
        value: 'Tencent_Normal',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: '腾讯-电子地图'
        }
      },
      {
        label: '卫星地图',
        value: 'Tencent_Satellite',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: '腾讯-卫星地图'
        }
      },
      {
        label: '地形图',
        value: 'Tencent_Terrain',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: '腾讯-地形图'
        }
      }
    ]
  },
  {
    label: 'OpenStreetMap',
    value: 'Osm',
    children: [
      {
        label: '电子地图',
        value: 'Osm_Normal',
        prejection: 'EPSG:3857',
        exteral: {
          subdomains: ['a', 'b', 'c'],
          attribution: 'OpenStreetMap-电子地图'
        }
      },
      {
        label: '骑行图',
        value: 'Osm_Bike',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: 'OpenStreetMap-骑行图'
        }
      },
      {
        label: '交通图',
        value: 'Osm_Transport',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: 'OpenStreetMap-交通图'
        }
      },
      {
        label: '山地图',
        value: 'Osm_Humanitarian',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: 'OpenStreetMap-山地图'
        }
      }
    ]
  },
  {
    label: 'CartoDb',
    value: 'CartoDb',
    children: [
      {
        label: '地图(白)',
        value: 'CartoDb_Light',
        prejection: 'EPSG:3857',

        exteral: {
          attribution: 'CartoDb-白'
        }
      },
      {
        label: '地图(黑)',
        value: 'CartoDb_Dark',
        prejection: 'EPSG:3857',

        exteral: {
          attribution: 'CartoDb-黑'
        }
      }
    ]
  },
  {
    label: 'ArcGIS',
    value: 'Geoq',
    children: [
      {
        label: '彩色',
        value: 'Geoq_Colour',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: 'ArcGIS-彩色'
        }
      },
      {
        label: '灰度',
        value: 'Geoq_Gray',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: 'ArcGIS-灰度'
        }
      },
      {
        label: '午夜蓝',
        value: 'Geoq_Midnightblue',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: 'ArcGIS-午夜蓝'
        }
      }
    ]
  },
  {
    label: '天地图',
    value: 'Tdt',
    children: [
      {
        label: '普通',
        value: 'Tdt_Normal',
        prejection: 'EPSG:3857',
        exteral: {
          subdomains: ['0', '1', '2'],
          attribution: '天地图-普通地图'
        }
      },
      {
        label: '卫星',
        value: 'Tdt_Satellite',
        prejection: 'EPSG:3857',
        exteral: {
          subdomains: ['0', '1', '2'],
          attribution: '天地图-卫星地图'
        }
      },
      {
        label: '地形',
        value: 'Tdt_Terrain',
        prejection: 'EPSG:3857',
        exteral: {
          subdomains: ['0', '1', '2'],
          attribution: '天地图-地形图'
        }
      }
    ]
  },
  {
    label: 'Mapbox',
    value: 'Mapbox',
    children: [
      {
        label: '街景',
        value: 'Mapbox_Streets',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: 'Mapbox-街景'
        }
      },
      {
        label: '暗黑',
        value: 'Mapbox_Dark',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: 'Mapbox-暗黑'
        }
      },
      {
        label: '浅黑',
        value: 'Mapbox_LightDark',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: 'Mapbox-浅黑'
        }
      },
      {
        label: '卫星',
        value: 'Mapbox_Satellite',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: 'Mapbox-卫星'
        }
      },
      {
        label: '浅色',
        value: 'Mapbox_Light',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: 'Mapbox-浅色'
        }
      },
      {
        label: 'Emerald',
        value: 'Mapbox_Emerald',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: 'Mapbox-Emerald'
        }
      },
      {
        label: '白色',
        value: 'Mapbox_White',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: 'Mapbox-白色'
        }
      },
      {
        label: '红色',
        value: 'Mapbox_Red',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: 'Mapbox-红色'
        }
      },
      {
        label: 'Outdoors',
        value: 'Mapbox_Outdoors',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: 'Mapbox-Outdoors'
        }
      },
      {
        label: 'StreetsSatellite',
        value: 'Mapbox_StreetsSatellite',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: 'Mapbox-StreetsSatellite'
        }
      },
      {
        label: 'Comic',
        value: 'Mapbox_Comic',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: 'Mapbox-Comic'
        }
      },
      {
        label: '建筑',
        value: 'Mapbox_Building',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: 'Mapbox-建筑'
        }
      }
    ]
  },
  {
    label: 'Google',
    value: 'Google',
    children: [
      {
        label: '普通',
        value: 'Google_Normal',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: 'Google-普通'
        }
      },
      {
        label: '卫星',
        value: 'Google_Satellite',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: 'Google-卫星'
        }
      },
      {
        label: '卫星Label',
        value: 'Google_Satellite_Label',
        prejection: 'EPSG:3857',
        exteral: {
          attribution: 'Google-卫星Label'
        }
      }
    ]
  }
]

export function defaultMap(): BaseLayerType {
  return { parent: mapList[0].value, layer: mapList[0].children[0] }
}

export function getMapList(): MapListType[] {
  const list = [...mapList]
  const setUid = function (item) {
    item.uuid = uuid()
    if (Array.isArray(item.children)) {
      item.children.forEach((child) => {
        child.pid = item.uuid
        setUid(child)
      })
    }
  }
  list.forEach((item) => {
    setUid(item)
  })
  return list
}
