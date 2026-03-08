// Parse [[wiki links]] from content
export function parseWikiLinks(content: string): string[] {
  const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
  const links: string[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1].trim())
  }
  return [...new Set(links)]
}

// Parse #tags from content
export function parseTags(content: string): string[] {
  const regex = /(?:^|\s)#([^\s#\[\](){}<>!@$%^&*+=?/\\|"'`,;:~]+)/g
  const tags: string[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    tags.push(match[1])
  }
  return [...new Set(tags)]
}

// Render wiki links in preview HTML - replace [[title]] with clickable spans
export function renderWikiLinks(content: string, noteMap: Map<string, string>): string {
  return content.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, title, alias) => {
    const display = alias || title
    const id = noteMap.get(title.trim())
    if (id) {
      return `<span class="wiki-link" data-note-id="${id}" onclick="window.__openNote&&window.__openNote('${id}')">${display}</span>`
    }
    return `<span class="wiki-link wiki-link--missing" title="笔记不存在">${display}</span>`
  })
}

// Extract title from markdown content (first # heading or first line)
export function extractTitle(content: string): string {
  const headingMatch = content.match(/^#\s+(.+)$/m)
  if (headingMatch) return headingMatch[1].trim()
  const firstLine = content.split('\n').find(l => l.trim())
  return firstLine?.replace(/^#+\s*/, '').trim() || '无标题'
}
