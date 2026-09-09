/**
 * 同款统计行插件 (仿 DSH Desktop 底部小字) —— 状态栏芯片版
 * 位置: 窗口最底部状态栏右侧, 和审批模式(审批)那一行并排
 * 路径: <Hermes主目录>/desktop-plugins/dsh-stats-line/plugin.js (文件夹名必须等于 id)
 * 加载: 桌面端按 Ctrl+K -> 重新加载桌面插件 (Reload desktop plugins)
 * 说明: 纯界面脚本 (未编译的原生模块), 只能导入 @hermes/plugin-sdk / react / react/jsx-runtime
 */
import { haptic, host, Tip, usePluginI18n, useValue } from '@hermes/plugin-sdk'
import { jsx, jsxs } from 'react/jsx-runtime'
import { useEffect, useRef, useState } from 'react'

const ID = 'dsh-stats-line'

// 中文解释: 紧凑数字格式化 7.8K / 1.2M, 对应上游 token-format.ts 的 formatTokens
function formatTokens(value) {
  if (value == null || Number.isNaN(value)) return '--'
  if (value < 1000) return String(value)
  const scaled = (c) => (c >= 100 ? String(Math.round(c)) : String(Math.round(c * 10) / 10))
  if (value < 1000000) return scaled(value / 1000) + 'K'
  return scaled(value / 1000000) + 'M'
}

// 中文解释: 秒数格式化 1.7s, 对应上游 StatsLine.tsx 的 formatDuration
function formatDuration(ms) {
  if (ms == null || Number.isNaN(ms)) return null
  const s = ms / 1000
  if (s < 60) return (Math.round(s * 10) / 10) + 's'
  const whole = Math.round(s)
  return Math.floor(whole / 60) + 'm' + (whole % 60) + 's'
}

// 中文解释: 读 Hermes 真实 UsageStats 字段 (见 apps/desktop/src/types/hermes.ts):
// input / output / total / calls / avg_tps / cache_hit_pct / context_*
function pickUsage(usage) {
  if (!usage || typeof usage !== 'object') return null
  const input = usage.input ?? usage.inputTokens ?? usage.promptTokens ?? null
  const output = usage.output ?? usage.outputTokens ?? usage.completionTokens ?? null
  const calls = usage.calls ?? usage.steps ?? usage.stepCount ?? null
  const tps = usage.avg_tps ?? usage.tokensPerSecond ?? usage.throughput ?? null
  const cacheHit = usage.cache_hit_pct ?? usage.cacheHitPercent ?? usage.cacheHit ?? null
  return { input, output, calls, tps, cacheHit, raw: usage }
}

function StatsText() {
  const t = usePluginI18n(ID)
  const usage = useValue(host.state.focusedUsage)
  const busy = useValue(host.state.busy)
  const awaiting = useValue(host.state.awaitingResponse)

  // 中文解释: 本地计时, 补齐后端没给的 LLM 耗时 / 首 token 耗时 / 轮数
  // busy true->false = 一轮结束; awaiting true->false = 首包到达
  const [timing, setTiming] = useState({ llmMs: null, ttftMs: null, turns: 0 })
  const turnStart = useRef(0)
  const firstTokenDone = useRef(false)

  useEffect(() => {
    if (busy && !turnStart.current) {
      turnStart.current = Date.now()
      firstTokenDone.current = false
    }
    if (!busy && turnStart.current) {
      const elapsed = Date.now() - turnStart.current
      turnStart.current = 0
      setTiming((prev) => ({ llmMs: elapsed, ttftMs: prev.ttftMs, turns: prev.turns + 1 }))
    }
  }, [busy])

  useEffect(() => {
    if (turnStart.current && !firstTokenDone.current && awaiting === false) {
      firstTokenDone.current = true
      const elapsed = Date.now() - turnStart.current
      setTiming((prev) => ({ llmMs: prev.llmMs, ttftMs: elapsed, turns: prev.turns }))
    }
  }, [awaiting])

  const parsed = pickUsage(usage)
  const hasReal = parsed && (parsed.input != null || parsed.output != null || (parsed.calls != null && parsed.calls > 0))

  // 中文解释: 没有真数据时, 原样显示示例那行
  if (!hasReal) {
    return jsx('span', { className: 'tabular-nums', children: t('demo') })
  }

  // 中文解释: 有真数据后保留 5 组, 拿不到真值的组沿用示例值, 整行绝不塌
  const groups = []

  if (parsed.calls != null && parsed.calls > 0) {
    const turns = timing.turns > 0 ? timing.turns : 1
    groups.push(`${turns}轮·${parsed.calls}步`)
  } else {
    groups.push('1轮·1步')
  }

  const llmText = timing.llmMs != null ? formatDuration(timing.llmMs) : null
  groups.push(t('llm', llmText ?? '1.7s'))

  const speeds = []
  const ttftText = timing.ttftMs != null ? formatDuration(timing.ttftMs) : null
  speeds.push(t('ttft', ttftText ?? '0.9s'))
  if (parsed.tps != null && Number.isFinite(Number(parsed.tps)) && Number(parsed.tps) > 0) {
    speeds.push(t('tps', String(Math.round(Number(parsed.tps)))))
  } else {
    speeds.push(t('tps', '121'))
  }
  groups.push(speeds.join(' · '))

  if (parsed.cacheHit != null && Number.isFinite(Number(parsed.cacheHit))) {
    groups.push(t('cacheHit', String(Math.round(Number(parsed.cacheHit)))))
  } else {
    groups.push(t('cacheHit', '0'))
  }

  const io = []
  if (parsed.input != null) io.push(t('input', formatTokens(Number(parsed.input))))
  if (parsed.output != null) io.push(t('output', formatTokens(Number(parsed.output))))
  if (io.length > 0) groups.push(io.join(' · '))

  return jsx('span', { className: 'tabular-nums', children: groups.join(' | ') })
}

