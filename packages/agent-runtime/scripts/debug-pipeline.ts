import { socraticCreateWorkflow } from '../src/workflows.js'

const seed = process.argv.slice(2).join(' ') || '我想写一个仙侠玄幻故事，主角得到裂纹玉简后必须偿还因果债。'
const result = await socraticCreateWorkflow({ seed, genre: '仙侠玄幻' }, { preferToolBridge: false })
console.log(JSON.stringify({ runId: result.runId, trace: result.runTrace, questions: result.questions }, null, 2))
