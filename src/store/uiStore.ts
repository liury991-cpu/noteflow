import { create } from 'zustand'
import { db } from '../db'
import type { Settings } from '../db'

type Theme = 'light' | 'dark' | 'system'

interface UIStore {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  sidebarOpen: boolean
  rightPanelOpen: boolean
  viewMode: 'edit' | 'split' | 'preview'
  searchOpen: boolean
  settingsOpen: boolean
  aiPanelOpen: boolean

  settings: Settings | null
  loadSettings: () => Promise<void>
  saveSettings: (patch: Partial<Settings>) => Promise<void>

  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  toggleRightPanel: () => void
  setViewMode: (mode: 'edit' | 'split' | 'preview') => void
  openSearch: () => void
  closeSearch: () => void
  openSettings: () => void
  closeSettings: () => void
  toggleAIPanel: () => void
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme): 'light' | 'dark' {
  const resolved = theme === 'system' ? getSystemTheme() : theme
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  return resolved
}

export const useUIStore = create<UIStore>((set, get) => ({
  theme: 'light',
  resolvedTheme: 'light',
  sidebarOpen: true,
  rightPanelOpen: true,
  viewMode: 'split',
  searchOpen: false,
  settingsOpen: false,
  aiPanelOpen: false,
  settings: null,

  loadSettings: async () => {
    let settings = await db.settings.get('settings')
    if (!settings) {
      settings = {
        id: 'settings',
        theme: 'light',
        apiKey: '',
        apiProvider: 'anthropic',
        sidebarWidth: 240,
      }
      await db.settings.add(settings)
    }
    const resolved = applyTheme(settings.theme)
    set({ settings, theme: settings.theme, resolvedTheme: resolved })
  },

  saveSettings: async (patch) => {
    const current = get().settings!
    const updated = { ...current, ...patch }
    await db.settings.put(updated)
    set({ settings: updated })
    if (patch.theme) {
      const resolved = applyTheme(patch.theme as Theme)
      set({ theme: patch.theme as Theme, resolvedTheme: resolved })
    }
  },

  setTheme: (theme) => {
    const resolved = applyTheme(theme)
    set({ theme, resolvedTheme: resolved })
    get().saveSettings({ theme })
  },

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  toggleRightPanel: () => set(s => ({ rightPanelOpen: !s.rightPanelOpen })),
  setViewMode: (mode) => set({ viewMode: mode }),
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  toggleAIPanel: () => set(s => ({ aiPanelOpen: !s.aiPanelOpen })),
}))
