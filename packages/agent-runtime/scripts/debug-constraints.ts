import { resolveConstraints } from '../src/constraints.js'

const seed = process.argv.slice(2).join(' ') || '女频重生复仇，前世惨死后利用信息差重新布局家族关系。'
console.log(JSON.stringify(resolveConstraints({ seed, genre: '女频重生复仇' }).map(profile => ({
  id: profile.id,
  rules: profile.rules.map(rule => rule.id),
})), null, 2))
