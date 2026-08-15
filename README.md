# DSH B站浮窗插件

在 DeepSeek Harness (DSH) 桌面应用中运行的 B站悬浮视频小窗。支持推荐/热门/排行/精选/AI 内容发现、搜索、历史记录、自动连播、迷你/专注模式，以及拖动缩放。

## 功能

- **内容发现** — 推荐、热门、排行、精选、AI 五个分类，45 个话题 chip 快速切入
- **搜索** — 支持 BV/av 号直达，视频/番剧/UP主/影视 四种搜索类型，搜索历史持久化
- **播放器** — B站 iframe 内嵌，自动播/续播/重播三种结束模式，迷你模式和专注模式
- **历史记录** — 自动记录观看历史，已看标记，支持单条删除
- **交互** — 悬浮球拖动/点击分离，窗口自由拖动缩放，键盘快捷键（→下一个 / M迷你 / F专注）
- **体验** — 骨架屏加载动画、错误重试按钮、封面图缓存、窗口位置钳制

## 安装

直接在 DSH 里说：

> 请安装 https://github.com/pyf2818/dsh-bili-widget 这个插件

DSH 会自动完成安装，重启后即可使用。

### 手动安装

如果自动安装失败，在你的 DSH profile 的 `package.json` 中添加：

```json
{
  "dependencies": {
    "@dsh-external/dsh-bili-widget": "github:pyf2818/dsh-bili-widget"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@dsh-external/dsh-bili-widget"
      ]
    }
  }
}
```

然后重启 DSH。

## 环境要求

- Windows（使用 curl.exe 和 powershell.exe 作为网络子进程）
- DSH 桌面应用（web profile）

## 快捷键

| 按键 | 功能 |
|------|------|
| `→` / `n` / `N` | 播放下一个 |
| `m` / `M` | 切换迷你模式 |
| `f` / `F` | 切换专注模式 |

## 已知限制

- 播放器 iframe 基于计时器检测播放结束，非 B站原生事件（弹幕事件上报不可用）
- 封面图通过 PowerShell WebClient 下载（处理 HTTPS 证书问题）
- B站公开 API 使用 HTTP 协议

## License

MIT
