import { socraticCreateWorkflow } from '../src/workflows.js'

const seed = process.argv.slice(2).join(' ') || '我想写一个穿越到西方玄幻边境地下城的故事，不要游戏系统。'
const result = await socraticCreateWorkflow({ seed, genre: '西方玄幻' }, { preferToolBridge: false })
console.log(JSON.stringify({ runId: result.runId, trace: result.runTrace, questions: result.questions }, null, 2))

