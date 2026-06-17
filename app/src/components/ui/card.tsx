import * as React from 'react'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { cardVariants } from './card-variants'

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, variant, padding, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant, padding, className }))} {...props} />
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-2 pb-4', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('font-space text-xl font-semibold text-[var(--pu-ink-100)]', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-[var(--pu-ink-500)]', className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('pt-0', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-4 flex items-center border-t border-[var(--pu-line-700)] pt-4', className)} {...props} />
}
