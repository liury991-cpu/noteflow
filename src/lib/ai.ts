export type AIProvider = 'anthropic' | 'openai'
export type AIAction = 'summarize' | 'expand' | 'rewrite' | 'continue' | 'shorten'

const PROMPTS: Record<AIAction, (text: string) => string> = {
  summarize: (text) =>
    `请为以下笔记内容生成一段简洁的摘要（3-5句话，不超过100字），保留核心观点：\n\n${text}`,
  expand: (text) =>
    `请将以下内容进行扩写，使其更加详细和充实，保持原有风格：\n\n${text}`,
  rewrite: (text) =>
    `请对以下内容进行润色改写，使表达更加流畅自然，保持原意：\n\n${text}`,
  continue: (text) =>
    `请根据以下内容的风格和主题，继续写下去（200字以内）：\n\n${text}`,
  shorten: (text) =>
    `请将以下内容精简压缩，保留核心信息，去除冗余表达：\n\n${text}`,
}

interface StreamOptions {
  apiKey: string
  provider: AIProvider
  action: AIAction
  text: string
  onChunk: (chunk: string) => void
  onDone: () => void
  onError: (error: string) => void
}

export async function streamAI(opts: StreamOptions) {
  const { apiKey, provider, action, text, onChunk, onDone, onError } = opts
  const prompt = PROMPTS[action](text)

  try {
    if (provider === 'anthropic') {
      await streamAnthropic(apiKey, prompt, onChunk, onDone, onError)
    } else {
      await streamOpenAI(apiKey, prompt, onChunk, onDone, onError)
    }
  } catch (err) {
    onError(err instanceof Error ? err.message : '未知错误')
  }
}

async function streamAnthropic(
  apiKey: string,
  prompt: string,
  onChunk: (c: string) => void,
  onDone: () => void,
  onError: (e: string) => void,
) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    onError((err as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}`)
    return
  }

  const reader = res.body?.getReader()
  if (!reader) { onError('No response body'); return }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data)
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
          onChunk(parsed.delta.text)
        }
      } catch { /* skip malformed */ }
    }
  }
  onDone()
}

async function streamOpenAI(
  apiKey: string,
  prompt: string,
  onChunk: (c: string) => void,
  onDone: () => void,
  onError: (e: string) => void,
) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      stream: true,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    onError((err as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}`)
    return
  }

  const reader = res.body?.getReader()
  if (!reader) { onError('No response body'); return }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data)
        const delta = parsed.choices?.[0]?.delta?.content
        if (delta) onChunk(delta)
      } catch { /* skip */ }
    }
  }
  onDone()
}
