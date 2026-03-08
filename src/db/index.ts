import Dexie, { type EntityTable } from 'dexie'

export interface Folder {
  id: string
  name: string
  parentId: string | null
  position: number
  createdAt: number
}

export interface Note {
  id: string
  title: string
  content: string
  folderId: string | null
  tags: string[]
  aiSummary: string
  createdAt: number
  updatedAt: number
}

export interface Settings {
  id: 'settings'
  theme: 'light' | 'dark' | 'system'
  apiKey: string
  apiProvider: 'anthropic' | 'openai'
  sidebarWidth: number
}

class NoteflowDB extends Dexie {
  notes!: EntityTable<Note, 'id'>
  folders!: EntityTable<Folder, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor() {
    super('noteflow')
    this.version(1).stores({
      notes: 'id, title, folderId, updatedAt, *tags',
      folders: 'id, parentId, position',
      settings: 'id',
    })
  }
}

export const db = new NoteflowDB()

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// Seed with welcome note on first run
export async function seedIfEmpty() {
  const count = await db.notes.count()
  if (count > 0) return

  const folderId = generateId()
  await db.folders.add({
    id: folderId,
    name: '入门指南',
    parentId: null,
    position: 0,
    createdAt: Date.now(),
  })

  await db.notes.add({
    id: generateId(),
    title: '欢迎使用 NoteFlow',
    folderId,
    tags: ['入门'],
    aiSummary: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    content: `# 欢迎使用 NoteFlow ✨

NoteFlow 是一款美观、强大的个人知识管理工具。

## 核心功能

- **Markdown 编辑**：完整支持 GFM 语法，实时预览
- **双向链接**：使用 \`[[笔记标题]]\` 语法连接笔记
- **标签系统**：在内容中使用 \`#标签\` 添加标签
- **AI 辅助**：智能摘要与写作助手（需配置 API Key）
- **全文搜索**：按 \`Cmd+K\` 快速搜索所有笔记
- **数据导出**：一键导出所有笔记为 Markdown 文件

## 快速开始

1. 点击左上角 **+** 新建笔记
2. 使用 \`[[笔记名称]]\` 创建笔记间的链接
3. 在右上角设置中配置 API Key 启用 AI 功能

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
`,
  })

  await db.notes.add({
    id: generateId(),
    title: '我的第一篇笔记',
    folderId: null,
    tags: [],
    aiSummary: '',
    createdAt: Date.now() + 1,
    updatedAt: Date.now() + 1,
    content: `# 我的第一篇笔记

在这里写下你的想法...

可以链接到 [[欢迎使用 NoteFlow]] 查看使用指南。
`,
  })
}
