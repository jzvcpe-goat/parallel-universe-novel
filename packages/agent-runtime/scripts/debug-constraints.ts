import { resolveConstraints } from '../src/constraints.js'

const seed = process.argv.slice(2).join(' ') || '西方玄幻穿越，地下城，非游戏化'
console.log(JSON.stringify(resolveConstraints({ seed }).map(profile => ({
  id: profile.id,
  rules: profile.rules.map(rule => rule.id),
})), null, 2))

