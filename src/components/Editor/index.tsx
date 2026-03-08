import { useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useNoteStore } from '../../store/noteStore'
import { useUIStore } from '../../store/uiStore'

const AUTOSAVE_DELAY = 600

const editorStyles = `
  .ProseMirror {
    outline: none;
    min-height: 100%;
    padding: 1.5rem;
    font-size: 16px;
    line-height: 1.75;
    color: var(--text);
  }
  .ProseMirror p {
    margin: 0 0 1em 0;
  }
  .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 {
    font-weight: 600;
    margin: 1.5em 0 0.5em 0;
  }
  .ProseMirror h1:first-child,
  .ProseMirror h2:first-child,
  .ProseMirror h3:first-child {
    margin-top: 0;
  }
  .ProseMirror ul, .ProseMirror ol {
    padding-left: 1.5em;
    margin: 0.5em 0;
  }
  .ProseMirror li {
    margin: 0.25em 0;
  }
  .ProseMirror blockquote {
    border-left: 3px solid var(--accent);
    padding-left: 1em;
    margin: 1em 0;
    color: var(--text-muted);
  }
  .ProseMirror code {
    background: var(--bg-subtle);
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-size: 0.9em;
  }
  .ProseMirror pre {
    background: var(--bg-subtle);
    padding: 1em;
    border-radius: 8px;
    overflow-x: auto;
  }
  .ProseMirror pre code {
    background: none;
    padding: 0;
  }
  .ProseMirror hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 1.5em 0;
  }
  .ProseMirror a {
    color: var(--accent);
    text-decoration: underline;
  }
  .ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    color: var(--text-muted);
    pointer-events: none;
    float: left;
    height: 0;
  }
  .ProseMirror strong {
    font-weight: 600;
  }
  .ProseMirror em {
    font-style: italic;
  }
`

function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none" style={{ color: 'var(--text)' }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

export function Editor() {
  const { activeNote, updateNote } = useNoteStore()
  const { viewMode } = useUIStore()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const updateNoteRef = useRef(updateNote)
  updateNoteRef.current = updateNote
  const lastNoteIdRef = useRef<string | null>(null)

  const scheduleAutosave = useCallback((content: string, noteId: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      updateNoteRef.current(noteId, { content })
    }, AUTOSAVE_DELAY)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: '开始写作...',
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      if (activeNote?.id) {
        scheduleAutosave(editor.getText(), activeNote.id)
      }
    },
    editorProps: {
      attributes: {
        class: 'flex-1 overflow-auto',
      },
    },
  })

  // Sync content when switching notes or external update
  useEffect(() => {
    if (!editor) return

    const newContent = activeNote?.content ?? ''
    const currentContent = editor.getText()

    // Only update if note changed OR content is different (external update)
    if (activeNote?.id !== lastNoteIdRef.current || newContent !== currentContent) {
      lastNoteIdRef.current = activeNote?.id ?? null
      editor.commands.setContent(newContent || '<p></p>')
    }
  }, [editor, activeNote?.id, activeNote?.content])

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const showEditor = viewMode === 'edit' || viewMode === 'split'
  const showPreview = viewMode === 'preview' || viewMode === 'split'

  return (
    <div className="flex flex-1 overflow-hidden">
      <style>{editorStyles}</style>

      {/* Editor pane */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{
          display: showEditor ? 'flex' : 'none',
          flexDirection: 'column',
          borderRight: showPreview ? '1px solid var(--border)' : 'none',
        }}
      >
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
        {editor && (
          <EditorContent
            editor={editor}
            className="flex-1 overflow-auto"
            style={{
              maxWidth: showPreview ? 'none' : 720,
              margin: showPreview ? 0 : '0 auto',
              background: 'var(--bg)',
            }}
          />
        )}
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
              暂无预览内容
            </div>
          )}
        </div>
      )}
    </div>
  )
}
