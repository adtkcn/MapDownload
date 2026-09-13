package tile

import "math"

// 百度 BD-09 投影参数
var (
	llBand = []float64{75, 60, 45, 30, 15, 0}
	ll2MC  = [][]float64{
		{
			-0.0015702102444, 111320.7020616939, 1704480524535203, -10338987376042340, 26112667856603880,
			-35149669176653700, 26595700718403920, -10725012454188240, 1800819912950474, 82.5,
		},
		{
			0.0008277824516172526, 111320.7020463578, 647795574.6671607, -4082003173.641316, 10774905663.51142,
			-15171875531.51559, 12053065338.62167, -5124939663.577472, 913311935.9512032, 67.5,
		},
		{
			0.00337398766765, 111320.7020202162, 4481351.045890365, -23393751.19931662, 79682215.47186455,
			-115964993.2797253, 97236711.15602145, -43661946.33752821, 8477230.501135234, 52.5,
		},
		{
			0.00220636496208, 111320.7020209128, 51751.86112841131, 3796837.749470245, 992013.7397791013,
			-1221952.21711287, 1340652.697009075, -620943.6990984312, 144416.9293806241, 37.5,
		},
		{
			-0.0003441963504368392, 111320.7020576856, 278.2353980772752, 2485758.690035394, 6070.750963243378,
			54821.18345352118, 9540.606633304236, -2710.55326746645, 1405.483844121726, 22.5,
		},
		{
			-0.0003218135878613132, 111320.7020701615, 0.00369383431289, 823725.6402795718, 0.46104986909093,
			2351.343141331292, 1.58060784298199, 8.77738589078284, 0.37238884252424, 7.45,
		},
	}
)

// BaiduLngLatToTile BD-09 经纬度转百度瓦片坐标
func BaiduLngLatToTile(lng, lat float64, zoom int) (int, int) {
	mcX, mcY := convertLL2MC(lng, lat)
	return convertMC2Tile(mcX, mcY, zoom)
}

// convertLL2MC BD-09 经纬度转百度墨卡托
func convertLL2MC(lng, lat float64) (float64, float64) {
	tempLat := math.Max(math.Min(lat, 74), -74)
	tempLng := lng

	var params []float64
	for i := range llBand {
		if tempLat >= llBand[i] {
			params = ll2MC[i]
			break
		}
	}
	if params == nil {
		for i := len(llBand) - 1; i >= 0; i-- {
			if tempLat <= -llBand[i] {
				params = ll2MC[i]
				break
			}
		}
	}
	if params == nil {
		return 0, 0
	}

	x := math.Abs(tempLng)
	y := math.Abs(tempLat)

	factorX := params[0] + params[1]*x
	factorY := y / params[9]
	factorY = params[2] +
		params[3]*factorY +
		params[4]*math.Pow(factorY, 2) +
		params[5]*math.Pow(factorY, 3) +
		params[6]*math.Pow(factorY, 4) +
		params[7]*math.Pow(factorY, 5) +
		params[8]*math.Pow(factorY, 6)

	mcX := factorX
	mcY := factorY
	if tempLng < 0 {
		mcX = -mcX
	}
	if tempLat < 0 {
		mcY = -mcY
	}
	return mcX, mcY
}

// convertMC2Tile 百度墨卡托转瓦片坐标
func convertMC2Tile(mcX, mcY float64, zoom int) (int, int) {
	resolution := math.Pow(2, float64(18-zoom))
	return int(math.Floor(mcX/resolution/256)), int(math.Floor(mcY/resolution/256))
}
