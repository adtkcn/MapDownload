package tile

import (
	"testing"

	"map/internal/model"
)

// 对照数据来自 Electron 版本的实现（src/shared/tileRange.ts、src/shared/tileUrl.ts），
// 用于确保迁移后数值行为完全一致。
var testExtent = [4]float64{116.0, 39.6, 117.0, 40.6}

func TestTileBoundsMercator(t *testing.T) {
	cases := []struct {
		z, x0, y0, x1, y1 int
	}{
		{1, 1, 0, 1, 0},
		{5, 26, 12, 26, 12},
		{10, 841, 385, 844, 389},
		{15, 26942, 12333, 27033, 12452},
		{18, 215540, 98669, 216268, 99621},
	}
	for _, c := range cases {
		got := TileBounds(testExtent, c.z, false)
		if got.X0 != c.x0 || got.Y0 != c.y0 || got.X1 != c.x1 || got.Y1 != c.y1 {
			t.Errorf("z=%d 墨卡托范围 = {%d %d %d %d}, 期望 {%d %d %d %d}",
				c.z, got.X0, got.Y0, got.X1, got.Y1, c.x0, c.y0, c.x1, c.y1)
		}
	}
}

func TestTileBoundsBaidu(t *testing.T) {
	cases := []struct {
		z, x0, y0, x1, y1 int
	}{
		{3, 1, 0, 1, 0},
		{8, 49, 18, 49, 18},
		{13, 1576, 583, 1589, 601},
		{18, 50442, 18673, 50877, 19240},
	}
	for _, c := range cases {
		got := TileBounds(testExtent, c.z, true)
		if got.X0 != c.x0 || got.Y0 != c.y0 || got.X1 != c.x1 || got.Y1 != c.y1 {
			t.Errorf("z=%d 百度范围 = {%d %d %d %d}, 期望 {%d %d %d %d}",
				c.z, got.X0, got.Y0, got.X1, got.Y1, c.x0, c.y0, c.x1, c.y1)
		}
	}
}

func amapRule() model.TileUrlRule {
	return model.TileUrlRule{
		Template:   "https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
		Subdomains: []any{1, 3, 4},
	}
}

func tencentRule() model.TileUrlRule {
	return model.TileUrlRule{
		Template: "https://p0.map.gtimg.com/sateTiles/{z}/{m}/{n}/{x}_{y}.jpg",
		FlipY:    true,
	}
}

func tdtRule() model.TileUrlRule {
	return model.TileUrlRule{
		Template: "https://t0.tianditu.gov.cn/DataServer?T=vec_w&X={x}&Y={y}&L={z}",
		Hosts:    []string{"t0.tianditu.gov.cn", "t1.tianditu.gov.cn", "t2.tianditu.gov.cn"},
	}
}

func TestBuildURL(t *testing.T) {
	cases := []struct {
		name   string
		rule   model.TileUrlRule
		z, x, y int
		offset int
		want   string
	}{
		{
			"高德 z10", amapRule(), 10, 841, 385, 0,
			"https://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x=841&y=385&z=10",
		},
		{
			"高德 z10 相邻瓦片换子域", amapRule(), 10, 842, 386, 0,
			"https://webrd03.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x=842&y=386&z=10",
		},
		{
			"高德 z18", amapRule(), 18, 215540, 98669, 0,
			"https://webrd03.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x=215540&y=98669&z=18",
		},
		{
			"腾讯 TMS 翻转 z10", tencentRule(), 10, 841, 385, 0,
			"https://p0.map.gtimg.com/sateTiles/10/52/39/841_638.jpg",
		},
		{
			"腾讯 TMS 翻转 z13", tencentRule(), 13, 1576, 583, 0,
			"https://p0.map.gtimg.com/sateTiles/13/98/475/1576_7608.jpg",
		},
		{
			"天地图主机轮转 offset0", tdtRule(), 10, 841, 385, 0,
			"https://t2.tianditu.gov.cn/DataServer?T=vec_w&X=841&Y=385&L=10",
		},
		{
			"天地图主机轮转 offset1", tdtRule(), 10, 841, 385, 1,
			"https://t0.tianditu.gov.cn/DataServer?T=vec_w&X=841&Y=385&L=10",
		},
	}

	for _, c := range cases {
		if got := BuildURL(c.rule, c.z, c.x, c.y, c.offset); got != c.want {
			t.Errorf("%s BuildURL =\n%s\n期望\n%s", c.name, got, c.want)
		}
	}
}

func TestHostCount(t *testing.T) {
	if got := HostCount(amapRule()); got != 3 {
		t.Errorf("高德 HostCount = %d, 期望 3", got)
	}
	if got := HostCount(tdtRule()); got != 3 {
		t.Errorf("天地图 HostCount = %d, 期望 3", got)
	}
	if got := HostCount(tencentRule()); got != 1 {
		t.Errorf("腾讯 HostCount = %d, 期望 1", got)
	}
}
