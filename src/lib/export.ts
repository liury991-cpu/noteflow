import JSZip from 'jszip'
import { db } from '../db'

export async function exportAllNotes() {
  const notes = await db.notes.toArray()
  const folders = await db.folders.toArray()

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

    // Add frontmatter
    const frontmatter = [
      '---',
      `title: "${note.title}"`,
      `tags: [${note.tags.map(t => `"${t}"`).join(', ')}]`,
      `created: ${new Date(note.createdAt).toISOString()}`,
      `updated: ${new Date(note.updatedAt).toISOString()}`,
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
