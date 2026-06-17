import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/primitives/Badge'
import { Button } from '@/components/primitives/Button'

export interface OnboardingStep {
  id: string
  target: string
  title: string
  body: string
  placement?: 'left' | 'right' | 'top' | 'bottom'
}

interface OnboardingTourProps {
  open: boolean
  steps: OnboardingStep[]
  onClose: () => void
}

const CALLOUT_WIDTH = 330
const CALLOUT_OFFSET = 18

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function positionCallout(rect: DOMRect, placement: NonNullable<OnboardingStep['placement']>) {
  const width = window.innerWidth
  const height = window.innerHeight

  if (width < 720) {
    return {
      left: 16,
      top: Math.max(18, height - 252),
      width: width - 32,
      anchorX: rect.left + rect.width / 2,
      anchorY: rect.top + rect.height / 2,
      calloutX: width / 2,
      calloutY: Math.max(18, height - 252),
    }
  }

  const targetCenterX = rect.left + rect.width / 2
  const targetCenterY = rect.top + rect.height / 2
  let left = rect.right + CALLOUT_OFFSET
  let top = rect.top

  if (placement === 'left') {
    left = rect.left - CALLOUT_WIDTH - CALLOUT_OFFSET
  }

  if (placement === 'top') {
    left = targetCenterX - CALLOUT_WIDTH / 2
    top = rect.top - 210
  }

  if (placement === 'bottom') {
    left = targetCenterX - CALLOUT_WIDTH / 2
    top = rect.bottom + CALLOUT_OFFSET
  }

  left = clamp(left, 92, width - CALLOUT_WIDTH - 18)
  top = clamp(top, 18, height - 236)

  return {
    left,
    top,
    width: CALLOUT_WIDTH,
    anchorX: targetCenterX,
    anchorY: targetCenterY,
    calloutX: left + CALLOUT_WIDTH / 2,
    calloutY: top + 24,
  }
}

export function OnboardingTour({ open, steps, onClose }: OnboardingTourProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const activeStep = steps[activeIndex]
  const placement = activeStep?.placement || 'right'

  const closeTour = () => {
    setActiveIndex(0)
    onClose()
  }

  useEffect(() => {
    if (!open || !activeStep) return

    const updateTarget = () => {
      const target = document.querySelector(activeStep.target)
      if (!target) {
        setTargetRect(null)
        return
      }
      setTargetRect(target.getBoundingClientRect())
    }

    updateTarget()
    window.addEventListener('resize', updateTarget)
    window.addEventListener('scroll', updateTarget, true)

    return () => {
      window.removeEventListener('resize', updateTarget)
      window.removeEventListener('scroll', updateTarget, true)
    }
  }, [activeStep, open])

  const callout = useMemo(() => {
    if (!targetRect || !activeStep) return null
    return positionCallout(targetRect, placement)
  }, [activeStep, placement, targetRect])

  if (!open || !activeStep || !targetRect || !callout) return null

  const isLast = activeIndex === steps.length - 1

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]">
      <svg className="absolute inset-0 h-full w-full">
        <line
          x1={callout.anchorX}
          y1={callout.anchorY}
          x2={callout.calloutX}
          y2={callout.calloutY}
          stroke="rgba(90,178,214,0.72)"
          strokeWidth="2"
          strokeDasharray="5 6"
        />
        <circle cx={callout.anchorX} cy={callout.anchorY} r="5" fill="rgba(217,188,126,0.95)" />
      </svg>

      <div
        className="tour-highlight"
        style={{
          left: targetRect.left - 6,
          top: targetRect.top - 6,
          width: targetRect.width + 12,
          height: targetRect.height + 12,
        }}
      />

      <section
        className="pointer-events-auto fixed rounded-lg border border-[var(--worldline-cyan)]/55 bg-[#07101a]/95 p-4 text-[var(--ink-paper)] shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        style={{
          left: callout.left,
          top: callout.top,
          width: callout.width,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="gold">{activeIndex + 1}/{steps.length}</Badge>
            <p className="text-sm font-semibold">{activeStep.title}</p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-[var(--ink-muted)] transition-colors hover:bg-white/10 hover:text-[var(--ink-paper)]"
            onClick={closeTour}
            aria-label="关闭新手引导"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{activeStep.body}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={closeTour}
          >
            跳过
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={activeIndex === 0}
              onClick={() => setActiveIndex(index => Math.max(0, index - 1))}
            >
              上一步
            </Button>
            <Button
              type="button"
              size="sm"
              variant="gold"
              onClick={() => {
                if (isLast) {
                  closeTour()
                  return
                }
                setActiveIndex(index => index + 1)
              }}
            >
              {isLast ? '完成' : '下一步'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
