import { getRetryDelay } from './realtime'

const delays = Array.from({ length: 5 }, (_, attempt) => getRetryDelay(attempt))
const caps = [1000, 2000, 4000, 8000, 16000]

export const realtimeBackoffTestVector = delays.map((delay, index) => ({
  attempt: index,
  delay,
  cap: caps[index],
  inRange: delay >= 0 && delay <= caps[index],
}))

if (realtimeBackoffTestVector.some(item => !item.inRange)) {
  throw new Error('Realtime full-jitter backoff exceeded expected cap')
}
