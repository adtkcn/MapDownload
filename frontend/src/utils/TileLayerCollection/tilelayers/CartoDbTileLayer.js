import BaseTileLayer from './BaseTileLayer'
import params from './../param'

class CartoDbTileLayer extends BaseTileLayer {
  constructor(id, options = {}) {
    const style = options.style || 'CartoDb_Light'
    options.urlTemplate = params().CartoDb[style].url
    super(id, options)
  }
}

export default CartoDbTileLayer
