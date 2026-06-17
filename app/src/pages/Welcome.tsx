// ============================================================
// Welcome Landing Page - 品牌官网着陆页
// ============================================================
// 星云背景 + 视差效果 + 邀请式入口
// 首次访问加载，已登录用户自动跳转

import { useNavigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'

/* ─── CSS 星云动画（内联样式避免额外文件） ─── */
const NEBULA_STYLES = `
@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(20px, -30px) scale(1.02); }
  66% { transform: translate(-15px, 15px) scale(0.98); }
}
@keyframes pulse-glow {
  0%, 100% { opacity: 0.4; filter: blur(60px); }
  50% { opacity: 0.7; filter: blur(80px); }
}
@keyframes twinkle {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
}
@keyframes gate-glow {
  0%, 100% { box-shadow: 0 0 30px rgba(99,102,241,0.2), 0 0 60px rgba(139,92,246,0.1); }
  50% { box-shadow: 0 0 50px rgba(99,102,241,0.4), 0 0 100px rgba(139,92,246,0.2); }
}
.atmosphere {
  animation: float 20s ease-in-out infinite, pulse-glow 8s ease-in-out infinite;
  will-change: transform;
}
.atmosphere-2 { animation-delay: -7s; }
.atmosphere-3 { animation-delay: -14s; }
.star { animation: twinkle 3s ease-in-out infinite; }
.gate-ring { animation: gate-glow 4s ease-in-out infinite; }
`

const CORE_VALUES = [
  {
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4"/><path d="M12 16V8"/></svg>,
    title: 'AI叙事推演',
    desc: '大语言模型实时生成无限IF线分支，每一个选择都诞生全新的故事走向',
  },
  {
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    title: '平行宇宙探索',
    desc: '在多元宇宙的无限可能中自由穿梭，探索经典故事的每一种可能结局',
  },
  {
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
    title: '创作自由',
    desc: '上传你的原创故事或选择公共文学作品，构建属于你的平行宇宙世界',
  },
  {
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    title: '社区共建',
    desc: '与创作者们共同丰富平行宇宙的每一个角落，分享你的IF线创作',
  },
]

function StarField() {
  const stable = (seed: number, salt: number) => {
    const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453
    return value - Math.floor(value)
  }

  const stars = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    left: `${stable(i, 1) * 100}%`,
    top: `${stable(i, 2) * 100}%`,
    size: stable(i, 3) * 2 + 1,
    delay: stable(i, 4) * 5,
    duration: stable(i, 5) * 3 + 2,
  }))
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map(s => (
        <div key={s.id} className="star absolute rounded-full bg-white"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s` }} />
      ))}
    </div>
  )
}

export default function Welcome() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  // 已登录用户自动跳转到应用
  if (isAuthenticated) {
    navigate('/', { replace: true })
    return null
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0f] overflow-hidden flex flex-col">
      <style>{NEBULA_STYLES}</style>

      {/* ─── 星云背景 ─── */}
      <div className="fixed inset-0 pointer-events-none">
        {/* 星云团1 - 左上方 */}
        <div className="atmosphere absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, rgba(139,92,246,0.15) 40%, transparent 70%)' }} />
        {/* 星云团2 - 右下方 */}
        <div className="atmosphere atmosphere-2 absolute top-[40%] -right-[15%] w-[60vw] h-[60vw] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, rgba(99,102,241,0.1) 45%, transparent 70%)' }} />
        {/* 星云团3 - 中央偏下 */}
        <div className="atmosphere atmosphere-3 absolute top-[60%] left-[20%] w-[50vw] h-[50vw] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, rgba(99,102,241,0.08) 50%, transparent 70%)' }} />
        {/* 金色星点群 */}
        <div className="atmosphere absolute top-[15%] right-[25%] w-[20vw] h-[20vw] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 60%)', animationDelay: '-5s' }} />
        <StarField />
      </div>

      {/* ─── 导航栏 ─── */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>
          </div>
          <span className="text-lg font-bold text-white">平行宇宙小说</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/?auth=login')} className="text-sm text-slate-400 hover:text-white transition-colors">登录</button>
          <button onClick={() => { navigate('/?auth=register') }} className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400 hover:bg-blue-500/20 transition-all">注册</button>
        </div>
      </nav>

      {/* ─── 主视觉区 ─── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* 邀请式入口 - 中央星云漩涡 */}
        <div className="relative mb-10">
          {/* 外环 */}
          <div className="gate-ring w-48 h-48 md:w-64 md:h-64 rounded-full border border-indigo-500/20 flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
            onClick={() => navigate('/')}>
            {/* 内环 */}
            <div className="w-32 h-32 md:w-44 md:h-44 rounded-full border border-purple-500/30 flex items-center justify-center bg-white/[0.02]">
              {/* 中心图标 */}
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"><path d="M5 3v18M19 3v18M5 12h14M5 7h14M5 17h14"/></svg>
              </div>
            </div>
            {/* 光点装饰 */}
            <div className="absolute -top-2 left-1/2 w-1.5 h-1.5 rounded-full bg-indigo-400 star" />
            <div className="absolute -bottom-1 right-1/4 w-1 h-1 rounded-full bg-purple-400 star" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/3 -left-2 w-1 h-1 rounded-full bg-amber-300 star" style={{ animationDelay: '2s' }} />
          </div>
          {/* 提示文字 */}
          <p className="mt-4 text-xs text-indigo-400/60 tracking-widest uppercase">点击入口 · 开始探索</p>
        </div>

        {/* 产品名称 */}
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
          平行宇宙小说
        </h1>
        {/* 英文副标题 */}
        <p className="text-sm text-indigo-400/60 tracking-[0.3em] uppercase mb-6">Parallel Narrative</p>
        {/* 核心宣传语 */}
        <p className="text-lg md:text-xl text-slate-400 max-w-lg mb-10 leading-relaxed">
          每一个选择，都是新宇宙的诞生
        </p>

        {/* CTA按钮 */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')}
            className="group px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 transition-all flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            开始探索
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="group-hover:translate-x-0.5 transition-transform"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <button onClick={() => document.getElementById('values')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 font-medium text-sm hover:bg-white/10 hover:border-white/20 transition-all">
            了解更多
          </button>
        </div>
      </main>

      {/* ─── 核心价值区 ─── */}
      <section id="values" className="relative z-10 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-12">核心价值</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CORE_VALUES.map((v, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all group">
                <div className="mb-4">{v.icon}</div>
                <h3 className="text-base font-bold text-white mb-2">{v.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 页脚 ─── */}
      <footer className="relative z-10 py-8 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600"> 2026 NarrativeOS Team. All Rights Reserved.</p>
          <div className="flex items-center gap-6 text-xs text-slate-600">
            <span className="hover:text-slate-400 cursor-pointer transition-colors">用户协议</span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">隐私政策</span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">联系我们</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
