// Type definitions — storage is handled by Supabase

export interface Folder {
  id: string
  name: string
  parentId: string | null
  position: number
  createdAt: string
}

export interface Note {
  id: string
  title: string
  content: string
  folderId: string | null
  tags: string[]
  aiSummary: string
  createdAt: string
  updatedAt: string
}

export interface Settings {
  id: string
  theme: 'light' | 'dark' | 'system'
  sidebarWidth: number
}

// DB row shapes (snake_case from Supabase)
export interface NoteRow {
  id: string
  user_id: string
  folder_id: string | null
  title: string
  content: string
  tags: string[]
  ai_summary: string | null
  created_at: string
  updated_at: string
}

export interface FolderRow {
  id: string
  user_id: string
  name: string
  parent_id: string | null
  position: number
  created_at: string
}

export interface SettingsRow {
  id: string
  user_id: string
  settings: Record<string, unknown>
  updated_at: string
}

// Map DB rows to frontend types
export function noteFromRow(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    folderId: row.folder_id,
    tags: row.tags ?? [],
    aiSummary: row.ai_summary ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function folderFromRow(row: FolderRow): Folder {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    position: row.position,
    createdAt: row.created_at,
  }
}

export const SEED_CONTENT = `# 欢迎使用 NoteFlow ✨

NoteFlow 是一款美观、强大的个人知识管理工具。

## 核心功能

- **Markdown 编辑**：完整支持 GFM 语法，实时预览
- **双向链接**：使用 \`[[笔记标题]]\` 语法连接笔记
- **标签系统**：在内容中使用 \`#标签\` 添加标签
- **AI 辅助**：智能摘要与写作助手
- **全文搜索**：按 \`Cmd+K\` 快速搜索所有笔记
- **数据导出**：一键导出所有笔记为 Markdown 文件

## 快速开始

1. 点击左上角 **+** 新建笔记
2. 使用 \`[[笔记名称]]\` 创建笔记间的链接

## Markdown 示例

\`\`\`javascript
// 代码块示例
const greeting = "Hello, NoteFlow!"
console.log(greeting)
\`\`\`

> 引用：好的工具让思考更自由。

| 功能 | 状态 |
|------|------|
| Markdown 编辑 | ✅ |
| 双向链接 | ✅ |
| AI 摘要 | ✅ |

---

开始记录你的第一篇笔记吧！
`
