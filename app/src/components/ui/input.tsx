import * as React from 'react'
import { cn } from '@/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-10 w-full rounded-lg border border-[var(--pu-line-700)] bg-[var(--pu-void-950)] px-3 py-2 text-sm text-[var(--pu-ink-100)]',
        'placeholder:text-[var(--pu-ink-650)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pu-cyan-500)]/42',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
})
Input.displayName = 'Input'
