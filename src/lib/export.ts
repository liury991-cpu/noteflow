import JSZip from 'jszip'
import { supabase } from './supabase'
import { noteFromRow, folderFromRow, type NoteRow, type FolderRow } from '../db'

export async function exportAllNotes() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const [notesRes, foldersRes] = await Promise.all([
    supabase.from('notes').select('*').eq('user_id', user.id),
    supabase.from('folders').select('*').eq('user_id', user.id),
  ])

  const notes = (notesRes.data as NoteRow[] ?? []).map(noteFromRow)
  const folders = (foldersRes.data as FolderRow[] ?? []).map(folderFromRow)

  const folderMap = new Map(folders.map(f => [f.id, f.name]))
  const zip = new JSZip()

  for (const note of notes) {
    const folderName = note.folderId ? folderMap.get(note.folderId) || '未分类' : '未分类'
    const safeTitle = note.title.replace(/[/\\?%*:|"<>]/g, '-') || 'untitled'
    const filename = `${safeTitle}.md`

    let content = note.content
    if (note.aiSummary) {
      content = `<!-- AI摘要: ${note.aiSummary} -->\n\n` + content
    }

    const frontmatter = [
      '---',
      `title: "${note.title}"`,
      `tags: [${note.tags.map(t => `"${t}"`).join(', ')}]`,
      `created: ${note.createdAt}`,
      `updated: ${note.updatedAt}`,
      '---',
      '',
    ].join('\n')

    zip.folder(folderName)?.file(filename, frontmatter + content)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `noteflow-export-${new Date().toISOString().slice(0, 10)}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
