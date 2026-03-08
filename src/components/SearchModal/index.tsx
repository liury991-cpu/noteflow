import { useState, useEffect, useRef } from 'react'
import { Search, FileText, X } from 'lucide-react'
import { useNoteStore } from '../../store/noteStore'
import { useUIStore } from '../../store/uiStore'

export function SearchModal() {
  const { notes, setActiveNote } = useNoteStore()
  const { searchOpen, closeSearch } = useUIStore()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [searchOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchOpen ? closeSearch() : useUIStore.getState().openSearch()
      }
      if (e.key === 'Escape' && searchOpen) closeSearch()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [searchOpen, closeSearch])

  if (!searchOpen) return null

  const results = query.trim()
    ? notes.filter(n => {
        const q = query.toLowerCase()
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some(t => t.toLowerCase().includes(q))
        )
      }).slice(0, 10)
    : notes.slice(0, 8)

  const highlight = (text: string, q: string) => {
    if (!q.trim()) return text
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return text
    return (
      text.slice(0, idx) +
      '<mark>' + text.slice(idx, idx + q.length) + '</mark>' +
      text.slice(idx + q.length)
    )
  }

  const getSnippet = (content: string, q: string): string => {
    if (!q.trim()) return content.slice(0, 80).replace(/\n/g, ' ') + '...'
    const idx = content.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return content.slice(0, 80).replace(/\n/g, ' ') + '...'
    const start = Math.max(0, idx - 30)
    const end = Math.min(content.length, idx + q.length + 50)
    return (start > 0 ? '...' : '') + content.slice(start, end).replace(/\n/g, ' ') + (end < content.length ? '...' : '')
  }

  const handleSelect = (id: string) => {
    setActiveNote(id)
    closeSearch()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
      onClick={closeSearch}
    >
      <div
        className="w-full max-w-xl rounded-xl shadow-2xl overflow-hidden fade-in"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索笔记内容、标题、标签..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text)' }}
          />
          <button onClick={closeSearch} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto py-1">
          {results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              没有找到匹配的笔记
            </div>
          )}
          {results.map(note => (
            <button
              key={note.id}
              onClick={() => handleSelect(note.id)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:opacity-80 transition-opacity border-b last:border-0"
              style={{ borderColor: 'var(--border)', background: 'transparent', cursor: 'pointer' }}
            >
              <FileText size={15} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--text)' }}
                  dangerouslySetInnerHTML={{ __html: highlight(note.title, query) }}
                />
                <div
                  className="text-xs mt-0.5 line-clamp-2"
                  style={{ color: 'var(--text-muted)' }}
                  dangerouslySetInnerHTML={{ __html: highlight(getSnippet(note.content, query), query) }}
                />
                {note.tags.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {note.tags.slice(0, 3).map(t => (
                      <span key={t} className="tag-pill">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                {new Date(note.updatedAt).toLocaleDateString('zh-CN')}
              </span>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t flex items-center gap-3 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          <span><kbd className="font-mono">↑↓</kbd> 导航</span>
          <span><kbd className="font-mono">↵</kbd> 打开</span>
          <span><kbd className="font-mono">Esc</kbd> 关闭</span>
          <span className="ml-auto">{results.length} 个结果</span>
        </div>
      </div>
    </div>
  )
}
