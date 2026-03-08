import { create } from 'zustand'
import { db, generateId, type Note, type Folder } from '../db'
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

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  folders: [],
  activeNoteId: null,
  activeNote: null,
  isLoading: true,

  load: async () => {
    const [notes, folders] = await Promise.all([
      db.notes.orderBy('updatedAt').reverse().toArray(),
      db.folders.orderBy('position').toArray(),
    ])
    set({ notes, folders, isLoading: false })
    // Restore last active note
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
    const id = generateId()
    const now = Date.now()
    const note: Note = {
      id,
      title: '新建笔记',
      content: '# 新建笔记\n\n',
      folderId: folderId ?? null,
      tags: [],
      aiSummary: '',
      createdAt: now,
      updatedAt: now,
    }
    await db.notes.add(note)
    set(s => ({
      notes: [note, ...s.notes],
      activeNoteId: id,
      activeNote: note,
    }))
    localStorage.setItem('noteflow:activeNoteId', id)
    return id
  },

  updateNote: async (id, patch) => {
    const now = Date.now()
    // Auto-extract title and tags from content
    if (patch.content !== undefined) {
      patch.title = extractTitle(patch.content)
      patch.tags = parseTags(patch.content)
    }
    const fullPatch = { ...patch, updatedAt: now }
    await db.notes.update(id, fullPatch)
    set(s => {
      const notes = s.notes.map(n => n.id === id ? { ...n, ...fullPatch } : n)
      const activeNote = s.activeNoteId === id
        ? notes.find(n => n.id === id) || null
        : s.activeNote
      return { notes, activeNote }
    })
  },

  deleteNote: async (id) => {
    await db.notes.delete(id)
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
    const id = generateId()
    const folder: Folder = {
      id,
      name,
      parentId: parentId ?? null,
      position: get().folders.length,
      createdAt: Date.now(),
    }
    await db.folders.add(folder)
    set(s => ({ folders: [...s.folders, folder] }))
    return id
  },

  updateFolder: async (id, name) => {
    await db.folders.update(id, { name })
    set(s => ({
      folders: s.folders.map(f => f.id === id ? { ...f, name } : f),
    }))
  },

  deleteFolder: async (id) => {
    // Move notes in this folder to root
    const affected = await db.notes.where('folderId').equals(id).toArray()
    for (const note of affected) {
      await db.notes.update(note.id, { folderId: null })
    }
    await db.folders.delete(id)
    set(s => ({
      folders: s.folders.filter(f => f.id !== id),
      notes: s.notes.map(n => n.folderId === id ? { ...n, folderId: null } : n),
    }))
  },

  getBacklinks: (noteId) => {
    const note = get().notes.find(n => n.id === noteId)
    if (!note) return []
    const titleMap = get().noteTitleMap()
    // Reverse lookup
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
