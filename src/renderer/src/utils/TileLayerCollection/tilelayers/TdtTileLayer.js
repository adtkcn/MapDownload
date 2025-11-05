import BaseTileLayer from './BaseTileLayer'
import params from './../param'

class TDTTileLayer extends BaseTileLayer {
  constructor(options = {}) {
    const style = options.style || 'TDT_Normal'
    options.urlTemplate = params().TDT[style].url
    super(style, options)
  }
}

export default TDTTileLayer
