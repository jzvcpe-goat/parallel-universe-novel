import { evaluateConstraintViolations, resolveConstraints } from '../src/constraints.js'

const text = process.argv.slice(2).join(' ') || '清河县仵作打开系统面板，获得经验值。'
const profiles = resolveConstraints({ seed: `西方玄幻穿越 非游戏化 ${text}` })
console.log(JSON.stringify(evaluateConstraintViolations(text, profiles), null, 2))

