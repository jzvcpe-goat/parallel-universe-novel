import test from 'node:test'
import assert from 'node:assert/strict'
import { genreKernels } from './constraints.js'
import { simulateKernelEventDensity } from './timeEngine.js'

test('time engine produces deterministic Poisson and Hawkes style event density', () => {
  const kernel = genreKernels[0]
  const beats = kernel.eventStructure.slice(0, 5)
  const first = simulateKernelEventDensity(kernel, beats, 'run_time_engine_test')
  const second = simulateKernelEventDensity(kernel, beats, 'run_time_engine_test')

  assert.deepEqual(first, second)
  assert.ok(first.length >= 3)
  assert.ok(first.every(event => event.id.startsWith('time_event_')))
  assert.ok(first.every(event => event.intensity >= (kernel.timeControls.recoveryFloor || 0)))
  assert.ok(first.some(event => event.hawkesBoost > 0))
  assert.ok(first.every(event => ['calm', 'rising', 'burst', 'aftermath'].includes(event.pressureTag)))
})
