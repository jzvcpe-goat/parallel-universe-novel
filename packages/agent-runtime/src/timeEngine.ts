import type { GenreKernel } from './types.js'

export interface TimeEngineEvent {
  id: string
  label: string
  order: number
  time: number
  baseIntensity: number
  hawkesBoost: number
  intensity: number
  foreshadowPressure: number
  pressureTag: 'calm' | 'rising' | 'burst' | 'aftermath'
}

function clamp(value: number, min = 0, max = 1.5): number {
  return Math.max(min, Math.min(max, value))
}

function stableHash(value: string): number {
  let hash = 2166136261
  for (const char of value) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0)
}

function deterministicJitter(seed: string, index: number): number {
  const raw = stableHash(`${seed}:${index}`) % 1000
  return (raw / 1000 - 0.5) * 0.08
}

function pressureTag(intensity: number, previousIntensity: number): TimeEngineEvent['pressureTag'] {
  if (intensity >= 0.95) return 'burst'
  if (previousIntensity > intensity && previousIntensity >= 0.9) return 'aftermath'
  if (intensity >= 0.62) return 'rising'
  return 'calm'
}

export function simulateKernelEventDensity(
  kernel: GenreKernel | undefined,
  beats: string[],
  seed: string,
): TimeEngineEvent[] {
  const controls = kernel?.timeControls || {
    baseRate: 0.32,
    burst: 0.28,
    decay: 0.52,
    foreshadowPressure: 0.44,
    recoveryFloor: 0.16,
    maxOpenLoops: 3,
  }
  const safeBeats = beats.length ? beats : ['异常出现', '选择压力', '代价回响']
  const maxOpenLoops = Math.max(1, controls.maxOpenLoops || 3)
  const recoveryFloor = controls.recoveryFloor ?? 0.14
  let previousIntensity = controls.baseRate

  return safeBeats.slice(0, Math.max(3, Math.min(6, safeBeats.length))).map((label, index) => {
    const phase = safeBeats.length <= 1 ? 1 : index / (safeBeats.length - 1)
    const phaseCurve = 0.68 + Math.sin(phase * Math.PI) * 0.42
    const hawkesBoost = index === 0
      ? 0
      : controls.burst * Math.exp(-controls.decay * (index - 1)) * clamp(previousIntensity, 0.1, 1)
    const openLoopPressure = Math.min(maxOpenLoops, index + 1) / maxOpenLoops
    const foreshadowPressure = clamp(
      controls.foreshadowPressure * (0.72 + openLoopPressure * 0.36) + deterministicJitter(seed, index),
      recoveryFloor,
      1.2,
    )
    const intensity = clamp(
      controls.baseRate * phaseCurve + hawkesBoost + foreshadowPressure * 0.22,
      recoveryFloor,
      1.35,
    )
    const event = {
      id: `time_event_${index + 1}`,
      label,
      order: index + 1,
      time: Number(((index + 1) * 1.618 + deterministicJitter(seed, index + 11)).toFixed(3)),
      baseIntensity: Number((controls.baseRate * phaseCurve).toFixed(3)),
      hawkesBoost: Number(hawkesBoost.toFixed(3)),
      intensity: Number(intensity.toFixed(3)),
      foreshadowPressure: Number(foreshadowPressure.toFixed(3)),
      pressureTag: pressureTag(intensity, previousIntensity),
    }
    previousIntensity = intensity
    return event
  })
}
