import type { ButtonProps } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ReaderReadingToolButtonProps = Omit<ButtonProps, 'size' | 'variant'>

export function ReaderReadingToolButton({
  className,
  type = 'button',
  ...props
}: ReaderReadingToolButtonProps) {
  return (
    <Button
      type={type}
      variant="ghost"
      size="sm"
      data-reader-tool-button
      className={cn(
        'h-8 min-h-8 rounded-[8px] border border-[var(--pu-reader-tool-border)] bg-[var(--pu-reader-tool-background)]',
        'px-[0.58rem] py-[0.28rem] text-[0.74rem] font-bold text-[var(--pu-reader-tool-foreground)]',
        'transition-colors [transition-duration:160ms] hover:border-[var(--pu-reader-tool-border-hover)] hover:bg-[var(--pu-reader-tool-background-hover)] hover:text-[var(--pu-reader-tool-foreground)] active:scale-100',
        className,
      )}
      {...props}
    />
  )
}
