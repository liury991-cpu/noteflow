import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { type Note, type Folder, noteFromRow, folderFromRow, type NoteRow, type FolderRow, SEED_CONTENT } from '../db'
import { parseWikiLinks, parseTags, extractTitle } from '../lib/links'

interface NoteStore {
  notes: Note[]
  folders: Folder[]
  activeNoteId: string | null
  activeNote: Note | null
  isLoading: boolean

  load: () => Promise<void>
  setActiveNote: (id: string | null) => void
  createNote: (folderId?: string | null) => Promise<string>
  updateNote: (id: string, patch: Partial<Omit<Note, 'id'>>) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  createFolder: (name: string, parentId?: string | null) => Promise<string>
  updateFolder: (id: string, name: string) => Promise<void>
  deleteFolder: (id: string) => Promise<void>

  // Derived helpers
  getBacklinks: (noteId: string) => Note[]
  getNoteByTitle: (title: string) => Note | undefined
  noteTitleMap: () => Map<string, string>
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

async function seedIfEmpty(userId: string) {
  const { count } = await supabase
    .from('notes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((count ?? 0) > 0) return

  const { data: folder } = await supabase
    .from('folders')
    .insert({ user_id: userId, name: '入门指南', parent_id: null, position: 0 })
    .select()
    .single()

  await supabase.from('notes').insert([
    {
      user_id: userId,
      folder_id: folder?.id ?? null,
      title: '欢迎使用 NoteFlow',
      content: SEED_CONTENT,
      tags: ['入门'],
      ai_summary: null,
    },
    {
      user_id: userId,
      folder_id: null,
      title: '我的第一篇笔记',
      content: '# 我的第一篇笔记\n\n在这里写下你的想法...\n\n可以链接到 [[欢迎使用 NoteFlow]] 查看使用指南。\n',
      tags: [],
      ai_summary: null,
    },
  ])
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  folders: [],
  activeNoteId: null,
  activeNote: null,
  isLoading: true,

  load: async () => {
    const userId = await getUserId()
    await seedIfEmpty(userId)

    const [notesRes, foldersRes] = await Promise.all([
      supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }),
      supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId)
        .order('position', { ascending: true }),
    ])

    const notes = (notesRes.data as NoteRow[] ?? []).map(noteFromRow)
    const folders = (foldersRes.data as FolderRow[] ?? []).map(folderFromRow)

    set({ notes, folders, isLoading: false })

    const lastId = localStorage.getItem('noteflow:activeNoteId')
    if (lastId && notes.find(n => n.id === lastId)) {
      set({ activeNoteId: lastId, activeNote: notes.find(n => n.id === lastId) || null })
    } else if (notes.length > 0) {
      set({ activeNoteId: notes[0].id, activeNote: notes[0] })
    }
  },

  setActiveNote: (id) => {
    if (id) localStorage.setItem('noteflow:activeNoteId', id)
    const note = id ? get().notes.find(n => n.id === id) || null : null
    set({ activeNoteId: id, activeNote: note })
  },

  createNote: async (folderId = null) => {
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: userId,
        folder_id: folderId ?? null,
        title: '新建笔记',
        content: '# 新建笔记\n\n',
        tags: [],
        ai_summary: null,
      })
      .select()
      .single()

    if (error) throw error
    const note = noteFromRow(data as NoteRow)
    set(s => ({
      notes: [note, ...s.notes],
      activeNoteId: note.id,
      activeNote: note,
    }))
    localStorage.setItem('noteflow:activeNoteId', note.id)
    return note.id
  },

  updateNote: async (id, patch) => {
    if (patch.content !== undefined) {
      patch.title = extractTitle(patch.content)
      patch.tags = parseTags(patch.content)
    }

    const dbPatch: Record<string, unknown> = {}
    if (patch.title !== undefined) dbPatch.title = patch.title
    if (patch.content !== undefined) dbPatch.content = patch.content
    if (patch.folderId !== undefined) dbPatch.folder_id = patch.folderId
    if (patch.tags !== undefined) dbPatch.tags = patch.tags
    if (patch.aiSummary !== undefined) dbPatch.ai_summary = patch.aiSummary

    const { data, error } = await supabase
      .from('notes')
      .update(dbPatch)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    const updated = noteFromRow(data as NoteRow)
    set(s => {
      const notes = s.notes.map(n => n.id === id ? updated : n)
      const activeNote = s.activeNoteId === id
        ? notes.find(n => n.id === id) || null
        : s.activeNote
      return { notes, activeNote }
    })
  },

  deleteNote: async (id) => {
    await supabase.from('notes').delete().eq('id', id)
    set(s => {
      const notes = s.notes.filter(n => n.id !== id)
      const activeNoteId = s.activeNoteId === id
        ? (notes[0]?.id ?? null)
        : s.activeNoteId
      const activeNote = notes.find(n => n.id === activeNoteId) || null
      if (activeNoteId) localStorage.setItem('noteflow:activeNoteId', activeNoteId)
      return { notes, activeNoteId, activeNote }
    })
  },

  createFolder: async (name, parentId = null) => {
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('folders')
      .insert({
        user_id: userId,
        name,
        parent_id: parentId ?? null,
        position: get().folders.length,
      })
      .select()
      .single()

    if (error) throw error
    const folder = folderFromRow(data as FolderRow)
    set(s => ({ folders: [...s.folders, folder] }))
    return folder.id
  },

  updateFolder: async (id, name) => {
    await supabase.from('folders').update({ name }).eq('id', id)
    set(s => ({
      folders: s.folders.map(f => f.id === id ? { ...f, name } : f),
    }))
  },

  deleteFolder: async (id) => {
    await supabase.from('notes').update({ folder_id: null }).eq('folder_id', id)
    await supabase.from('folders').delete().eq('id', id)
    set(s => ({
      folders: s.folders.filter(f => f.id !== id),
      notes: s.notes.map(n => n.folderId === id ? { ...n, folderId: null } : n),
    }))
  },

  getBacklinks: (noteId) => {
    const note = get().notes.find(n => n.id === noteId)
    if (!note) return []
    const titleMap = get().noteTitleMap()
    const targetTitle = note.title
    return get().notes.filter(n => {
      if (n.id === noteId) return false
      const links = parseWikiLinks(n.content)
      return links.some(link => {
        const linkedId = titleMap.get(link)
        return linkedId === noteId || link === targetTitle
      })
    })
  },

  getNoteByTitle: (title) => {
    return get().notes.find(n => n.title.toLowerCase() === title.toLowerCase())
  },

  noteTitleMap: () => {
    const map = new Map<string, string>()
    for (const note of get().notes) {
      map.set(note.title, note.id)
    }
    return map
  },
}))
