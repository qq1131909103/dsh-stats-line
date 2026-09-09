# DSH Stats Line（DSH 同款统计行）

A Hermes Desktop statusbar plugin that shows a live per-turn usage line —
inspired by the bottom stats line of [anywhere-labs/dsh-desktop](https://github.com/anywhere-labs/dsh-desktop).
一个仿 DSH Desktop 底部统计小字的 Hermes 桌面端状态栏插件：实时显示每轮对话的
轮次/步数、LLM 耗时、首 token 延迟、吞吐、缓存命中率与输入/输出 token。

![preview](assets/preview.png)

## 效果预览 / What it looks like

Window bottom statusbar, right side, next to the approval-mode item:

```
1轮·1步 | LLM 1.7s | 首 token 平均 0.9s · 121 tok/s | 缓存命中 0% | 输入 7.8K tok · 输出 102 tok
```

No session data yet → shows the sample line above; after you send a message it
switches to real numbers and live-updates while streaming. Hover for a tooltip,
click for the raw usage payload.
没有会话数据时显示示例行；发送消息后切换为真实数据，流式输出时实时刷新。
悬停有提示，点击可查看原始用量。

## 安装 / Install

### One-click (recommended)

Make sure the Hermes desktop app is running, then click:

[**Install in Hermes**](hermes://plugin/install?repo=qq1131909103/dsh-stats-line&enable=1)

(Windows may ask which app handles the `hermes://` link — pick Hermes Desktop.
Then confirm the dialog: the repo is detected as a *desktop plugin*.)

### Manual

1. Download this repo (Code → Download ZIP), or `git clone https://github.com/qq1131909103/dsh-stats-line.git`
2. Copy the `plugin.js` into `<hermes home>/desktop-plugins/dsh-stats-line/` so you have:
   `desktop-plugins/dsh-stats-line/plugin.js`
   (`<hermes home>` is `~/.hermes`, or `~/.hermes/profiles/<name>` under a named profile — check
   Settings → Plugins for the exact folder path on your machine.)
3. In the desktop app press `Ctrl+K` → **Reload desktop plugins**.

## 工作原理 / How it works

Reads the live `UsageStats` of the focused session via the plugin SDK
(`host.state.focusedUsage` — `input` / `output` / `calls` / `avg_tps` /
`cache_hit_pct`), subscribes to `busy` / `awaitingResponse` for locally-timed
LLM / time-to-first-token measurements, and joins every group with real values,
falling back to the sample values only until real data arrives — so the line
never collapses while a turn is streaming.

通过插件 SDK 订阅当前会话的实时用量与运行状态：token 计数、步数、吞吐、
缓存命中走后端真实字段，LLM 耗时与首 token 延迟在前端按轮实测；每组数值
都只在拿到真数据前显示示例值，流式过程中整行不会塌陷。

## 卸载 / Uninstall

Settings → Plugins → 找到 **DSH 同款统计行** → Disable 或 Remove（删除文件夹）。

## 许可证 / License

MIT
