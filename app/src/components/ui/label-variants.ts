import { cva } from 'class-variance-authority'

export const labelVariants = cva(
  'text-sm font-semibold leading-none text-[var(--pu-ink-300)] peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
)
