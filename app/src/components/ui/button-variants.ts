import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold',
    'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pu-cyan-500)]/45',
    'disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-[var(--pu-cyan-500)] text-[var(--pu-void-950)] hover:bg-[var(--pu-cyan-500)]/90 shadow-[var(--pu-shadow-cyan)]',
        destructive: 'bg-[var(--pu-danger-500)] text-white hover:bg-[var(--pu-danger-500)]/90',
        outline: 'border border-[var(--pu-cyan-500)]/32 bg-transparent text-[var(--pu-cyan-500)] hover:bg-[var(--pu-cyan-500)]/10',
        secondary: 'border border-[var(--pu-line-700)] bg-[var(--pu-panel-850)] text-[var(--pu-ink-300)] hover:bg-[var(--pu-panel-800)]',
        ghost: 'text-[var(--pu-ink-500)] hover:bg-[var(--pu-cyan-500)]/10 hover:text-[var(--pu-cyan-500)]',
        link: 'text-[var(--pu-cyan-500)] underline-offset-4 hover:underline',
        generation: 'bg-gradient-to-r from-[var(--pu-cyan-500)] to-[var(--pu-cyan-600)] text-[var(--pu-void-950)] hover:brightness-110 shadow-[var(--pu-shadow-cyan)]',
        gold: 'bg-gradient-to-r from-[var(--pu-gold-500)] to-[var(--pu-gold-300)] text-[var(--pu-void-950)] hover:brightness-105 shadow-[var(--pu-shadow-gold)]',
        void: 'border border-[var(--pu-danger-500)]/35 bg-[var(--pu-danger-500)]/10 text-[var(--pu-danger-500)] hover:bg-[var(--pu-danger-500)]/16',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)
