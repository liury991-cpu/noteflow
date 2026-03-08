import { X, Moon, Sun, Monitor, Download } from 'lucide-react'
import { useUIStore } from '../store/uiStore'
import { exportAllNotes } from '../lib/export'

export function SettingsModal() {
  const { settingsOpen, closeSettings, setTheme, theme } = useUIStore()

  if (!settingsOpen) return null

  const handleExport = async () => {
    await exportAllNotes()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
      onClick={closeSettings}
    >
      <div
        className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden fade-in"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>设置</h2>
          <button onClick={closeSettings} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-6">
          {/* Theme */}
          <Section title="主题外观">
            <div className="flex gap-2">
              {([
                { value: 'light', icon: <Sun size={14} />, label: '浅色' },
                { value: 'dark', icon: <Moon size={14} />, label: '深色' },
                { value: 'system', icon: <Monitor size={14} />, label: '跟随系统' },
              ] as const).map(opt => (
                <ThemeBtn
                  key={opt.value}
                  active={theme === opt.value}
                  icon={opt.icon}
                  label={opt.label}
                  onClick={() => setTheme(opt.value)}
                />
              ))}
            </div>
          </Section>

          {/* Export */}
          <Section title="数据管理">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              <Download size={14} />
              导出所有笔记 (.zip)
            </button>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              将所有笔记导出为标准 Markdown 文件压缩包
            </p>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function ThemeBtn({ active, icon, label, onClick }: {
  active: boolean; icon: React.ReactNode; label: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-lg text-xs font-medium transition-all"
      style={{
        background: active ? 'var(--accent-bg)' : 'var(--bg-subtle)',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        cursor: 'pointer',
      }}
    >
      {icon}
      {label}
    </button>
  )
}
