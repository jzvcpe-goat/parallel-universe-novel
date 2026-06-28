import { cva } from 'class-variance-authority'

export const cardVariants = cva('rounded-lg border transition-colors duration-200', {
  variants: {
    variant: {
      default: 'border-[var(--pu-line-700)] bg-[var(--pu-panel-900)]/80 text-[var(--pu-ink-100)]',
      generation: 'border-[var(--pu-cyan-500)]/20 bg-[var(--pu-panel-900)]/80 text-[var(--pu-ink-100)] shadow-[var(--pu-shadow-cyan)]',
      branch: 'border-[var(--pu-violet-500)]/22 bg-[var(--pu-panel-900)]/80 text-[var(--pu-ink-100)]',
      gold: 'border-[var(--pu-gold-500)]/24 bg-[var(--pu-panel-900)]/80 text-[var(--pu-ink-100)] shadow-[var(--pu-shadow-gold)]',
      glass: 'pu-liquid-glass pu-liquid-glass-quiet pu-liquid-depth-flat text-[var(--pu-ink-100)]',
      panel: 'pu-liquid-glass pu-liquid-depth-raised text-[var(--pu-ink-100)]',
      paper: 'pu-manuscript text-[var(--pu-paper-ink)]',
      book: 'border-[var(--pu-line-700)] bg-[var(--pu-panel-900)]/78 text-[var(--pu-ink-100)]',
      reader: 'pu-manuscript text-[var(--pu-paper-ink)]',
      studio: 'border-[var(--pu-line-700)] bg-[var(--pu-panel-900)]/72 text-[var(--pu-ink-100)]',
    },
    padding: {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md',
  },
})
