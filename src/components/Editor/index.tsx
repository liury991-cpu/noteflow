import { useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Typography from '@tiptap/extension-typography'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Markdown } from 'tiptap-markdown'
import { Extension, InputRule } from '@tiptap/core'

// 自定义扩展：添加列表输入规则
// 当用户输入 "1. " 或 "- " 时自动创建列表
// 注意：需要排除在任务列表中的情况
const ListInputRules = Extension.create({
  name: 'listInputRules',
  addInputRules() {
    return [
      // 有序列表：1. 2. 3. (仅在行首且不在任务列表中时触发)
      new InputRule({
        find: /^(\d+)\.\s$/,
        handler: ({ state, range, chain }) => {
          // 检查当前是否在任务列表中
          const $from = state.selection.$from
          if ($from.parent.type.name === 'taskItem') return
          chain().deleteRange(range).toggleOrderedList().run()
        },
      }),
      // 无序列表：- 或 * (仅在行首且不在任务列表中时触发)
      new InputRule({
        find: /^[-*]\s$/,
        handler: ({ state, range, chain }) => {
          // 检查当前是否在任务列表中
          const $from = state.selection.$from
          if ($from.parent.type.name === 'taskItem') return
          chain().deleteRange(range).toggleBulletList().run()
        },
      }),
    ]
  },
})
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useNoteStore } from '../../store/noteStore'
import { useUIStore } from '../../store/uiStore'
import {
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Link as LinkIcon, Image as ImageIcon, Code,
  Undo, Redo, Minus, CheckSquare,
} from 'lucide-react'

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
      className="p-1.5 rounded transition-colors hover:bg-black/5 dark:hover:bg-white/10"
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
    const url = window.prompt('输入图片链接:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const addLink = () => {
    const url = window.prompt('输入链接地址:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const toggleTaskList = () => {
    editor.chain().focus().toggleTaskList().run()
  }

  return (
    <div
      className="flex items-center gap-0.5 px-3 py-2 border-b overflow-x-auto"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
    >
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="加粗"
      >
        <Bold size={16} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="斜体"
      >
        <Italic size={16} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="下划线"
      >
        <span style={{ textDecoration: 'underline', fontSize: 14 }}>U</span>
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive('code')}
        title="行内代码"
      >
        <Code size={16} />
      </ToolbarBtn>

      <div className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />

      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })}
        title="标题1"
      >
        <Heading1 size={16} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="标题2"
      >
        <Heading2 size={16} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="标题3"
      >
        <Heading3 size={16} />
      </ToolbarBtn>

      <div className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />

      <ToolbarBtn
        onClick={() => {
          editor.chain().focus().toggleBulletList().run()
        }}
        active={editor.isActive('bulletList')}
        title="无序列表"
      >
        <List size={16} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => {
          editor.chain().focus().toggleOrderedList().run()
        }}
        active={editor.isActive('orderedList')}
        title="有序列表"
      >
        <ListOrdered size={16} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={toggleTaskList}
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

      <div className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />

      <ToolbarBtn onClick={addLink} active={editor.isActive('link')} title="插入链接">
        <LinkIcon size={16} />
      </ToolbarBtn>
      <ToolbarBtn onClick={addImage} title="插入图片">
        <ImageIcon size={16} />
      </ToolbarBtn>

      <div className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />

      <ToolbarBtn
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="撤销"
      >
        <Undo size={16} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="重做"
      >
        <Redo size={16} />
      </ToolbarBtn>
    </div>
  )
}

const editorStyles = `
  .ProseMirror {
    outline: none;
    min-height: 100%;
    padding: 1.5rem 2rem;
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
    cursor: pointer;
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
  .ProseMirror ul, .ProseMirror ol { padding-left: 1.5em; margin: 0.5em 0; list-style-type: disc; }
  .ProseMirror ol { list-style-type: decimal; }
  .ProseMirror li { margin: 0.25em 0; }
  .ProseMirror li > p { margin: 0; }
  .ProseMirror p { margin: 0.5em 0; }
`

export function Editor() {
  const { activeNote, updateNote } = useNoteStore()
  const { viewMode } = useUIStore()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const updateNoteRef = useRef(updateNote)
  updateNoteRef.current = updateNote
  const lastNoteIdRef = useRef<string | null>(null)

  const scheduleAutosave = useCallback((markdown: string, noteId: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      updateNoteRef.current(noteId, { content: markdown })
    }, AUTOSAVE_DELAY)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: '开始写作...',
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Underline,
      Typography,
      ListInputRules,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      if (activeNote?.id) {
        // Get Markdown content from tiptap-markdown
        const markdown = (editor.storage as { markdown?: { getMarkdown: () => string } }).markdown?.getMarkdown?.() || editor.getText()
        scheduleAutosave(markdown, activeNote.id)
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

  // Sync content when switching notes or external update (AI insert)
  useEffect(() => {
    if (!editor) return

    const newContent = activeNote?.content ?? ''
    const currentContent = editor.getText()

    // Always sync when note changes OR when content is updated externally (AI insert)
    if (activeNote?.id !== lastNoteIdRef.current || (lastNoteIdRef.current && newContent !== currentContent)) {
      lastNoteIdRef.current = activeNote?.id ?? null
      if (newContent) {
        editor.commands.setContent(newContent)
      } else {
        editor.commands.clearContent()
      }
    }
  }, [editor, activeNote?.id, activeNote?.content])

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  // Only show editor (no preview) - simplified for WYSIWYG
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
            background: 'var(--bg)',
          }}
        />
      </div>

      {/* Preview pane - renders Markdown to HTML */}
      {showPreview && activeNote && (
        <div
          className="flex-1 overflow-auto px-8 py-5"
          style={{ maxWidth: showEditor ? 'none' : 800, margin: '0 auto' }}
        >
          <div className="prose prose-sm max-w-none" style={{ color: 'var(--text)' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeNote.content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
