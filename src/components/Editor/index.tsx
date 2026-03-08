import { useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import { common, createLowlight } from 'lowlight'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useNoteStore } from '../../store/noteStore'
import { useUIStore } from '../../store/uiStore'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote,
  CheckSquare, Link as LinkIcon, Image as ImageIcon,
  Undo, Redo, Minus,
} from 'lucide-react'

const lowlight = createLowlight(common)

const AUTOSAVE_DELAY = 600

// Formatting toolbar button
function ToolbarBtn({
  onClick, active, disabled, title, children
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-1.5 rounded transition-colors"
      style={{
        background: active ? 'var(--accent-bg)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

// Formatting toolbar
function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null

  const addImage = () => {
    const url = window.prompt('输入图片 URL:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const addLink = () => {
    const url = window.prompt('输入链接 URL:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <div
      className="flex items-center gap-0.5 px-3 py-1.5 border-b overflow-x-auto"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
    >
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="加粗 (Cmd+B)"
      >
        <Bold size={16} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="斜体 (Cmd+I)"
      >
        <Italic size={16} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="下划线 (Cmd+U)"
      >
        <UnderlineIcon size={16} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        title="删除线"
      >
        <Strikethrough size={16} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive('code')}
        title="行内代码"
      >
        <Code size={16} />
      </ToolbarBtn>

      <div className="w-px h-4 mx-1" style={{ background: 'var(--border)' }} />

      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })}
        title="标题 1"
      >
        <Heading1 size={16} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="标题 2"
      >
        <Heading2 size={16} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="标题 3"
      >
        <Heading3 size={16} />
      </ToolbarBtn>

      <div className="w-px h-4 mx-1" style={{ background: 'var(--border)' }} />

      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="无序列表"
      >
        <List size={16} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="有序列表"
      >
        <ListOrdered size={16} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        active={editor.isActive('taskList')}
        title="任务列表"
      >
        <CheckSquare size={16} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        title="引用"
      >
        <Quote size={16} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="分隔线"
      >
        <Minus size={16} />
      </ToolbarBtn>

      <div className="w-px h-4 mx-1" style={{ background: 'var(--border)' }} />

      <ToolbarBtn onClick={addLink} active={editor.isActive('link')} title="添加链接">
        <LinkIcon size={16} />
      </ToolbarBtn>
      <ToolbarBtn onClick={addImage} title="添加图片">
        <ImageIcon size={16} />
      </ToolbarBtn>

      <div className="w-px h-4 mx-1" style={{ background: 'var(--border)' }} />

      <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="撤销 (Cmd+Z)">
        <Undo size={16} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="重做 (Cmd+Shift+Z)">
        <Redo size={16} />
      </ToolbarBtn>
    </div>
  )
}

const editorStyles = `
  .ProseMirror {
    outline: none;
    min-height: 100%;
    padding: 1.5rem;
    font-size: 16px;
    line-height: 1.75;
    color: var(--text);
  }
  .ProseMirror > * + * {
    margin-top: 0.75em;
  }
  .ProseMirror ul[data-type="taskList"] {
    list-style: none;
    padding: 0;
  }
  .ProseMirror ul[data-type="taskList"] li {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }
  .ProseMirror ul[data-type="taskList"] li > label {
    flex-shrink: 0;
    margin-top: 0.25em;
  }
  .ProseMirror ul[data-type="taskList"] li > div {
    flex: 1;
  }
  .ProseMirror ul[data-type="taskList"] input[type="checkbox"] {
    width: 1em;
    height: 1em;
    accent-color: var(--accent);
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
    font-family: 'JetBrains Mono', monospace;
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
    font-size: 0.85em;
  }
  .ProseMirror hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 1.5em 0;
  }
  .ProseMirror a {
    color: var(--accent);
    text-decoration: underline;
    cursor: pointer;
  }
  .ProseMirror img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 0.5em 0;
  }
  .ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    color: var(--text-muted);
    pointer-events: none;
    float: left;
    height: 0;
  }
  .ProseMirror h1 { font-size: 1.75em; font-weight: 700; margin: 1em 0 0.5em; }
  .ProseMirror h2 { font-size: 1.5em; font-weight: 600; margin: 1em 0 0.5em; }
  .ProseMirror h3 { font-size: 1.25em; font-weight: 600; margin: 1em 0 0.5em; }
  .ProseMirror ul, .ProseMirror ol { padding-left: 1.5em; margin: 0.5em 0; }
  .ProseMirror li { margin: 0.25em 0; }
  .ProseMirror p { margin: 0.5em 0; }
  /* Syntax highlighting */
  .hljs-comment, .hljs-quote { color: #6a737d; font-style: italic; }
  .hljs-keyword, .hljs-selector-tag { color: #d73a49; }
  .hljs-string, .hljs-doctag { color: #22863a; }
  .hljs-number, .hljs-literal { color: #005cc5; }
  .hljs-variable, .hljs-template-variable { color: #e36209; }
  .hljs-title, .hljs-section { color: #6f42c1; }
  .hljs-built_in { color: #005cc5; }
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
        codeBlock: false, // Disable default, use lowlight instead
      }),
      Placeholder.configure({
        placeholder: '开始写作...',
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Underline,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      if (activeNote?.id) {
        scheduleAutosave(editor.getText(), activeNote.id)
      }
    },
  })

  // Handle paste for images
  useEffect(() => {
    if (!editor) return

    const editorElement = editor.options.element as HTMLElement | undefined

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (!file) continue

          const reader = new FileReader()
          reader.onload = () => {
            const base64 = reader.result as string
            editor.chain().focus().setImage({ src: base64 }).run()
          }
          reader.readAsDataURL(file)
          break
        }
      }
    }

    if (editorElement) {
      editorElement.addEventListener('paste', handlePaste as EventListener)
      return () => editorElement.removeEventListener('paste', handlePaste as EventListener)
    }
  }, [editor])

  // Sync content when switching notes or external update
  useEffect(() => {
    if (!editor) return

    const newContent = activeNote?.content ?? ''
    const currentContent = editor.getText()

    if (activeNote?.id !== lastNoteIdRef.current || newContent !== currentContent) {
      lastNoteIdRef.current = activeNote?.id ?? null
      // Convert plain text to paragraphs
      const content = newContent || '<p></p>'
      if (content !== editor.getHTML() && content !== '<p></p>') {
        editor.commands.setContent(content)
      }
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
        className="flex-1 overflow-hidden relative flex flex-col"
        style={{
          display: showEditor ? 'flex' : 'none',
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

        {editor && <EditorToolbar editor={editor} />}

        <EditorContent
          editor={editor}
          className="flex-1 overflow-auto"
          style={{
            maxWidth: showPreview ? 'none' : 800,
            margin: showPreview ? 0 : '0 auto',
            background: 'var(--bg)',
            width: '100%',
          }}
        />
      </div>

      {/* Preview pane */}
      {showPreview && (
        <div
          className="flex-1 overflow-auto px-8 py-5"
          style={{ maxWidth: showEditor ? 'none' : 800, margin: '0 auto' }}
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
