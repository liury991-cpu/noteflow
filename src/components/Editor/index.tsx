import { useEffect, useRef, useCallback } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useNoteStore } from '../../store/noteStore'
import { useUIStore } from '../../store/uiStore'

const AUTOSAVE_DELAY = 600

const lightTheme = EditorView.theme({
  '&': { background: 'var(--bg)', color: 'var(--text)' },
  '.cm-content': { caretColor: 'var(--accent)' },
  '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--accent)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    background: 'var(--accent-bg)',
  },
  '.cm-line': { color: 'var(--text)' },
})

export function Editor() {
  const { activeNote, updateNote } = useNoteStore()
  const { viewMode } = useUIStore()
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeNoteIdRef = useRef<string | null>(null)
  // Keep updateNote in a ref so the editor listener always sees the latest version
  const updateNoteRef = useRef(updateNote)
  updateNoteRef.current = updateNote

  const scheduleAutosave = useCallback((content: string, noteId: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      updateNoteRef.current(noteId, { content })
    }, AUTOSAVE_DELAY)
  }, [])

  // Init editor once — the editorRef div is ALWAYS rendered so this runs correctly
  useEffect(() => {
    if (!editorRef.current) return

    const view = new EditorView({
      state: EditorState.create({
        doc: '',
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          markdown({ base: markdownLanguage }),
          syntaxHighlighting(defaultHighlightStyle),
          lightTheme,
          placeholder('开始写作...'),
          EditorView.lineWrapping,
          EditorView.updateListener.of(update => {
            if (update.docChanged && activeNoteIdRef.current) {
              scheduleAutosave(update.state.doc.toString(), activeNoteIdRef.current)
            }
          }),
        ],
      }),
      parent: editorRef.current,
    })

    viewRef.current = view
    return () => {
      view.destroy()
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [scheduleAutosave])

  // Sync content when switching notes
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    activeNoteIdRef.current = activeNote?.id ?? null
    const newContent = activeNote?.content ?? ''
    const currentContent = view.state.doc.toString()

    if (newContent !== currentContent) {
      view.dispatch({
        changes: { from: 0, to: currentContent.length, insert: newContent },
      })
    }
  }, [activeNote?.id])

  const showEditor = viewMode === 'edit' || viewMode === 'split'
  const showPreview = viewMode === 'preview' || viewMode === 'split'

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Editor pane — always rendered so CodeMirror initializes on mount */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{
          display: showEditor ? 'flex' : 'none',
          flexDirection: 'column',
          borderRight: showPreview ? `1px solid var(--border)` : 'none',
        }}
      >
        {/* No-note placeholder overlay */}
        {!activeNote && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}
          >
            <div className="text-center">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-sm">选择或新建一篇笔记</p>
            </div>
          </div>
        )}
        <div
          ref={editorRef}
          className="h-full overflow-auto"
          style={{ maxWidth: showPreview ? 'none' : 720, margin: showPreview ? 0 : '0 auto' }}
        />
      </div>

      {/* Preview pane */}
      {showPreview && (
        <div
          className="flex-1 overflow-auto px-8 py-5"
          style={{ maxWidth: showEditor ? 'none' : 720, margin: '0 auto' }}
        >
          {activeNote ? (
            <MarkdownPreview content={activeNote.content} />
          ) : (
            <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
              <div className="text-center">
                <div className="text-4xl mb-3">📝</div>
                <p className="text-sm">选择或新建一篇笔记</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MarkdownPreview({ content }: { content: string }) {
  const { notes, setActiveNote } = useNoteStore()
  const titleMap = new Map(notes.map(n => [n.title, n.id]))

  const processedContent = content.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_, title, alias) => {
      const display = alias || title
      const id = titleMap.get(title.trim())
      return `[${display}](wikilink:${id || 'missing'}:${encodeURIComponent(title)})`
    }
  )

  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children }) {
            if (href?.startsWith('wikilink:')) {
              const parts = href.split(':')
              const id = parts[1]
              const title = decodeURIComponent(parts[2] || '')
              const exists = id !== 'missing'
              return (
                <span
                  className="wiki-link"
                  style={{ opacity: exists ? 1 : 0.5 }}
                  title={exists ? `打开: ${title}` : `笔记不存在: ${title}`}
                  onClick={() => exists && setActiveNote(id)}
                >
                  {children}
                </span>
              )
            }
            return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}

export { MarkdownPreview }
