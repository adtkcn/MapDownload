package tile

import "math"

// Bounds 某个层级下需要下载的瓦片范围
type Bounds struct {
	X0, Y0, X1, Y1 int
}

// LngLatToTile Web 墨卡托：经纬度转瓦片坐标
func LngLatToTile(lng, lat float64, z int) (int, int) {
	n := math.Pow(2, float64(z))
	x := int(math.Floor((lng + 180.0) / 360.0 * n))
	latRad := lat * math.Pi / 180.0
	y := int(math.Floor((1 - math.Log(math.Tan(latRad)+1/math.Cos(latRad))/math.Pi) / 2 * n))
	return x, y
}

// TileBounds 计算指定层级的瓦片范围
func TileBounds(extent [4]float64, z int, isBaidu bool) Bounds {
	minLng, minLat, maxLng, maxLat := extent[0], extent[1], extent[2], extent[3]

	if isBaidu {
		nwX, nwY := BaiduLngLatToTile(minLng, maxLat, z)
		seX, seY := BaiduLngLatToTile(maxLng, minLat, z)
		return Bounds{
			X0: min(nwX, seX), Y0: min(nwY, seY),
			X1: max(nwX, seX), Y1: max(nwY, seY),
		}
	}

	sx, sy := LngLatToTile(minLng, maxLat, z)
	ex, ey := LngLatToTile(maxLng, minLat, z)
	maxTile := int(math.Pow(2, float64(z))) - 1
	return Bounds{
		X0: clamp(sx, 0, maxTile), Y0: clamp(sy, 0, maxTile),
		X1: clamp(ex, 0, maxTile), Y1: clamp(ey, 0, maxTile),
	}
}

func clamp(value, minValue, maxValue int) int {
	if value < minValue {
		return minValue
	}
	if value > maxValue {
		return maxValue
	}
	return value
}
