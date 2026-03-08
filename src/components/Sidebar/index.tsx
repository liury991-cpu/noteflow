import { useState, useRef } from 'react'
import {
  ChevronRight, ChevronDown, Folder, FolderOpen,
  FilePlus, FolderPlus, Hash, Clock, Search,
  MoreHorizontal, Trash2, Edit3, Tag,
} from 'lucide-react'
import { useNoteStore } from '../../store/noteStore'
import { useUIStore } from '../../store/uiStore'
import type { Folder as FolderType, Note } from '../../db'

export function Sidebar() {
  const { notes, folders, activeNoteId, setActiveNote, createNote, createFolder, deleteNote, deleteFolder, updateFolder } = useNoteStore()
  const { openSearch } = useUIStore()
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'files' | 'tags'>('files')
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const folderInputRef = useRef<HTMLInputElement>(null)

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const startEditFolder = (folder: FolderType) => {
    setEditingFolderId(folder.id)
    setEditingFolderName(folder.name)
    setTimeout(() => folderInputRef.current?.select(), 50)
  }

  const commitEditFolder = async () => {
    if (editingFolderId && editingFolderName.trim()) {
      await updateFolder(editingFolderId, editingFolderName.trim())
    }
    setEditingFolderId(null)
  }

  // Get all tags from all notes
  const allTags = [...new Set(notes.flatMap(n => n.tags))].sort()
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const rootFolders = folders.filter(f => !f.parentId)
  const unfiledNotes = notes.filter(n => !n.folderId)

  const notesInFolder = (folderId: string) => notes.filter(n => n.folderId === folderId)
  const taggedNotes = selectedTag ? notes.filter(n => n.tags.includes(selectedTag)) : []

  return (
    <aside
      className="flex flex-col h-full border-r select-none"
      style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>NoteFlow</span>
        <div className="flex items-center gap-1">
          <IconBtn title="搜索 (⌘K)" onClick={openSearch}><Search size={14} /></IconBtn>
          <IconBtn title="新建文件夹" onClick={() => createFolder('新建文件夹')}><FolderPlus size={14} /></IconBtn>
          <IconBtn title="新建笔记" onClick={() => createNote()}><FilePlus size={14} /></IconBtn>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
        <TabBtn active={activeTab === 'files'} onClick={() => setActiveTab('files')}>
          <Folder size={12} /> 文件
        </TabBtn>
        <TabBtn active={activeTab === 'tags'} onClick={() => setActiveTab('tags')}>
          <Hash size={12} /> 标签
        </TabBtn>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-1">
        {activeTab === 'files' && (
          <>
            {rootFolders.map(folder => (
              <FolderItem
                key={folder.id}
                folder={folder}
                notes={notesInFolder(folder.id)}
                expanded={expandedFolders.has(folder.id)}
                activeNoteId={activeNoteId}
                editingFolderId={editingFolderId}
                editingFolderName={editingFolderName}
                folderInputRef={folderInputRef}
                onToggle={() => toggleFolder(folder.id)}
                onSelectNote={setActiveNote}
                onNewNote={() => { createNote(folder.id); if (!expandedFolders.has(folder.id)) toggleFolder(folder.id) }}
                onDeleteFolder={() => deleteFolder(folder.id)}
                onDeleteNote={deleteNote}
                onEditFolder={() => startEditFolder(folder)}
                onEditFolderNameChange={setEditingFolderName}
                onEditFolderCommit={commitEditFolder}
              />
            ))}

            {unfiledNotes.length > 0 && (
              <div className="mt-1">
                <div className="px-3 py-1 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  未分类
                </div>
                {unfiledNotes.map(note => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    active={note.id === activeNoteId}
                    onSelect={() => setActiveNote(note.id)}
                    onDelete={() => deleteNote(note.id)}
                    depth={1}
                  />
                ))}
              </div>
            )}

            {notes.length === 0 && (
              <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                点击右上角 + 创建第一篇笔记
              </div>
            )}
          </>
        )}

        {activeTab === 'tags' && (
          <>
            {allTags.length === 0 && (
              <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                在笔记中使用 #标签 添加标签
              </div>
            )}
            {allTags.map(tag => (
              <div key={tag}>
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left rounded-none"
                  style={{
                    color: selectedTag === tag ? 'var(--accent)' : 'var(--text)',
                    background: selectedTag === tag ? 'var(--accent-bg)' : 'transparent',
                  }}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                >
                  <Tag size={13} style={{ color: 'var(--text-muted)' }} />
                  <span>{tag}</span>
                  <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
                    {notes.filter(n => n.tags.includes(tag)).length}
                  </span>
                </button>
                {selectedTag === tag && taggedNotes.map(note => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    active={note.id === activeNoteId}
                    onSelect={() => setActiveNote(note.id)}
                    onDelete={() => deleteNote(note.id)}
                    depth={2}
                  />
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Recent notes footer */}
      <div className="border-t px-3 py-2" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Clock size={11} />
          <span>{notes.length} 篇笔记</span>
        </div>
      </div>
    </aside>
  )
}

function FolderItem({
  folder, notes, expanded, activeNoteId,
  editingFolderId, editingFolderName, folderInputRef,
  onToggle, onSelectNote, onNewNote, onDeleteFolder, onDeleteNote,
  onEditFolder, onEditFolderNameChange, onEditFolderCommit,
}: {
  folder: FolderType
  notes: Note[]
  expanded: boolean
  activeNoteId: string | null
  editingFolderId: string | null
  editingFolderName: string
  folderInputRef: React.RefObject<HTMLInputElement | null>
  onToggle: () => void
  onSelectNote: (id: string) => void
  onNewNote: () => void
  onDeleteFolder: () => void
  onDeleteNote: (id: string) => void
  onEditFolder: () => void
  onEditFolderNameChange: (name: string) => void
  onEditFolderCommit: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div>
      <div
        className="group flex items-center gap-1 px-2 py-1 cursor-pointer hover:opacity-80"
        style={{ color: 'var(--text)' }}
        onClick={onToggle}
      >
        <span style={{ color: 'var(--text-muted)' }}>
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          {expanded ? <FolderOpen size={14} /> : <Folder size={14} />}
        </span>

        {editingFolderId === folder.id ? (
          <input
            ref={folderInputRef}
            value={editingFolderName}
            onChange={e => onEditFolderNameChange(e.target.value)}
            onBlur={onEditFolderCommit}
            onKeyDown={e => { if (e.key === 'Enter') onEditFolderCommit() }}
            className="flex-1 text-xs bg-transparent outline-none"
            style={{ color: 'var(--text)' }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 text-xs font-medium truncate">{folder.name}</span>
        )}

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
          <IconBtn title="新建笔记" onClick={onNewNote}><FilePlus size={12} /></IconBtn>
          <div className="relative">
            <IconBtn title="更多" onClick={() => setShowMenu(s => !s)}><MoreHorizontal size={12} /></IconBtn>
            {showMenu && (
              <div
                className="absolute left-0 top-full z-50 rounded-md shadow-lg py-1 min-w-32 border text-sm"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                onMouseLeave={() => setShowMenu(false)}
              >
                <MenuItem icon={<Edit3 size={13} />} onClick={() => { onEditFolder(); setShowMenu(false) }}>重命名</MenuItem>
                <MenuItem icon={<Trash2 size={13} />} onClick={() => { onDeleteFolder(); setShowMenu(false) }} danger>删除文件夹</MenuItem>
              </div>
            )}
          </div>
        </div>
      </div>

      {expanded && notes.map(note => (
        <NoteItem
          key={note.id}
          note={note}
          active={note.id === activeNoteId}
          onSelect={() => onSelectNote(note.id)}
          onDelete={() => onDeleteNote(note.id)}
          depth={2}
        />
      ))}
    </div>
  )
}

function NoteItem({ note, active, onSelect, onDelete, depth }: {
  note: Note
  active: boolean
  onSelect: () => void
  onDelete: () => void
  depth: number
}) {
  const [showMenu, setShowMenu] = useState(false)
  const pl = depth * 12

  return (
    <div
      className="group relative flex items-center gap-2 py-1 pr-2 cursor-pointer text-sm"
      style={{
        paddingLeft: pl,
        background: active ? 'var(--accent-bg)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text)',
      }}
      onClick={onSelect}
    >
      <span className="text-xs" style={{ color: 'var(--text-muted)', fontSize: 11 }}>📄</span>
      <span className="flex-1 truncate text-xs">{note.title}</span>
      <div className="opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation() }}>
        <div className="relative">
          <IconBtn onClick={() => setShowMenu(s => !s)} title="更多"><MoreHorizontal size={12} /></IconBtn>
          {showMenu && (
            <div
              className="absolute right-0 top-full z-50 rounded-md shadow-lg py-1 min-w-28 border text-sm"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
              onMouseLeave={() => setShowMenu(false)}
            >
              <MenuItem icon={<Trash2 size={13} />} onClick={() => { onDelete(); setShowMenu(false) }} danger>删除</MenuItem>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="p-1 rounded hover:opacity-70 transition-opacity"
      style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
    >
      {children}
    </button>
  )
}

function TabBtn({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium border-b-2 transition-colors"
      style={{
        borderBottomColor: active ? 'var(--accent)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        background: 'transparent',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function MenuItem({ children, icon, onClick, danger }: { children: React.ReactNode; icon?: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs hover:opacity-80 transition-opacity"
      style={{ color: danger ? '#ef4444' : 'var(--text)', background: 'transparent', border: 'none', cursor: 'pointer' }}
    >
      {icon}
      {children}
    </button>
  )
}
