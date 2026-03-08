import { useEffect } from 'react'
import {
  PanelLeft, PanelRight, SplitSquareHorizontal,
  Eye, Pencil, Settings, Sparkles,
  Link, Clock, LogOut,
} from 'lucide-react'
import { useNoteStore } from './store/noteStore'
import { useUIStore } from './store/uiStore'
import { Sidebar } from './components/Sidebar'
import { Editor } from './components/Editor'
import { SearchModal } from './components/SearchModal'
import { AIPanel } from './components/AIPanel'
import { SettingsModal } from './pages/Settings'
import { AuthGuard } from './components/AuthGuard'
import { supabase } from './lib/supabase'

function AppInner() {
  const { load, activeNote } = useNoteStore()
  const {
    loadSettings, sidebarOpen, toggleSidebar,
    rightPanelOpen, toggleRightPanel,
    viewMode, setViewMode,
    openSettings, toggleAIPanel, aiPanelOpen,
  } = useUIStore()

  useEffect(() => {
    const init = async () => {
      await loadSettings()
      await load()
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { getBacklinks } = useNoteStore()
  const backlinks = activeNote ? getBacklinks(activeNote.id) : []

  return (
    <div className="flex h-full" style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <div
        className="flex-shrink-0 overflow-hidden"
        style={{
          width: sidebarOpen ? 240 : 0,
          transition: 'width 200ms ease-in-out',
        }}
      >
        {sidebarOpen && <Sidebar />}
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Toolbar */}
        <header
          className="flex items-center gap-1 px-3 h-11 border-b shrink-0"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
        >
          {/* Left controls */}
          <ToolBtn title="切换侧边栏" onClick={toggleSidebar} active={sidebarOpen}>
            <PanelLeft size={15} />
          </ToolBtn>

          {/* Note title */}
          <div className="flex-1 px-2 min-w-0">
            {activeNote && (
              <span className="text-sm font-medium truncate block" style={{ color: 'var(--text)' }}>
                {activeNote.title}
              </span>
            )}
          </div>

          {/* View mode */}
          <div className="flex items-center gap-0.5 mx-1 p-0.5 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
            <ViewBtn icon={<Pencil size={13} />} title="编辑" active={viewMode === 'edit'} onClick={() => setViewMode('edit')} />
            <ViewBtn icon={<SplitSquareHorizontal size={13} />} title="分屏" active={viewMode === 'split'} onClick={() => setViewMode('split')} />
            <ViewBtn icon={<Eye size={13} />} title="预览" active={viewMode === 'preview'} onClick={() => setViewMode('preview')} />
          </div>

          {/* Right controls */}
          <ToolBtn title="AI 助手" onClick={toggleAIPanel} active={aiPanelOpen}>
            <Sparkles size={15} />
          </ToolBtn>
          <ToolBtn title="切换右侧面板" onClick={toggleRightPanel} active={rightPanelOpen}>
            <PanelRight size={15} />
          </ToolBtn>
          <ToolBtn title="设置" onClick={openSettings}>
            <Settings size={15} />
          </ToolBtn>
          <ToolBtn title="退出登录" onClick={() => supabase.auth.signOut()}>
            <LogOut size={15} />
          </ToolBtn>
        </header>

        {/* Editor + right panel */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Editor />

          {/* Right panel */}
          {rightPanelOpen && (
            <div
              className="flex-shrink-0 border-l flex flex-col overflow-hidden"
              style={{ width: 260, borderColor: 'var(--border)', background: 'var(--bg-sidebar)' }}
            >
              {/* AI Panel */}
              {aiPanelOpen && (
                <div className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <PanelHeader icon={<Sparkles size={13} />} title="AI 助手" />
                  <AIPanel />
                </div>
              )}

              {/* Backlinks */}
              <div className="flex-1 overflow-y-auto">
                <PanelHeader icon={<Link size={13} />} title={`反向链接 (${backlinks.length})`} />
                {backlinks.length === 0 ? (
                  <div className="px-4 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    没有笔记链接到当前笔记
                  </div>
                ) : (
                  <div className="py-1">
                    {backlinks.map(note => (
                      <BacklinkItem
                        key={note.id}
                        note={note}
                        onClick={() => useNoteStore.getState().setActiveNote(note.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Note metadata */}
              {activeNote && (
                <div className="border-t p-3" style={{ borderColor: 'var(--border)' }}>
                  <PanelHeader icon={<Clock size={13} />} title="笔记信息" />
                  <div className="text-xs space-y-1 mt-1" style={{ color: 'var(--text-muted)' }}>
                    <div className="flex justify-between">
                      <span>创建</span>
                      <span>{new Date(activeNote.createdAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>修改</span>
                      <span>{new Date(activeNote.updatedAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>字数</span>
                      <span>{activeNote.content.replace(/\s/g, '').length}</span>
                    </div>
                    {activeNote.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {activeNote.tags.map(t => (
                          <span key={t} className="tag-pill">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <SearchModal />
      <SettingsModal />
    </div>
  )
}

export default function App() {
  return (
    <AuthGuard>
      <AppInner />
    </AuthGuard>
  )
}

function BacklinkItem({ note, onClick }: { note: { id: string; title: string; content: string }; onClick: () => void }) {
  const snippet = note.content.replace(/^#.*\n/, '').replace(/\n/g, ' ').slice(0, 80)
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-2 hover:opacity-70 transition-opacity"
      style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
    >
      <div className="text-xs font-medium" style={{ color: 'var(--text)' }}>{note.title}</div>
      <div className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{snippet}</div>
    </button>
  )
}

function PanelHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{title}</span>
    </div>
  )
}

function ToolBtn({ children, onClick, active, title }: {
  children: React.ReactNode; onClick?: () => void; active?: boolean; title?: string
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="p-1.5 rounded-md transition-colors"
      style={{
        background: active ? 'var(--accent-bg)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function ViewBtn({ icon, title, active, onClick }: {
  icon: React.ReactNode; title: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="p-1.5 rounded-md transition-colors"
      style={{
        background: active ? 'var(--bg-hover)' : 'transparent',
        color: active ? 'var(--text)' : 'var(--text-muted)',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {icon}
    </button>
  )
}
