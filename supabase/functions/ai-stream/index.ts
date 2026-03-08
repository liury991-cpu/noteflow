const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, text } = await req.json() as {
      action: string
      text: string
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

    const apiKey = Deno.env.get('MINIMAX_API_KEY')
    if (!apiKey) throw new Error('MINIMAX_API_KEY not configured')

    // MiniMax API call
    const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return new Response(JSON.stringify({ error: `MiniMax API error: ${errText}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
