package downloader

import (
	"io"
	"os"
	"sync"
)

// columnEntry 某个瓦片列已存在文件的缓存
//
// 同一列的多个分片共享一次 readdir，引用计数归零后释放，
// 避免长任务里内存无限增长。
type columnEntry struct {
	once  sync.Once
	mu    sync.Mutex
	refs  int
	files map[string]struct{}
}

// Sink 负责目录创建与文件落盘
type Sink struct {
	writeSem chan struct{}
	dirs     sync.Map
	columns  sync.Map
}

func NewSink(writeConcurrency int) *Sink {
	if writeConcurrency < 1 {
		writeConcurrency = 1
	}
	return &Sink{writeSem: make(chan struct{}, writeConcurrency)}
}

// EnsureDir 创建目录，已创建过的直接返回
func (s *Sink) EnsureDir(dir string) error {
	if _, ok := s.dirs.Load(dir); ok {
		return nil
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		// 并发创建时可能已存在，再确认一次
		if info, statErr := os.Stat(dir); statErr == nil && info.IsDir() {
			s.dirs.Store(dir, struct{}{})
			return nil
		}
		return err
	}
	s.dirs.Store(dir, struct{}{})
	return nil
}

// AcquireColumn 取得某列已存在的文件集合，同列只读取一次
func (s *Sink) AcquireColumn(dir string) map[string]struct{} {
	value, _ := s.columns.LoadOrStore(dir, &columnEntry{})
	entry := value.(*columnEntry)

	entry.mu.Lock()
	entry.refs++
	entry.mu.Unlock()

	entry.once.Do(func() {
		entry.files = readDirNames(dir)
	})
	return entry.files
}

// ReleaseColumn 归还列缓存
func (s *Sink) ReleaseColumn(dir string) {
	value, ok := s.columns.Load(dir)
	if !ok {
		return
	}
	entry := value.(*columnEntry)
	entry.mu.Lock()
	entry.refs--
	refs := entry.refs
	entry.mu.Unlock()
	if refs <= 0 {
		s.columns.Delete(dir)
	}
}

// Write 流式写入目标文件，先写临时文件再 rename，避免出现半截文件
func (s *Sink) Write(r io.Reader, dest string) (int64, error) {
	s.writeSem <- struct{}{}
	defer func() { <-s.writeSem }()

	tmp := dest + ".part"
	file, err := os.Create(tmp)
	if err != nil {
		return 0, err
	}

	n, err := io.Copy(file, r)
	file.Close()
	if err != nil {
		os.Remove(tmp)
		return 0, err
	}
	if err := os.Rename(tmp, dest); err != nil {
		os.Remove(tmp)
		return 0, err
	}
	return n, nil
}

func readDirNames(dir string) map[string]struct{} {
	entries, err := os.ReadDir(dir)
	files := make(map[string]struct{}, len(entries))
	if err != nil {
		return files
	}
	for _, entry := range entries {
		files[entry.Name()] = struct{}{}
	}
	return files
}


