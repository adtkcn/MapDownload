import BaseTileLayer from './BaseTileLayer'
import params from './../param'

class AmapTileLayer extends BaseTileLayer {
  constructor(id, options = {}) {
    const style = options.style || 'Amap_Normal'
    options.urlTemplate = params().Amap[style].url
    super(id, options)
  }
}

export default AmapTileLayer
