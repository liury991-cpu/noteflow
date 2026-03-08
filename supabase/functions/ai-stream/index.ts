import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { action, text, provider = 'anthropic' } = await req.json() as {
      action: string
      text: string
      provider?: string
    }

    if (!action || !text) {
      return new Response(JSON.stringify({ error: 'Missing action or text' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const prompts: Record<string, string> = {
      summarize: `请对以下内容生成一段简洁的中文摘要（50-80字）：\n\n${text}`,
      expand:    `请对以下内容进行扩写，使其更加详细丰富：\n\n${text}`,
      rewrite:   `请对以下内容进行改写润色，优化表达，使行文更流畅：\n\n${text}`,
      continue:  `请基于以下内容进行续写，保持风格一致：\n\n${text}`,
      shorten:   `请对以下内容进行精简，去除冗余，保留核心信息：\n\n${text}`,
    }

    const prompt = prompts[action]
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (provider === 'openai') {
      const apiKey = Deno.env.get('OPENAI_API_KEY')
      if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          stream: true,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      })
    } else {
      // Anthropic
      const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          stream: true,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      })
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
