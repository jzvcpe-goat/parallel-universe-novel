import {
  characterSimulationRequestSchema,
  validateCharacterSimulationResult,
  type CharacterSimulationProvider,
  type CharacterSimulationRequest,
} from './characterSimulation'
import { CreationDecisionError } from './types'

export function createMiroFishCharacterSimulationAdapter(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): CharacterSimulationProvider {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
  return {
    async simulate(input: CharacterSimulationRequest) {
      const request = characterSimulationRequestSchema.parse(input)
      let response: Response
      try {
        response = await fetchImpl(`${normalizedBaseUrl}/v1/character-simulation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request }),
        })
      } catch (error) {
        throw new CreationDecisionError(
          'model_output_invalid',
          error instanceof Error ? error.message : 'MiroFish character rehearsal is unavailable.',
        )
      }
      if (!response.ok) {
        const detail = await response.text()
        throw new CreationDecisionError(
          'model_output_invalid',
          detail || `MiroFish character rehearsal returned ${response.status}.`,
        )
      }
      return validateCharacterSimulationResult(request, await response.json())
    },
  }
}
