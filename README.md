# 地图瓦片下载工具（map）

桌面端地图瓦片批量下载工具，基于 **Wails3（Go + Vue）** 构建。可从自定义瓦片源（XYZ / TMS）批量下载瓦片到本地，按 `z/x/y` 目录结构落盘，适用于离线地图、私有地图服务、GIS 数据生产等场景。

## 主要功能

- **多瓦片源**：内置常见瓦片源（如高德 AMap、腾讯 TMS、天地图 TiandiTu）
- **多投影**：Web Mercator 与百度 BD-09 投影。
- **框选下载**：在地图预览上框选范围，设置最小 / 最大缩放层级后下载。
- **多任务队列**：暂停 / 继续 / 停止，运行中可**实时调整并发数**。
- **断点续传**：已存在的瓦片自动跳过（`skipExist`）。
- **瓦片格式自动识别**：按图源实际返回的 `Content-Type` 命名（`.png` / `.jpg` / `.webp` / …），无需手动选择格式，文件名与内容一致。
- **目录式存储**：瓦片按 `图层目录/{z}/{x}/{y}.ext` 落盘。

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Go 1.25 + Wails v3（v3.0.0-beta.20） |
| 前端 | Vue 3 + TypeScript + Vite + Naive UI + maptalks（地图预览） |

## 环境要求

- Go >= 1.25
- Node.js（含 npm）
- wails3 CLI：

  ```bash
  go install github.com/wailsapp/wails/v3/cmd/wails3@latest
  ```

## 开发模式（Development）

```bash
# 1. 安装前端依赖（仅需一次）
cd frontend && npm install

# 2. 启动开发（前后端热重载）
wails3 dev
```

开发模式下 Wails 会自动拉起 Vite 开发服务器并启用前后端热重载，修改 `frontend/` 或 Go 代码后即时生效。前端默认端口 `9245`。

仅做前端调试（需后端已在运行）：

```bash
cd frontend
npm run dev        # 启动 Vite 开发服务器
npm run typecheck  # 类型检查（vue-tsc --noEmit）
```

## 生产构建（Production）
  
可直接调用 Wails CLI：

```bash
wails3 build              # 构建当前平台
wails3 build GOOS=windows # 交叉编译（由 Taskfile 分发到对应平台 Task）
```

> 前端资源通过 `//go:embed all:frontend/dist` 编译进二进制，构建产物为**单文件可执行程序**，无需额外部署前端文件。若前端资源未自动构建，可手动 `cd frontend && npm run build` 先产出 `frontend/dist`。


## 使用说明

1. 在地图预览上**框选**下载区域；
2. 选择**瓦片源**（高德 / 腾讯 / 天地图 / 自定义）与**投影**；
3. 设置**最小、最大缩放层级**；
4. 选择**保存目录**，点击确定开始下载；
5. 在右下角任务面板中可**暂停 / 继续 / 停止**任务，并实时**调整并发数**。

## 瓦片存储结构

```
保存目录/
  <图层ID>/
    <z>/
      <x>/
        <y>.png    # 扩展名由图源 Content-Type 自动决定
        <y>.jpg
        ...
```

## 关键参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| 下载并发 `concurrency` | 48 | 同时下载的瓦片请求数 |
| 写盘并发 `writeConcurrency` | 24 | 同时落盘的文件数；HDD / exFAT 建议调低以减少随机写抖动 |
| 每域名连接数 `socketsPerHost` | 32 | 单个瓦片域名的最大连接数 |
| 最大重试 `maxRetry` | 3 | 单瓦片失败重试次数 |
| 跳过已存在 `skipExist` | true | 断点续传，已存在瓦片不重复下载 |
| 超时 `timeoutMs` | 20000 | 单请求超时（毫秒） |

> 提示：目标盘为机械硬盘或 exFAT 格式的移动存储时，建议降低 `writeConcurrency`（如 8–12），可显著缓解随机写导致的吞吐下降。

## 目录结构

```
map/
├── main.go                  # 应用入口，注册事件、创建窗口
├── download_service.go      # Wails 服务：下载 / 暂停 / 继续 / 停止 / 调并发
├── internal/
│   ├── downloader/          # 下载调度、Worker 池、瓦片落盘（Sink）
│   ├── tile/                # 瓦片范围计算、URL 规则
│   └── model/               # 任务 / 进度数据结构
├── frontend/                # Vue 前端（地图预览、下载面板、设置）
├── build/                   # 各平台构建 / 打包配置（Taskfile）
├── Taskfile.yml             # 构建任务入口（dev / build / package / server）
└── go.mod
```
