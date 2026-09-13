package model

// TileUrlRule 瓦片 URL 生成规则
//
// 与 maptalks TileLayer.getTileUrl 行为保持一致：
//   - {x} {y} {z}：瓦片坐标
//   - {s}：子域名，取 subdomains[(x+y) % len]
//   - {m} {n}：腾讯系图层专用，x/16 与 y/16
//   - 其余占位符从 CustomTags 取值
type TileUrlRule struct {
	Template string `json:"template"`
	// Subdomains 元素既可能是数字也可能是字符串，用 any 承载
	Subdomains []any          `json:"subdomains,omitempty"`
	Hosts      []string       `json:"hosts,omitempty"`
	FlipY      bool           `json:"flipY,omitempty"`
	CustomTags map[string]any `json:"customTags,omitempty"`
}

// TileSource 单个待下载图层
type TileSource struct {
	LayerID    string      `json:"layerId"`
	Projection string      `json:"projection"`
	URLRule    TileUrlRule `json:"urlRule"`
}

// DownloadJob 一次完整的下载任务
type DownloadJob struct {
	RootPath         string       `json:"rootPath"`
	Sources          []TileSource `json:"sources"`
	Extent           [4]float64   `json:"extent"`
	ZMin             int          `json:"zMin"`
	ZMax             int          `json:"zMax"`
	Concurrency      int          `json:"concurrency"`
	WriteConcurrency int          `json:"writeConcurrency"`
	MaxRetry         int          `json:"maxRetry"`
	SkipExist        bool         `json:"skipExist"`
	SocketsPerHost   int          `json:"socketsPerHost"`
	TimeoutMs        int          `json:"timeoutMs"`
	Referer          string       `json:"referer,omitempty"`
}

// TaskSummary 队列中单个任务的进度快照
type TaskSummary struct {
	TaskID      string `json:"taskId"`
	LayerID     string `json:"layerId"`
	State       string `json:"state"`
	Total       int64  `json:"total"`
	Success     int64  `json:"success"`
	Failed      int64  `json:"failed"`
	Skipped     int64  `json:"skipped"`
	Retried     int64  `json:"retried"`
	InFlight    int64  `json:"inFlight"`
	Bytes       int64  `json:"bytes"`
	Concurrency int    `json:"concurrency"`
	// QueuePos：相对活动任务的位置，0=正在运行/暂停，>0 为等待中的排队序号
	QueuePos int `json:"queuePos"`
}

// Progress 下载进度（多任务队列快照）
type Progress struct {
	TaskID  string        `json:"taskId"`
	LayerID string        `json:"layerId"`
	State   string        `json:"state"`
	Total   int64         `json:"total"`
	Success int64         `json:"success"`
	Failed  int64         `json:"failed"`
	Skipped int64         `json:"skipped"`
	Retried int64         `json:"retried"`
	InFlight int64        `json:"inFlight"`
	Bytes   int64         `json:"bytes"`
	Tasks   []TaskSummary `json:"tasks"`
}
