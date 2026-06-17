import { socraticCreateWorkflow } from '../src/workflows.js'

const seed = process.argv.slice(2).join(' ') || '都市谜案，雨夜证据反转。'
const result = await socraticCreateWorkflow({ seed, genre: '都市谜案' }, { preferToolBridge: false })
console.log(JSON.stringify(result.cost, null, 2))

