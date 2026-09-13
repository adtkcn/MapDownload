package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
	"map/internal/model"
)

// Wails uses Go's `embed` package to embed the frontend files into the binary.
// Any files in the frontend/dist folder will be embedded into the binary and
// made available to the frontend.
// See https://pkg.go.dev/embed for more information.

//go:embed all:frontend/dist
var assets embed.FS

func init() {
	// 注册自定义事件，绑定生成器会为它生成强类型的 TS API
	application.RegisterEvent[model.Progress]("download:progress")
}

func main() {
	downloadService := NewDownloadService()

	app := application.New(application.Options{
		Name:        "map",
		Description: "地图瓦片下载工具",
		Services: []application.Service{
			application.NewService(downloadService),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	// 服务需要在应用创建之后才能拿到用于发事件和弹窗的实例
	downloadService.attach(app)

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:            "地图下载",
		Width:            1100,
		Height:           720,
		BackgroundColour: application.NewRGB(255, 255, 255),
		URL:              "/",
	})

	// Run the application. This blocks until the application has been exited.
	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
