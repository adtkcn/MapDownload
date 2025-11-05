import { getKeys } from '@renderer/utils/mapKey.js'

export default function getParams() {
  const { mapboxKey, tdtKey } = getKeys()

  const params = {
    TDT: {
      TDT_Normal: {
        url: 'https://t0.tianditu.gov.cn/DataServer?T=vec_w&X={x}&Y={y}&L={z}&tk=' + tdtKey
      },
      TDT_Normal_Label: {
        url: 'https://t0.tianditu.gov.cn/DataServer?T=cva_w&X={x}&Y={y}&L={z}&tk=' + tdtKey
      },
      TDT_Satellite: {
        url: 'https://t0.tianditu.gov.cn/DataServer?T=img_w&X={x}&Y={y}&L={z}&tk=' + tdtKey
      },
      TDT_Satellite_Label: {
        url: 'https://t0.tianditu.gov.cn/DataServer?T=cia_w&X={x}&Y={y}&L={z}&tk=' + tdtKey
      },

      TDT_Terrain: {
        url: 'https://t0.tianditu.gov.cn/DataServer?T=ter_w&X={x}&Y={y}&L={z}&tk=' + tdtKey
      },

      TDT_Terrain_Label: {
        url: 'https://t0.tianditu.gov.cn/DataServer?T=cta_w&X={x}&Y={y}&L={z}&tk=' + tdtKey
      }
    },
    GEOQ: {
      GEOQ_Colour: {
        url: 'https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer/tile/{z}/{y}/{x}'
      },
      GEOQ_Gray: {
        url: 'https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineStreetGray/MapServer/tile/{z}/{y}/{x}'
      },
      GEOQ_Midnightblue: {
        url: 'https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineStreetPurplishBlue/MapServer/tile/{z}/{y}/{x}'
      }
    },
    Google: {
      Google_Normal: {
        url: 'https://gac-geo.googlecnapps.cn/maps/vt?lyrs=m&x={x}&y={y}&z={z}'
      },
      Google_Satellite: {
        url: 'https://gac-geo.googlecnapps.cn/maps/vt?lyrs=s&x={x}&y={y}&z={z}'
      },
      Google_Satellite_Label: {
        url: 'https://gac-geo.googlecnapps.cn/maps/vt?lyrs=s,m&gl=CN&x={x}&y={y}&z={z}'
      }
    },
    Amap: {
      Amap_Normal: {
        url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}'
      },
      Amap_Satellite: {
        url: 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}'
      },
      Amap_Satellite_Label: {
        url: 'https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}'
      },
      Amap_NormalEn: {
        url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=en&size=1&scale=1&style=8&x={x}&y={y}&z={z}'
      }
    },
    Tencent: {
      Tencent_Normal: {
        url: 'https://rt0.map.gtimg.com/realtimerender?z={z}&x={x}&y={y}&type=vector&style=0'
      },
      Tencent_Satellite: {
        url: 'https://p0.map.gtimg.com/sateTiles/{z}/{m}/{n}/{x}_{y}.jpg'
      },
      Tencent_Satellite_Label: {
        url: 'https://rt3.map.gtimg.com/tile?z={z}&x={x}&y={y}&type=vector&styleid=3&version=117'
      },
      Tencent_Terrain: {
        url: 'https://p0.map.gtimg.com/demTiles/{z}/{m}/{n}/{x}_{y}.jpg'
      },
      Tencent_Terrain_Label: {
        url: 'https://rt3.map.gtimg.com/tile?z={z}&x={x}&y={y}&type=vector&styleid=3&version=117'
      }
    },
    Osm: {
      Osm_Normal: {
        url: 'https://tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png'
      },
      Osm_Bike: {
        url: 'https://c.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=6170aad10dfd42a38d4d8c709a536f38'
      },
      Osm_Transport: {
        url: 'https://c.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=6170aad10dfd42a38d4d8c709a536f38'
      },
      Osm_Humanitarian: {
        url: 'https://tile-b.openstreetmap.fr/hot/{z}/{x}/{y}.png'
      }
    },
    CartoDb: {
      CartoDb_Dark: {
        url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
      },
      CartoDb_Light: {
        url: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
      }
    },
    Mapbox: {
      Mapbox_Streets: {
        url:
          'https://a.tiles.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token=' + mapboxKey
      },
      Mapbox_Dark: {
        url: 'https://a.tiles.mapbox.com/v4/mapbox.dark/{z}/{x}/{y}.png?access_token=' + mapboxKey
      },
      Mapbox_LightDark: {
        url: 'https://a.tiles.mapbox.com/v3/spatialdev.map-c9z2cyef/{z}/{x}/{y}.png'
      },
      Mapbox_Satellite: {
        url:
          'https://a.tiles.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.png?access_token=' + mapboxKey
      },
      Mapbox_Light: {
        url: 'https://a.tiles.mapbox.com/v4/mapbox.light/{z}/{x}/{y}.png?access_token=' + mapboxKey
      },
      Mapbox_Emerald: {
        url:
          'https://a.tiles.mapbox.com/v4/mapbox.emerald/{z}/{x}/{y}.png?access_token=' + mapboxKey
      },
      Mapbox_White: {
        url:
          'https://a.tiles.mapbox.com/v4/examples.map-h67hf2ic/{z}/{x}/{y}.png?access_token=' +
          mapboxKey
      },
      Mapbox_Red: {
        url:
          'https://a.tiles.mapbox.com/v4/examples.map-h68a1pf7,examples.npr-stations/{z}/{x}/{y}.png?access_token=' +
          mapboxKey
      },
      Mapbox_Outdoors: {
        url:
          'https://a.tiles.mapbox.com/v4/mapbox.outdoors/{z}/{x}/{y}.png?access_token=' + mapboxKey
      },
      Mapbox_StreetsSatellite: {
        url:
          'https://a.tiles.mapbox.com/v4/mapbox.streets-satellite/{z}/{x}/{y}.png?access_token=' +
          mapboxKey
      },
      Mapbox_Comic: {
        url: 'https://a.tiles.mapbox.com/v4/mapbox.comic/{z}/{x}/{y}.png?access_token=' + mapboxKey
      },
      Mapbox_Building: {
        url: 'https://b.tiles.mapbox.com/v3/osmbuildings.kbpalbpk/{z}/{x}/{y}.png'
      }
    },
    Baidu: {
      Baidu_Normal: {
        // url: 'https://api0.map.bdimg.com/customimage/tile?&x=3&y=1&z=5&scale=1&customid=normal',
        url: 'https://gss{s}.bdstatic.com/8bo_dTSlRsgBo1vgoIiO_jowehsv/tile/?qt=tile&x={x}&y={y}&z={z}&styles=pl&scaler=1&udt=20170927'
      },
      Baidu_Satellite: {
        url: 'https://shangetu{s}.map.bdimg.com/it/u=x={x};y={y};z={z};v=009;type=sate&fm=46'
      },
      Baidu_midnight: {
        url: 'https://api{s}.map.bdimg.com/customimage/tile?&x={x}&y={y}&z={z}&scale=1&customid=midnight'
      },
      Baidu_light: {
        url: 'https://api{s}.map.bdimg.com/customimage/tile?&x={x}&y={y}&z={z}&scale=1&customid=light'
      },
      Baidu_dark: {
        url: 'https://api{s}.map.bdimg.com/customimage/tile?&x={x}&y={y}&z={z}&scale=1&customid=dark'
      },
      Baidu_redalert: {
        url: 'https://api{s}.map.bdimg.com/customimage/tile?&x={x}&y={y}&z={z}&scale=1&customid=redalert'
      },
      Baidu_googlelite: {
        url: 'https://api{s}.map.bdimg.com/customimage/tile?&x={x}&y={y}&z={z}&scale=1&customid=googlelite'
      },
      Baidu_grassgreen: {
        url: 'https://api{s}.map.bdimg.com/customimage/tile?&x={x}&y={y}&z={z}&scale=1&customid=grassgreen'
      },
      Baidu_pink: {
        url: 'https://api{s}.map.bdimg.com/customimage/tile?&x={x}&y={y}&z={z}&scale=1&customid=pink'
      },
      Baidu_darkgreen: {
        url: 'https://api{s}.map.bdimg.com/customimage/tile?&x={x}&y={y}&z={z}&scale=1&customid=darkgreen'
      },
      Baidu_bluish: {
        url: 'https://api{s}.map.bdimg.com/customimage/tile?&x={x}&y={y}&z={z}&scale=1&customid=bluish'
      },
      Baidu_grayscale: {
        url: 'https://api{s}.map.bdimg.com/customimage/tile?&x={x}&y={y}&z={z}&scale=1&customid=grayscale'
      },
      Baidu_hardedge: {
        url: 'https://api{s}.map.bdimg.com/customimage/tile?&x={x}&y={y}&z={z}&scale=1&customid=hardedge'
      }
    }
  }

  return params
}
