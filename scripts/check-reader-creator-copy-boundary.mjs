import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const targets = [
  'app/src/pages/Home.tsx',
  'app/src/pages/Library.tsx',
  'app/src/pages/Story.tsx',
  'app/src/pages/Create.tsx',
  'app/src/pages/Account.tsx',
  'app/src/features/creator',
  'app/src/components/design-system',
]

const forbidden = [
  'Showcase API 未接入',
  'Reader backend',
  'Customer exports',
  'committed baseline',
  '后端世界暂不伪装',
  '前后端接线状态',
  '账户管理',
  '公共广场',
  '订阅占位',
  '工程占位',
  'Reader Mode',
  'Choice Point',
  'World Discovery',
  'Worldline Graph',
  'Memo Kernel',
  '高概念',
  '概念展示',
  'WEB READER',
  'PROTOTYPE',
  'Prototype',
  'prototype',
  '原型',
  '入口页',
  '首页只',
  '预览环境',
  '后台',
  '后端',
  '接口',
  'PRD',
  'OpenAPI',
  '时间织机',
  '织机',
  '低权重',
  'Hawkes',
  't+',
  'AI 味',
  '系统提示词',
  '底盘',
  '绑定',
  '起点',
  '番茄',
  '设定卡',
  '模板库',
  '冷启动样本',
  'CURRENT WORLD',
  '命运核',
  '质量门禁',
  '可转正',
]

function collectFiles(path) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) return []
  const stat = statSync(absolute)
  if (stat.isFile()) return [absolute]
  return readdirSync(absolute)
    .flatMap(name => collectFiles(join(path, name)))
    .filter(file => /\.(tsx?|jsx?)$/.test(file))
}

const findings = []

for (const target of targets.flatMap(collectFiles)) {
  const body = readFileSync(target, 'utf8')
  const lines = body.split(/\r?\n/)
  lines.forEach((line, index) => {
    for (const term of forbidden) {
      if (line.includes(term)) {
        findings.push({
          file: relative(root, target),
          line: index + 1,
          term,
          text: line.trim(),
        })
      }
    }
  })
}

if (findings.length > 0) {
  console.error('[copy-boundary] reader/creator-facing internal copy found')
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} ${finding.term} :: ${finding.text}`)
  }
  process.exit(1)
}

console.log(`[copy-boundary] PASS (${targets.length} target groups)`)
