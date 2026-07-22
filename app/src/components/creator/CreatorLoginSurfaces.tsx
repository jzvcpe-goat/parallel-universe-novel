import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BookOpenCheck,
  Bookmark,
  FileCheck2,
  FolderKanban,
  LogIn,
  Mail,
  MessageSquareText,
  RefreshCw,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export type CreatorAccessTone = 'echo' | 'draft' | 'publish' | 'library'

export interface CreatorAccessCard {
  tone: CreatorAccessTone
  label: string
  title: string
  description: string
}

export interface CreatorAccessPreviewModel {
  title: string
  description: string
  cards: CreatorAccessCard[]
}

const accessToneIcon: Record<CreatorAccessTone, LucideIcon> = {
  echo: MessageSquareText,
  draft: Bookmark,
  publish: FileCheck2,
  library: FolderKanban,
}

export interface CreatorLoginPanelProps {
  email: string
  notice: string
  sending: boolean
  onEmailChange: (email: string) => void
  onSendLink: () => void
  onRefreshSession: () => void
}

export function CreatorLoginPanel({
  email,
  notice,
  sending,
  onEmailChange,
  onSendLink,
  onRefreshSession,
}: CreatorLoginPanelProps) {
  return (
    <Card
      variant="glass"
      padding="none"
      data-slot="creator-login-panel"
      className="overflow-hidden text-[var(--creator-text)]"
    >
      <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <section className="p-6 md:p-8" aria-labelledby="creator-login-heading">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--creator-accent-soft)] text-[var(--creator-accent)]">
            <ShieldCheck size={20} aria-hidden="true" />
          </div>
          <CardHeader className="mt-5 pb-0">
            <CardTitle id="creator-login-heading" className="text-2xl text-[var(--creator-text)]">
              回到你的创作现场
            </CardTitle>
            <CardDescription className="max-w-xl leading-6 text-[var(--creator-text-muted)]">
              登录后继续本机草稿、整理外界回声，并在作者确认后生成发布包。
            </CardDescription>
          </CardHeader>

          <CardContent className="mt-7 max-w-xl">
            <label htmlFor="creator-email" className="mb-2 block text-sm font-medium text-[var(--creator-text)]">
              作者邮箱
            </label>
            <div className="relative">
              <Mail
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--creator-text-dim)]"
                aria-hidden="true"
              />
              <Input
                id="creator-email"
                type="email"
                autoComplete="email"
                value={email}
                placeholder="name@example.com"
                className="pl-10"
                onChange={event => onEmailChange(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && email.trim() && !sending) onSendLink()
                }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="gold" onClick={onSendLink} disabled={!email.trim() || sending} loading={sending}>
                <Send size={16} aria-hidden="true" />
                发送登录链接
              </Button>
              <Button variant="outline" onClick={onRefreshSession} disabled={sending}>
                <RefreshCw size={16} aria-hidden="true" />
                我已完成登录
              </Button>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--creator-text-muted)]" aria-live="polite">
              {notice}
            </p>
          </CardContent>
        </section>

        <aside className="border-t border-[var(--creator-border)] bg-[var(--creator-surface-muted)] p-6 lg:border-l lg:border-t-0 lg:p-8">
          <span className="text-xs font-semibold text-[var(--creator-accent)]">本机优先</span>
          <h3 className="mt-2 text-lg font-semibold text-[var(--creator-text)]">创作决定始终由作者完成</h3>
          <ul className="mt-6 space-y-5 text-sm text-[var(--creator-text-muted)]">
            <li className="flex gap-3">
              <BookOpenCheck size={18} className="mt-0.5 shrink-0 text-[var(--creator-accent)]" aria-hidden="true" />
              <span>草稿、人物和场景资料留在当前工作区。</span>
            </li>
            <li className="flex gap-3">
              <MessageSquareText size={18} className="mt-0.5 shrink-0 text-[var(--creator-accent)]" aria-hidden="true" />
              <span>读者反馈先成为创作线索，不会变成催促作者的工单。</span>
            </li>
            <li className="flex gap-3">
              <FileCheck2 size={18} className="mt-0.5 shrink-0 text-[var(--creator-confirm)]" aria-hidden="true" />
              <span>候选内容不会自动进入正式作品，公开前必须再次确认。</span>
            </li>
          </ul>
        </aside>
      </div>
    </Card>
  )
}

export interface CreatorAccessGateProps {
  preview: CreatorAccessPreviewModel
  onLogin: () => void
}

export function CreatorAccessGate({ preview, onLogin }: CreatorAccessGateProps) {
  return (
    <Card
      variant="glass"
      padding="none"
      data-slot="creator-access-gate"
      className="overflow-hidden text-[var(--creator-text)]"
    >
      <CardHeader className="gap-5 border-b border-[var(--creator-border)] p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <Badge variant="outline">未登录只读</Badge>
            <span className="text-xs text-[var(--creator-text-dim)]">创作内容不会在这里展示</span>
          </div>
          <CardTitle className="mt-4 text-2xl text-[var(--creator-text)]">{preview.title}</CardTitle>
          <CardDescription className="mt-2 max-w-xl leading-6 text-[var(--creator-text-muted)]">
            {preview.description}
          </CardDescription>
        </div>
        <Button variant="gold" onClick={onLogin} className="shrink-0">
          <LogIn size={16} aria-hidden="true" />
          登录作者身份
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        <ol className="grid sm:grid-cols-2 xl:grid-cols-4" data-slot="creator-access-capabilities">
          {preview.cards.map((card, index) => {
            const Icon = accessToneIcon[card.tone]
            return (
              <li
                key={`${card.label}-${card.title}`}
                className="min-w-0 border-b border-[var(--creator-border)] p-5 last:border-b-0 sm:border-r sm:[&:nth-child(2n)]:border-r-0 xl:border-b-0 xl:[&:nth-child(2n)]:border-r xl:last:border-r-0"
                data-slot="creator-access-capability"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--creator-accent-soft)] text-[var(--creator-accent)]">
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <span className="text-xs text-[var(--creator-text-dim)]">0{index + 1}</span>
                </div>
                <p className="mt-5 text-xs font-semibold text-[var(--creator-accent)]">{card.label}</p>
                <h3 className="mt-2 text-base font-semibold text-[var(--creator-text)]">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--creator-text-muted)]">{card.description}</p>
              </li>
            )
          })}
        </ol>
      </CardContent>

      <CardFooter className="m-0 justify-between gap-4 border-[var(--creator-border)] bg-[var(--creator-surface-muted)] px-6 py-4 text-sm text-[var(--creator-text-muted)] md:px-8">
        <span>登录后从上次保存的位置继续。</span>
        <Button variant="ghost" size="sm" onClick={onLogin}>
          进入工作区
          <ArrowRight size={15} aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  )
}
