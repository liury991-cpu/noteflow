import { create } from 'zustand'
import { supabase } from '../lib/supabase'
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

const DEFAULT_SETTINGS: Omit<Settings, 'id'> = {
  theme: 'light',
  sidebarWidth: 240,
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    let settingsData: Record<string, unknown>

    if (error || !data) {
      settingsData = { ...DEFAULT_SETTINGS }
      await supabase
        .from('user_settings')
        .insert({ user_id: user.id, settings: settingsData })
    } else {
      settingsData = (data.settings as Record<string, unknown>) ?? {}
    }

    const settings: Settings = {
      id: user.id,
      theme: (settingsData.theme as Theme) ?? 'light',
      sidebarWidth: (settingsData.sidebarWidth as number) ?? 240,
    }

    const resolved = applyTheme(settings.theme)
    set({ settings, theme: settings.theme, resolvedTheme: resolved })
  },

  saveSettings: async (patch) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const current = get().settings ?? { ...DEFAULT_SETTINGS, id: user.id }
    const updated: Settings = { ...current, ...patch }

    const settingsJson: Record<string, unknown> = {
      theme: updated.theme,
      sidebarWidth: updated.sidebarWidth,
    }

    await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, settings: settingsJson })

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
