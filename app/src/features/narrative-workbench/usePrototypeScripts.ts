import { useCallback, useMemo, useState } from 'react'
import { createScriptFromInput, defaultScript } from './data'
import type { CreativeStepId, PrototypeScript, PrototypeScriptInput } from './types'

const STORAGE_KEY = 'narrativeos.prototype.scripts.v1'

function cloneDefaultScript(): PrototypeScript {
  return {
    ...defaultScript,
    chapters: defaultScript.chapters.map(chapter => ({ ...chapter })),
    creativeSteps: defaultScript.creativeSteps.map(step => ({ ...step })),
    nexusCandidates: defaultScript.nexusCandidates.map(candidate => ({
      ...candidate,
      branchIds: [...candidate.branchIds],
      downstreamEffects: [...candidate.downstreamEffects],
    })),
    branches: defaultScript.branches.map(branch => ({
      ...branch,
      diffHighlights: [...branch.diffHighlights],
    })),
    foreshadowHooks: defaultScript.foreshadowHooks.map(hook => ({ ...hook })),
    hero: {
      ...defaultScript.hero,
      inventory: [...defaultScript.hero.inventory],
    },
  }
}

function readScripts(): PrototypeScript[] {
  if (typeof window === 'undefined') return [cloneDefaultScript()]

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return [cloneDefaultScript()]
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return [cloneDefaultScript()]
    return parsed as PrototypeScript[]
  } catch {
    return [cloneDefaultScript()]
  }
}

function persistScripts(scripts: PrototypeScript[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts))
}

export function usePrototypeScripts() {
  const [scripts, setScripts] = useState<PrototypeScript[]>(() => readScripts())
  const activeScript = scripts[0] || cloneDefaultScript()

  const saveScripts = useCallback((nextScripts: PrototypeScript[]) => {
    setScripts(nextScripts)
    persistScripts(nextScripts)
  }, [])

  const createScript = useCallback((input: PrototypeScriptInput) => {
    const nextScript = createScriptFromInput(input)
    saveScripts([nextScript, ...scripts])
    return nextScript
  }, [saveScripts, scripts])

  const updateActiveScript = useCallback((updater: (script: PrototypeScript) => PrototypeScript) => {
    const [first, ...rest] = scripts
    const base = first || cloneDefaultScript()
    const next = updater(base)
    saveScripts([{ ...next, updatedAt: new Date().toISOString() }, ...rest])
  }, [saveScripts, scripts])

  const setActiveBranch = useCallback((branchId: string) => {
    updateActiveScript(script => ({ ...script, currentBranchId: branchId }))
  }, [updateActiveScript])

  const updateCreativeStep = useCallback((stepId: CreativeStepId, draft: string) => {
    updateActiveScript(script => ({
      ...script,
      creativeSteps: script.creativeSteps.map(step => step.id === stepId ? { ...step, draft } : step),
    }))
  }, [updateActiveScript])

  const metrics = useMemo(() => {
    const activeBranch = activeScript.branches.find(branch => branch.id === activeScript.currentBranchId) || activeScript.branches[0] || defaultScript.branches[0]
    const plantedHooks = activeScript.foreshadowHooks.filter(hook => hook.status !== 'dormant').length
    const highValueCandidates = activeScript.nexusCandidates.filter(candidate => candidate.butterflyIndex >= 0.6).length
    const words = activeScript.chapters.reduce((total, chapter) => total + chapter.body.length, 0)

    return {
      activeBranch,
      plantedHooks,
      highValueCandidates,
      totalHooks: activeScript.foreshadowHooks.length,
      words,
    }
  }, [activeScript])

  return {
    scripts,
    activeScript,
    metrics,
    createScript,
    setActiveBranch,
    updateCreativeStep,
    updateActiveScript,
  }
}
