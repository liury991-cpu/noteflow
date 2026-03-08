import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Mode = 'signin' | 'signup'

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('注册成功！请检查邮箱完成验证。')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 shadow-lg"
        style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <Sparkles size={20} style={{ color: 'var(--accent)' }} />
          <span className="font-semibold text-base" style={{ color: 'var(--text)' }}>NoteFlow</span>
        </div>

        <h1 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>
          {mode === 'signin' ? '登录账号' : '创建账号'}
        </h1>
        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
          {mode === 'signin' ? '欢迎回来，请输入你的账号信息' : '填写邮箱和密码开始使用'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full text-sm px-3 py-2 rounded-lg"
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="至少 6 位"
              required
              minLength={6}
              className="w-full text-sm px-3 py-2 rounded-lg"
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                outline: 'none',
              }}
            />
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
              {error}
            </p>
          )}

          {message && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e' }}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {mode === 'signin' ? '登录' : '注册'}
          </button>
        </form>

        <p className="text-xs text-center mt-5" style={{ color: 'var(--text-muted)' }}>
          {mode === 'signin' ? '还没有账号？' : '已有账号？'}
          {' '}
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage('') }}
            className="font-medium"
            style={{ color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            {mode === 'signin' ? '立即注册' : '去登录'}
          </button>
        </p>
      </div>
    </div>
  )
}
