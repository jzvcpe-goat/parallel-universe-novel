import { evaluateConstraintViolations, resolveConstraints } from '../src/constraints.js'

const text = process.argv.slice(2).join(' ') || '现代悬疑旧案里，主角靠读心术瞬间破案，还拿出未解释证据。'
const profiles = resolveConstraints({ seed: text, genre: '现代悬疑' })
console.log(JSON.stringify(evaluateConstraintViolations(text, profiles), null, 2))
