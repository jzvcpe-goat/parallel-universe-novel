import { cva } from 'class-variance-authority'

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-[var(--pu-cyan-500)]/22 bg-[var(--pu-cyan-500)]/10 text-[var(--pu-cyan-500)]',
        secondary: 'border-transparent bg-[var(--pu-panel-850)] text-[var(--pu-ink-500)]',
        destructive: 'border-transparent bg-[var(--pu-danger-500)]/10 text-[var(--pu-danger-500)]',
        outline: 'border-[var(--pu-line-700)] text-[var(--pu-ink-500)]',
        signal: 'border-[var(--pu-cyan-500)]/22 bg-[var(--pu-cyan-500)]/10 text-[var(--pu-cyan-500)]',
        gold: 'border-[var(--pu-gold-500)]/28 bg-[var(--pu-gold-500)]/11 text-[var(--pu-gold-300)]',
        branch: 'border-[var(--pu-violet-500)]/26 bg-[var(--pu-violet-500)]/12 text-[#c4b5fd]',
        stasis: 'border-[var(--pu-teal-500)]/22 bg-[var(--pu-teal-500)]/10 text-[var(--pu-teal-500)]',
        flux: 'border-[var(--pu-gold-500)]/26 bg-[var(--pu-gold-500)]/10 text-[var(--pu-gold-300)]',
        collapse: 'border-[var(--pu-danger-500)]/26 bg-[var(--pu-danger-500)]/10 text-[var(--pu-danger-500)]',
        tierFree: 'border-[var(--pu-line-700)] bg-[var(--pu-panel-850)] text-[var(--pu-ink-500)]',
        tierObserver: 'border-[var(--pu-cyan-500)]/30 bg-[var(--pu-cyan-500)]/10 text-[var(--pu-cyan-500)]',
        tierIntervener: 'border-[var(--pu-violet-500)]/30 bg-[var(--pu-violet-500)]/10 text-[#c4b5fd]',
        tierCreator: 'border-[var(--pu-gold-500)]/30 bg-[var(--pu-gold-500)]/13 text-[var(--pu-gold-300)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)
