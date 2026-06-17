import * as React from 'react'
import { cn } from '@/lib/utils'

interface ReadingPaperProps {
  title: string
  subtitle?: string
  meta?: React.ReactNode
  toolbar?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function ReadingPaper({ title, subtitle, meta, toolbar, footer, children, className }: ReadingPaperProps) {
  return (
    <article className={cn('pu-manuscript mx-auto box-border px-6 py-7 md:px-10 md:py-9', className)}>
      {toolbar ? <div className="mb-5 border-b border-[var(--pu-paper-muted)]/20 pb-4">{toolbar}</div> : null}
      {meta ? <div className="mb-4 flex flex-wrap gap-2 text-xs text-[var(--pu-paper-muted)]">{meta}</div> : null}
      <h1 className="text-3xl font-bold tracking-normal text-[var(--pu-paper-ink)] md:text-4xl">{title}</h1>
      {subtitle ? <p className="mt-4 text-base leading-7 text-[var(--pu-paper-muted)]">{subtitle}</p> : null}
      <div className="my-7 h-px bg-[var(--pu-paper-muted)]/22" />
      <div className="space-y-6 font-serif text-[var(--pu-paper-ink)] [font-size:var(--pu-reader-font-size)] [line-height:var(--pu-reader-line-height)]">
        {children}
      </div>
      {footer ? <div className="mt-7 border-t border-[var(--pu-paper-muted)]/22 pt-4">{footer}</div> : null}
    </article>
  )
}