// 中文解释: 状态栏右侧小字 (和审批模式同一行), 鼠标悬停 500ms 出完整提示, 点击看原始用量
function StatsChip() {
  const t = usePluginI18n(ID)

  return jsx(Tip, {
    label: t('full'),
    side: 'top',
    children: jsx('button', {
      className:
        'inline-flex h-full max-w-[560px] items-center gap-1 overflow-hidden px-1.5 text-[0.6875rem] whitespace-nowrap text-ellipsis text-(--ui-text-tertiary) hover:bg-(--chrome-action-hover) hover:text-foreground',
      type: 'button',
      onClick: () => {
        haptic('tap')
        const u = host.state.focusedUsage.get()
        host.notify({ kind: 'info', message: t('clicked', u ? JSON.stringify(u).slice(0, 300) : t('noData')) })
      },
      children: jsx(StatsText, {})
    })
  })
}

export default {
  id: ID, // 中文解释: 必须和文件夹名 dsh-stats-line 一致
  name: 'DSH 同款统计行',
  register(ctx) {
    ctx.i18n.register({
      zh: {
        demo: '1轮·1步 | LLM 1.7s | 首 token 平均 0.9s · 121 tok/s | 缓存命中 0% | 输入 7.8K tok · 输出 102 tok',
        llm: (d) => `LLM ${d}`,
        ttft: (d) => `首 token 平均 ${d}`,
        tps: (v) => `${v} tok/s`,
        cacheHit: (v) => `缓存命中 ${v}%`,
        input: (v) => `输入 ${v} tok`,
        output: (v) => `输出 ${v} tok`,
        full: '点击查看原始用量',
        clicked: (raw) => `当前用量: ${raw}`,
        noData: '暂无用量'
      },
      en: {
        demo: '1 turn·1 step | LLM 1.7s | TTFT avg 0.9s · 121 tok/s | Cache 0% | In 7.8K tok · Out 102 tok',
        llm: (d) => `LLM ${d}`,
        ttft: (d) => `TTFT avg ${d}`,
        tps: (v) => `${v} tok/s`,
        cacheHit: (v) => `Cache ${v}%`,
        input: (v) => `In ${v} tok`,
        output: (v) => `Out ${v} tok`,
        full: 'Click for raw usage',
        clicked: (raw) => `Usage: ${raw}`,
        noData: 'no usage yet'
      }
    })

    // 中文解释: 只注册状态栏右侧芯片, 和审批模式/模型等原生项目同一行
    // order 100 靠左, 审批模式等原生项在后面, 冲突时原生项会排在更右
    ctx.register({
      id: 'chip',
      area: 'statusBar.right',
      order: 100,
      render: () => jsx(StatsChip, {})
    })
  }
}
