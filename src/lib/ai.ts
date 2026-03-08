import { supabase } from './supabase'

export type AIProvider = 'anthropic' | 'openai'
export type AIAction = 'summarize' | 'expand' | 'rewrite' | 'continue' | 'shorten'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

interface StreamOptions {
  provider: AIProvider
  action: AIAction
  text: string
  onChunk: (chunk: string) => void
  onDone: () => void
  onError: (error: string) => void
}

export async function streamAI(opts: StreamOptions) {
  const { provider, action, text, onChunk, onDone, onError } = opts

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { onError('未登录'); return }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, text, provider }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      onError((err as { error?: string })?.error || `HTTP ${res.status}`)
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
          // Anthropic format
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            onChunk(parsed.delta.text)
          }
          // OpenAI format
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) onChunk(delta)
        } catch { /* skip malformed */ }
      }
    }
    onDone()
  } catch (err) {
    onError(err instanceof Error ? err.message : '未知错误')
  }
}
