package main

import (
	"context"
	"errors"

	"github.com/wailsapp/wails/v3/pkg/application"
	"map/internal/downloader"
	"map/internal/model"
)

// DownloadService 下载服务，暴露给前端调用
type DownloadService struct {
	app     *application.App
	manager *downloader.Manager
}

func NewDownloadService() *DownloadService {
	service := &DownloadService{}
	service.manager = downloader.NewManager(service.emit, service.log)
	return service
}

// ServiceStartup 由 Wails 在应用启动时调用
func (s *DownloadService) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
	return nil
}

// attach 绑定应用实例（小写，避免被绑定生成器暴露给前端）
func (s *DownloadService) attach(app *application.App) {
	s.app = app
}

// StartDownload 下发整个下载任务，瓦片范围与 URL 都由 Go 侧计算。返回任务 ID
func (s *DownloadService) StartDownload(job model.DownloadJob) (string, error) {
	return s.manager.Start(job)
}

// PauseDownload 暂停指定任务
func (s *DownloadService) PauseDownload(id string) {
	s.manager.Pause(id)
}

// ResumeDownload 继续指定任务
func (s *DownloadService) ResumeDownload(id string) {
	s.manager.Resume(id)
}

// StopDownload 停止指定任务
func (s *DownloadService) StopDownload(id string) {
	s.manager.Stop(id)
}

// SetConcurrency 运行时调整指定任务的并发 worker 数
func (s *DownloadService) SetConcurrency(id string, n int) error {
	return s.manager.SetConcurrency(id, n)
}

// SelectFolder 选择保存目录，返回空字符串表示用户取消
func (s *DownloadService) SelectFolder() (string, error) {
	if s.app == nil {
		return "", errors.New("应用尚未就绪")
	}
	selected, err := s.app.Dialog.OpenFile().
		CanChooseFiles(false).
		CanChooseDirectories(true).
		SetTitle("选择瓦片保存目录").
		PromptForSingleSelection()
	if err != nil {
		// 用户取消时返回空字符串而不是错误
		return "", nil
	}
	return selected, nil
}

func (s *DownloadService) emit(progress model.Progress) {
	if s.app == nil {
		return
	}
	s.app.Event.Emit("download:progress", progress)
}

func (s *DownloadService) log(message string) {
	if s.app == nil {
		return
	}
	s.app.Logger.Info(message)
}
