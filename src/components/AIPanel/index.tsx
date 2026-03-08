import { useState, useRef } from 'react'
import { Sparkles, Copy, Check, AlertCircle, Loader2, ChevronDown } from 'lucide-react'
import { useNoteStore } from '../../store/noteStore'
import { useUIStore } from '../../store/uiStore'
import { streamAI, type AIAction } from '../../lib/ai'

const ACTIONS: { key: AIAction; label: string; desc: string }[] = [
  { key: 'summarize', label: '生成摘要', desc: '对笔记全文生成简洁摘要' },
  { key: 'expand', label: '扩写', desc: '将选中或全文进行扩展' },
  { key: 'rewrite', label: '改写润色', desc: '优化表达，使行文更流畅' },
  { key: 'continue', label: '续写', desc: '基于当前内容向后延伸' },
  { key: 'shorten', label: '精简', desc: '压缩内容，去除冗余' },
]

export function AIPanel() {
  const { activeNote, updateNote } = useNoteStore()
  const { settings } = useUIStore()
  const [action, setAction] = useState<AIAction>('summarize')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [applied, setApplied] = useState(false)
  const abortRef = useRef(false)

  const apiKey = settings?.apiKey || ''
  const hasKey = apiKey.trim().length > 0

  const run = async () => {
    if (!activeNote || !hasKey || loading) return
    setResult('')
    setError('')
    setLoading(true)
    setApplied(false)
    abortRef.current = false

    const text = activeNote.content

    await streamAI({
      apiKey,
      provider: settings?.apiProvider || 'anthropic',
      action,
      text,
      onChunk: (chunk) => {
        if (abortRef.current) return
        setResult(prev => prev + chunk)
      },
      onDone: () => {
        setLoading(false)
      },
      onError: (err) => {
        setError(err)
        setLoading(false)
      },
    })
  }

  const stop = () => {
    abortRef.current = true
    setLoading(false)
  }

  const copy = async () => {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const applyAsSummary = async () => {
    if (!activeNote || !result) return
    await updateNote(activeNote.id, { aiSummary: result })
    setApplied(true)
    setTimeout(() => setApplied(false), 2000)
  }

  const insertToNote = async () => {
    if (!activeNote || !result) return
    const newContent = activeNote.content + '\n\n---\n\n' + result
    await updateNote(activeNote.id, { content: newContent })
    setApplied(true)
    setTimeout(() => setApplied(false), 2000)
  }

  if (!activeNote) {
    return (
      <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--text-muted)' }}>
        先选择一篇笔记
      </div>
    )
  }

  if (!hasKey) {
    return (
      <div className="p-4 text-center">
        <Sparkles size={24} style={{ color: 'var(--accent)', margin: '0 auto 8px' }} />
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          请在设置中配置 API Key 以启用 AI 功能
        </p>
        <button
          onClick={() => useUIStore.getState().openSettings()}
          className="text-xs px-3 py-1.5 rounded-lg font-medium"
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          前往设置
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Action selector */}
      <div className="relative">
        <select
          value={action}
          onChange={e => setAction(e.target.value as AIAction)}
          className="w-full text-xs px-3 py-2 rounded-lg appearance-none pr-8 font-medium"
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          {ACTIONS.map(a => (
            <option key={a.key} value={a.key}>{a.label}</option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
      </div>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {ACTIONS.find(a => a.key === action)?.desc}
      </p>

      {/* Run button */}
      <button
        onClick={loading ? stop : run}
        disabled={!activeNote}
        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
        style={{
          background: loading ? 'var(--bg-subtle)' : 'var(--accent)',
          color: loading ? 'var(--text)' : '#fff',
          border: `1px solid ${loading ? 'var(--border)' : 'transparent'}`,
          cursor: 'pointer',
        }}
      >
        {loading ? (
          <><Loader2 size={13} className="animate-spin" /> 停止生成</>
        ) : (
          <><Sparkles size={13} /> 开始生成</>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="flex flex-col gap-2">
          <div
            className="text-xs p-3 rounded-lg border leading-relaxed whitespace-pre-wrap"
            style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)', color: 'var(--text)', maxHeight: 280, overflow: 'auto' }}
          >
            {result}
            {loading && <span className="ai-cursor" />}
          </div>

          {!loading && (
            <div className="flex gap-2">
              <ActionBtn onClick={copy} icon={copied ? <Check size={12} /> : <Copy size={12} />}>
                {copied ? '已复制' : '复制'}
              </ActionBtn>
              {action === 'summarize' ? (
                <ActionBtn onClick={applyAsSummary} primary>
                  {applied ? '已保存' : '存为摘要'}
                </ActionBtn>
              ) : (
                <ActionBtn onClick={insertToNote} primary>
                  {applied ? '已插入' : '插入笔记'}
                </ActionBtn>
              )}
            </div>
          )}
        </div>
      )}

      {/* Summary display */}
      {activeNote.aiSummary && !result && (
        <div>
          <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>已保存的摘要</div>
          <div
            className="text-xs p-3 rounded-lg border leading-relaxed"
            style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            {activeNote.aiSummary}
          </div>
        </div>
      )}
    </div>
  )
}

function ActionBtn({
  children, onClick, primary, icon,
}: {
  children: React.ReactNode
  onClick: () => void
  primary?: boolean
  icon?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
      style={{
        background: primary ? 'var(--accent)' : 'var(--bg-subtle)',
        color: primary ? '#fff' : 'var(--text)',
        border: `1px solid ${primary ? 'transparent' : 'var(--border)'}`,
        cursor: 'pointer',
      }}
    >
      {icon}
      {children}
    </button>
  )
}
