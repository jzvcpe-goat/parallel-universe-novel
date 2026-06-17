// ============================================================
// AuthModal - 登录/注册模态框
// ============================================================
// 对照HTML文件: 量子墨痕 Portal，支持登录和注册切换

import { useState } from 'react'
import type { FormEvent } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/primitives/Button'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onLogin?: (identifier: string, password: string) => void
  onRegister?: (data: { username: string; email: string; password: string; displayName: string }) => void
  loading?: boolean
  error?: string | null
  className?: string
}

export function AuthModal({ isOpen, onClose, onLogin, onRegister, loading, error, className }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (mode === 'login') {
      onLogin?.(identifier, password)
    } else {
      onRegister?.({ username, email, password, displayName })
    }
  }

  return (
    <div className={cn('fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100]', className)}>
      <div className="bg-[#1a1a1e]/90 backdrop-blur-xl w-full max-w-md p-10 rounded-3xl relative border border-white/5">
        {/* Close */}
        <button
          className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
          onClick={onClose}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-100">量子墨痕 Portal</h2>
          <p className="text-slate-400 text-sm mt-2">
            {mode === 'login' ? '连接你的意识，进入无限 IF 线' : '在平行宇宙中创建你的身份'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="text-xs text-slate-500 ml-4 mb-2 block">量子 ID</label>
                <input
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-3.5 px-6 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                  placeholder="ink_traveler_2026"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 ml-4 mb-2 block">显示名称</label>
                <input
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-3.5 px-6 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                  placeholder="墨痕行者"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 ml-4 mb-2 block">邮箱</label>
                <input
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-3.5 px-6 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                  placeholder="reader@parallel.ink"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </>
          )}
          {mode === 'login' && (
            <div>
              <label className="text-xs text-slate-500 ml-4 mb-2 block">量子 ID / 邮箱</label>
              <input
                className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-3.5 px-6 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                placeholder="ink_traveler_2026"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <label className="text-xs text-slate-500 ml-4 mb-2 block">
              {mode === 'login' ? '神经脉冲密码' : '密码'}
            </label>
            <input
              className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-3.5 px-6 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            variant="generation"
            size="lg"
            className="w-full"
            loading={loading}
          >
            {mode === 'login' ? '即刻降临' : '创建身份'}
          </Button>
        </form>

        {/* Toggle mode */}
        <div className="mt-8 text-center text-sm">
          <span className="text-slate-500">
            {mode === 'login' ? '还未唤醒灵魂？' : '已有量子身份？'}
          </span>
          <button
            className="text-blue-400 font-bold ml-2 hover:underline"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? '立即注册' : '直接登录'}
          </button>
        </div>
      </div>
    </div>
  )
}
