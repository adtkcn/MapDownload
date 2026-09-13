package downloader

import (
	"context"
	"errors"
	"fmt"
	"io"
	"math"
	"math/rand"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"map/internal/model"
	"map/internal/tile"
)

const (
	// 列数不足以喂满并发时的分片粒度
	fallbackRowsPerShard = 256
	// 列数充足时的分片粒度：短列仍是整列，超长列必须拆分以防长尾
	maxRowsPerShard = 512
	shardsPerWorker = 4
	minSocketsPerHost = 8
	defaultTimeoutMs = 20_000
	progressInterval  = 250 * time.Millisecond
)

// ProgressFunc 进度回调
type ProgressFunc func(model.Progress)

type shard struct {
	source   model.TileSource
	layerDir string
	z, x     int
	y0, y1   int
}

// gate 暂停门：未暂停时立即通过，暂停时阻塞直到恢复或取消
type gate struct {
	mu     sync.Mutex
	paused bool
	ch     chan struct{}
}

func (g *gate) wait(ctx context.Context) error {
	g.mu.Lock()
	paused, ch := g.paused, g.ch
	g.mu.Unlock()
	if !paused {
		return nil
	}
	select {
	case <-ch:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (g *gate) pause() {
	g.mu.Lock()
	defer g.mu.Unlock()
	if !g.paused {
		g.paused = true
		g.ch = make(chan struct{})
	}
}

func (g *gate) resume() {
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.paused {
		g.paused = false
		close(g.ch)
		g.ch = nil
	}
}

// task 单个下载任务的运行态，所有状态彼此独立，支持多任务排队
type task struct {
	id     string
	job    model.DownloadJob
	ctx    context.Context
	cancel context.CancelFunc
	gate   *gate

	total    atomic.Int64
	success  atomic.Int64
	failed   atomic.Int64
	skipped  atomic.Int64
	retried  atomic.Int64
	inFlight atomic.Int64
	bytes    atomic.Int64
	layer    atomic.Value

	mu           sync.Mutex
	state        string // queued | running | paused | done | stopped
	concurrency  int
	activeWorkers int32 // 当前真实在跑的 worker 数
	target       int32 // 目标并发，worker 在每轮开头据此自愿退出
	wg           sync.WaitGroup

	// run 期间可用的句柄，供运行时调整并发数复用
	client *http.Client
	sink   *Sink

	// 列/分片游标（按需生产，支持运行时增减 worker，无需一次性展开全部瓦片）
	cmu     sync.Mutex
	ci      int
	cz      int
	cx      int
	yCursor int
	cBounds tile.Bounds
	cDone   bool
}

func (t *task) setState(s string) {
	t.mu.Lock()
	t.state = s
	t.mu.Unlock()
}

func (t *task) getState() string {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.state
}

func (t *task) targetConc() int {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.concurrency
}

// spawnWorker 启动一个下载 worker：每轮先比对目标并发，超额则自愿退出，
// 否则从列游标领取下一片分片处理。收到 ctx 取消或任务结束时退出。
func (t *task) spawnWorker(m *Manager, client *http.Client, sink *Sink, rows int) {
	atomic.AddInt32(&t.activeWorkers, 1)
	t.wg.Add(1)
	go func() {
		defer t.wg.Done()
		defer atomic.AddInt32(&t.activeWorkers, -1)
		for {
			if atomic.LoadInt32(&t.activeWorkers) > atomic.LoadInt32(&t.target) {
				return
			}
			select {
			case <-t.ctx.Done():
				return
			default:
			}
			s := t.nextShard(t.job, rows)
			if s == nil {
				return
			}
			m.processShard(t, t.job, client, sink, s)
		}
	}()
}

func (t *task) startWorkers(m *Manager, client *http.Client, sink *Sink, rows, n int) {
	for i := 0; i < n; i++ {
		t.spawnWorker(m, client, sink, rows)
	}
}

// advanceColumn 把 (ci,cz,cx) 步进到下一个有瓦片的列；无更多列返回 false
func (t *task) advanceColumn(job model.DownloadJob) bool {
	for {
		if t.cx <= t.cBounds.X1 {
			return true
		}
		t.cz++
		if t.cz > job.ZMax {
			t.ci++
			if t.ci >= len(job.Sources) {
				return false
			}
			t.cz = job.ZMin
		}
		b := tile.TileBounds(job.Extent, t.cz, job.Sources[t.ci].Projection == "BAIDU")
		t.cBounds = b
		t.cx = b.X0
		if b.X1 < b.X0 {
			continue
		}
		return true
	}
}

// nextShard 以 (source,z,x,列内 y 段) 为粒度生产下一片待下载分片；遍历完返回 nil
func (t *task) nextShard(job model.DownloadJob, rows int) *shard {
	t.cmu.Lock()
	defer t.cmu.Unlock()
	if t.cDone {
		return nil
	}
	if t.cx > t.cBounds.X1 || t.yCursor > t.cBounds.Y1 {
		if !t.advanceColumn(job) {
			t.cDone = true
			return nil
		}
		t.yCursor = t.cBounds.Y0
	}
	y0 := t.yCursor
	y1 := y0 + rows - 1
	if y1 > t.cBounds.Y1 {
		y1 = t.cBounds.Y1
	}
	t.yCursor = y1 + 1
	if t.yCursor > t.cBounds.Y1 {
		t.cx++ // 本列分片已发完，进入下一列
	}
	return &shard{
		source:   job.Sources[t.ci],
		layerDir: filepath.Join(job.RootPath, safeDirName(job.Sources[t.ci].LayerID)),
		z:        t.cz,
		x:        t.cx,
		y0:       y0,
		y1:       y1,
	}
}

// Manager 瓦片下载管理器（多任务队列）
//
// 调度策略：按 (z, x) 列分片，worker 领取分片后纵向遍历 y。
// 多任务排队依次执行，同一时刻只有一个任务处于 running/paused。
type Manager struct {
	emit ProgressFunc
	log  func(string)

	mu    sync.Mutex
	tasks map[string]*task
	order []string // 提交顺序，用于队列位置展示
}

func NewManager(emit ProgressFunc, log func(string)) *Manager {
	if log == nil {
		log = func(string) {}
	}
	return &Manager{emit: emit, log: log, tasks: make(map[string]*task)}
}

func newTaskID() string {
	return fmt.Sprintf("t-%d-%d", time.Now().UnixNano(), rand.Int63())
}

// Start 提交一个下载任务，返回任务 ID。可重复调用，任务将排队依次执行
func (m *Manager) Start(job model.DownloadJob) (string, error) {
	id := newTaskID()
	conc := job.Concurrency
	if conc < 1 {
		conc = 1
	}
	ctx, cancel := context.WithCancel(context.Background())
	t := &task{
		id:          id,
		job:         job,
		ctx:         ctx,
		cancel:      cancel,
		gate:        &gate{},
		state:       "queued",
		concurrency: conc,
	}
	t.total.Store(countTiles(job))

	m.mu.Lock()
	m.tasks[id] = t
	m.order = append(m.order, id)
	m.mu.Unlock()

	m.schedule()
	return id, nil
}

// schedule 认领队列中第一个排队任务并运行（按提交顺序，不重排）
func (m *Manager) schedule() {
	m.mu.Lock()
	var next *task
	for _, id := range m.order {
		if t := m.tasks[id]; t.getState() == "queued" {
			next = t
			break
		}
	}
	if next == nil {
		m.mu.Unlock()
		return
	}
	next.setState("running")
	m.mu.Unlock()
	go m.run(next)
}

// Pause 暂停指定任务（仅运行中的任务可暂停）
func (m *Manager) Pause(id string) {
	t := m.getTask(id)
	if t == nil || t.getState() != "running" {
		return
	}
	t.gate.pause()
	t.setState("paused")
	m.emitSnapshot()
}

// Resume 继续指定任务
func (m *Manager) Resume(id string) {
	t := m.getTask(id)
	if t == nil || t.getState() != "paused" {
		return
	}
	t.gate.resume()
	t.setState("running")
	m.emitSnapshot()
}

// Stop 停止指定任务。排队中的任务直接标记停止，运行/暂停中的任务取消上下文
func (m *Manager) Stop(id string) {
	t := m.getTask(id)
	if t == nil {
		return
	}
	st := t.getState()
	t.gate.resume()
	if st == "queued" {
		t.setState("stopped")
		m.emitSnapshot()
		return
	}
	if st == "running" || st == "paused" {
		t.cancel()
	}
}

// SetConcurrency 运行时调整指定任务的并发 worker 数
func (m *Manager) SetConcurrency(id string, n int) error {
	if n < 1 {
		n = 1
	}
	t := m.getTask(id)
	if t == nil {
		return fmt.Errorf("任务不存在: %s", id)
	}
	st := t.getState()
	if st == "queued" {
		t.mu.Lock()
		t.concurrency = n
		t.mu.Unlock()
		m.emitSnapshot()
		return nil
	}
	if st != "running" {
		return fmt.Errorf("任务非运行状态，无法调整并发（当前 %s）", st)
	}
	cur := int(atomic.LoadInt32(&t.activeWorkers))
	// 仅更新目标值：升并发时补 spawn worker，降并发时多余 worker 在下一轮自愿退出
	atomic.StoreInt32(&t.target, int32(n))
	if n > cur {
		rows := planRowsPerShard(t.job)
		t.startWorkers(m, t.client, t.sink, rows, n-cur)
	}
	t.mu.Lock()
	t.concurrency = n
	t.mu.Unlock()
	m.emitSnapshot()
	return nil
}

func (m *Manager) getTask(id string) *task {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.tasks[id]
}

func (m *Manager) run(t *task) {
	defer m.schedule()

	client := NewClient(resolveSocketsPerHost(t.job))
	defer client.CloseIdleConnections()
	sink := NewSink(t.job.WriteConcurrency)

	t.client = client
	t.sink = sink

	// 初始化列游标（从第一个源的 ZMin 起步）
	t.cmu.Lock()
	t.ci = 0
	t.cz = t.job.ZMin
	b := tile.TileBounds(t.job.Extent, t.cz, t.job.Sources[0].Projection == "BAIDU")
	t.cBounds = b
	t.cx = b.X0
	t.yCursor = b.Y0
	t.cDone = false
	t.cmu.Unlock()

	rows := planRowsPerShard(t.job)
	atomic.StoreInt32(&t.target, int32(t.concurrency))
	t.mu.Lock()
	conc := t.concurrency
	t.mu.Unlock()
	t.startWorkers(m, client, sink, rows, conc)

	stopped := make(chan struct{})
	var stopOnce sync.Once
	go func() {
		ticker := time.NewTicker(progressInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				m.emitSnapshot()
			case <-stopped:
				return
			case <-t.ctx.Done():
				return
			}
		}
	}()

	t.wg.Wait()
	stopOnce.Do(func() { close(stopped) })

	t.mu.Lock()
	if t.ctx.Err() != nil && t.getState() != "paused" {
		t.state = "stopped"
	} else {
		t.state = "done"
	}
	t.mu.Unlock()
	m.emitSnapshot()
}

func (m *Manager) processShard(
	t *task,
	job model.DownloadJob,
	client *http.Client,
	sink *Sink,
	current *shard,
) {
	t.layer.Store(current.source.LayerID)

	dir := filepath.Join(current.layerDir, strconv.Itoa(current.z), strconv.Itoa(current.x))
	if err := sink.EnsureDir(dir); err != nil {
		m.log(fmt.Sprintf("创建目录失败 %s: %v", dir, err))
		return
	}

	var existing map[string]struct{}
	if job.SkipExist {
		existing = sink.AcquireColumn(dir)
		defer sink.ReleaseColumn(dir)
	}

	for y := current.y0; y <= current.y1; y++ {
		if t.ctx.Err() != nil {
			return
		}
		if err := t.gate.wait(t.ctx); err != nil {
			return
		}

		// 按图源实际返回格式命名：跳过该 y 任意已知扩展名已存在的瓦片（断点续传）
		if existing != nil && tileExistsForY(existing, y) {
			t.skipped.Add(1)
			continue
		}
		m.downloadOne(t, job, client, sink, current, y, dir)
	}
}

func (m *Manager) downloadOne(
	t *task,
	job model.DownloadJob,
	client *http.Client,
	sink *Sink,
	current *shard,
	y int,
	dir string,
) {
	maxRetry := job.MaxRetry
	if maxRetry < 0 {
		maxRetry = 0
	}

	for attempt := 0; attempt <= maxRetry; attempt++ {
		if t.ctx.Err() != nil {
			return
		}
		// 重试时通过 hostOffset 切换到下一个域名
		url := tile.BuildURL(current.source.URLRule, current.z, current.x, y, attempt)

		t.inFlight.Add(1)
		n, err := m.fetchOne(t, job, client, sink, url, dir, y)
		t.inFlight.Add(-1)

		if err == nil {
			t.success.Add(1)
			t.bytes.Add(n)
			return
		}
		if attempt == maxRetry {
			t.failed.Add(1)
			m.log(fmt.Sprintf("下载失败 %s: %v", url, err))
			return
		}

		t.retried.Add(1)
		select {
		case <-t.ctx.Done():
			return
		case <-time.After(backoffDelay(attempt)):
		}
	}
}

func (m *Manager) fetchOne(
	t *task,
	job model.DownloadJob,
	client *http.Client,
	sink *Sink,
	url, dir string,
	y int,
) (int64, error) {
	timeout := job.TimeoutMs
	if timeout <= 0 {
		timeout = defaultTimeoutMs
	}
	reqCtx, cancel := context.WithTimeout(t.ctx, time.Duration(timeout)*time.Millisecond)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, url, nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("User-Agent", randomUserAgent())
	req.Header.Set("Accept", "image/avif,image/webp,image/apng,image/*,*/*;q=0.8")
	req.Header.Set("Accept-Encoding", "identity")
	req.Header.Set("X-Forwarded-For", randomForwardedFor())
	if job.Referer != "" {
		req.Header.Set("Referer", job.Referer)
	}

	resp, err := client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// 读完响应体，连接才能回到 keepAlive 池
		_, _ = io.Copy(io.Discard, resp.Body)
		return 0, fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	if ct := strings.ToLower(resp.Header.Get("Content-Type")); strings.Contains(ct, "text/html") {
		_, _ = io.Copy(io.Discard, resp.Body)
		return 0, errors.New("返回了 HTML 错误页")
	}

	// 按图源实际返回格式命名：扩展名由响应 Content-Type（兜底取 URL 路径）决定
	ext := extFromContentType(resp.Header.Get("Content-Type"), url)
	dest := filepath.Join(dir, strconv.Itoa(y)+ext)

	return sink.Write(resp.Body, dest)
}

// contentTypeExt 常见图片 Content-Type 到文件扩展名的映射
var contentTypeExt = map[string]string{
	"image/png":                ".png",
	"image/jpeg":               ".jpg",
	"image/jpg":                ".jpg",
	"image/webp":               ".webp",
	"image/gif":                ".gif",
	"image/bmp":                ".bmp",
	"image/x-bmp":              ".bmp",
	"image/avif":               ".avif",
	"image/tiff":               ".tiff",
	"application/octet-stream": ".bin",
}

// candidateExts 断点续传跳过时已存在文件的候选扩展名
var candidateExts = []string{".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".avif"}

// extFromContentType 根据响应 Content-Type（找不到则用 URL 路径后缀）推断扩展名，未知默认 .png
func extFromContentType(ct, rawURL string) string {
	ct = strings.TrimSpace(strings.ToLower(ct))
	if ext, ok := contentTypeExt[ct]; ok {
		return ext
	}
	// 兜底：从 URL 路径取扩展名
	if i := strings.LastIndex(rawURL, "."); i >= 0 {
		rest := rawURL[i:]
		if q := strings.IndexByte(rest, '?'); q >= 0 {
			rest = rest[:q]
		}
		if len(rest) <= 5 && rest != "." {
			return strings.ToLower(rest)
		}
	}
	return ".png"
}

// tileExistsForY 判断该 y 的瓦片是否已有任意已知扩展名存在于磁盘（用于断点续传跳过）
func tileExistsForY(existing map[string]struct{}, y int) bool {
	base := strconv.Itoa(y)
	for _, ext := range candidateExts {
		if _, ok := existing[base+ext]; ok {
			return true
		}
	}
	return false
}

// emitSnapshot 构建整个队列的进度快照并推送（按提交顺序）
func (m *Manager) emitSnapshot() {
	m.mu.Lock()
	summaries := make([]model.TaskSummary, 0, len(m.order))
	activeIdx := -1
	for i, id := range m.order {
		if st := m.tasks[id].getState(); st == "running" || st == "paused" {
			activeIdx = i
			break
		}
	}
	var active *task
	for i, id := range m.order {
		t := m.tasks[id]
		pos := i
		if activeIdx >= 0 {
			pos = i - activeIdx
		}
		st := t.getState()
		// running/paused 回显真实 worker 数；其余回显设定值（便于调整排队任务的并发）
		conc := int(atomic.LoadInt32(&t.activeWorkers))
		if st == "queued" || st == "done" || st == "stopped" {
			conc = t.targetConc()
		}
		summaries = append(summaries, model.TaskSummary{
			TaskID:      t.id,
			LayerID:     layerOf(t),
			State:       st,
			Total:       t.total.Load(),
			Success:     t.success.Load(),
			Failed:      t.failed.Load(),
			Skipped:     t.skipped.Load(),
			Retried:     t.retried.Load(),
			InFlight:    t.inFlight.Load(),
			Bytes:       t.bytes.Load(),
			Concurrency: conc,
			QueuePos:    pos,
		})
		if i == activeIdx {
			active = t
		}
	}
	m.mu.Unlock()

	p := model.Progress{Tasks: summaries}
	if active != nil {
		p.TaskID = active.id
		p.LayerID = layerOf(active)
		p.State = active.getState()
		p.Total = active.total.Load()
		p.Success = active.success.Load()
		p.Failed = active.failed.Load()
		p.Skipped = active.skipped.Load()
		p.Retried = active.retried.Load()
		p.InFlight = active.inFlight.Load()
		p.Bytes = active.bytes.Load()
	}
	m.emit(p)
}

func layerOf(t *task) string {
	v, _ := t.layer.Load().(string)
	return v
}

// ---------------- 辅助 ----------------

func countTiles(job model.DownloadJob) int64 {
	var total int64
	for _, source := range job.Sources {
		isBaidu := source.Projection == "BAIDU"
		for z := job.ZMin; z <= job.ZMax; z++ {
			bounds := tile.TileBounds(job.Extent, z, isBaidu)
			total += int64(bounds.X1-bounds.X0+1) * int64(bounds.Y1-bounds.Y0+1)
		}
	}
	return total
}

func countColumns(job model.DownloadJob) int {
	columns := 0
	for _, source := range job.Sources {
		isBaidu := source.Projection == "BAIDU"
		for z := job.ZMin; z <= job.ZMax; z++ {
			bounds := tile.TileBounds(job.Extent, z, isBaidu)
			columns += max(0, bounds.X1-bounds.X0+1)
		}
	}
	return columns
}

// planRowsPerShard 列数充足时短列就是完整一列，超长列拆分以防长尾
func planRowsPerShard(job model.DownloadJob) int {
	columns := countColumns(job)
	workers := job.Concurrency
	if workers < 1 {
		workers = 1
	}
	if columns >= workers*shardsPerWorker {
		return maxRowsPerShard
	}
	return fallbackRowsPerShard
}

// resolveSocketsPerHost 按域名数分摊连接数，避免单域名源被上限卡死
func resolveSocketsPerHost(job model.DownloadJob) int {
	hostCount := 1
	for _, source := range job.Sources {
		if n := tile.HostCount(source.URLRule); n > hostCount {
			hostCount = n
		}
	}
	workers := job.Concurrency
	if workers < 1 {
		workers = 1
	}
	perHost := int(math.Ceil(float64(workers) / float64(hostCount)))
	upper := job.SocketsPerHost
	if upper <= 0 {
		upper = 32
	}
	return max(minSocketsPerHost, min(upper, perHost))
}

func backoffDelay(attempt int) time.Duration {
	base := math.Min(400*math.Pow(2, float64(attempt)), 6000)
	return time.Duration(base)*time.Millisecond + time.Duration(rand.Intn(200))*time.Millisecond
}

func safeDirName(name string) string {
	replacer := strings.NewReplacer("\\", "_", "/", "_", ":", "_", "*", "_", "?", "_", "\"", "_", "<", "_", ">", "_", "|", "_")
	if result := replacer.Replace(name); result != "" {
		return result
	}
	return "tiles"
}
