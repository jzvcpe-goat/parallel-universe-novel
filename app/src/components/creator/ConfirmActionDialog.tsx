import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export interface ConfirmActionDialogProps {
  title: string
  description: string
  actionLabel: string
  pendingLabel?: string
  variant?: 'gold' | 'destructive'
  disabled?: boolean
  onConfirm: () => void | Promise<void>
  children: ReactNode
}

export function ConfirmActionDialog({
  title,
  description,
  actionLabel,
  pendingLabel = '处理中...',
  variant = 'gold',
  disabled,
  onConfirm,
  children,
}: ConfirmActionDialogProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')

  async function confirm() {
    setPending(true)
    setMessage('')
    try {
      await onConfirm()
      setOpen(false)
    } catch {
      setMessage('操作未完成，请稍后再试。')
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={nextOpen => {
      if (!pending) {
        setOpen(nextOpen)
        if (nextOpen) setMessage('')
      }
    }}>
      <AlertDialogTrigger asChild disabled={disabled}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {message ? (
          <p className="rounded-xl border border-[var(--creator-danger)]/35 bg-[var(--creator-danger)]/10 px-3 py-2 text-sm text-[var(--creator-danger)]">
            {message}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="ghost" disabled={pending}>取消</Button>
          </AlertDialogCancel>
          <Button
            variant={variant}
            onClick={confirm}
            loading={pending}
            disabled={pending || disabled}
          >
            {pending ? pendingLabel : actionLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
