# R1-A0 Writing Workflow Integration

## 目标

R1-A0 只解决一个问题：把 R0 已存在但分散的创作能力串成一条可由作者真实操作、可刷新恢复、可由浏览器重复验证的本地写作流程。

本阶段不改数据库、支付、部署、Reader 公开投影或视觉设计，也不声称文学质量已经提升。

## 真实工作流

1. 作者输入一句自然语言创作意图。
2. 系统最多两次关键追问，作者锁定本章意图。
3. 作者在右侧手动选择记忆卡；未选择的记忆不自动进入本轮 Context。
4. 系统比较一到三条不同叙事路径，不用相似候选凑数。
5. 系统只生成单场景候选，作者采用前不改变正文。
6. 作者采用候选并可继续手工修改。
7. 独立审阅只报告能定位到当前正文证据的问题，不使用综合文学分。
8. 系统只为证据所在段生成局部修改候选；作者确认后才写入草稿。
9. 重新审阅必须证明手动召回已被承接，或明确因缺少证据而阻断。
10. 正史差异由模型提出，作者确认后才把人物 22 维状态、设定边界和长期线程状态原子写入本机 Canon。
11. 作者保存本地草稿，准备、审阅并确认发布包。
12. R1-A0 到此停止，不公开提交，也不创建发布回执。

## 本阶段补齐

- 当前对话式 Creator UI 的端到端 Google Chrome 验收。
- 本机参考 Adapter 的单证据块局部修改候选与独立范围校验。
- 手动召回的逐字证据回执；找不到当前正文证据时保持阻断。
- 非 ASCII checkout 的浏览器脚本路径安全。
- R1-A0 专用结构门禁和 JSON 运行证据。

## 硬边界

- 候选生成不能自动采用正文。
- 局部修改不能覆盖其他正文块。
- 模型不能提交 Canon。
- 模型不能自动确认发布包。
- R1-A0 不执行 `submit_publish_bundle`。
- 私密正文不得写入普通 Agent 操作日志。
- 手动召回回执不得用语义猜测代替可定位正文证据。

## 自动化验收

结构门禁：

```bash
npm run check:creator-r1-a0-writing-workflow
```

真实浏览器流程：

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  npm run qa:creator-r1-a0-writing-workflow
```

运行证据：

```text
artifacts/qa/creator-decision-workbench/creator-decision-workbench.json
artifacts/qa/creator-decision-workbench/creator-decision-workbench.png
```

Pull Request 会运行独立的 `R1-A0 writing workflow` CI job，并上传
`r1-a0-writing-workflow-evidence` artifact。Reviewer 应以该 job 对当前 HEAD
生成的 JSON 和截图为准，不以本地文字汇报代替运行证据。

通过条件：

- 关键追问不超过两次。
- 至少一张手动选择的记忆卡进入持久化 Context Snapshot。
- 候选不重复，且作者采用前正文不变化。
- 审阅与手动召回回执都包含当前正文证据。
- 局部修改先作为候选出现，作者采用后才生成新草稿版本。
- 作者确认后的单次 Canon Patch 同时保留人物状态、设定边界和长期线程状态，且每项都指向当前正文块。
- Canon 只有一份 revision 1，刷新不重复提交。
- 恰好一份发布包达到 `author_confirmed`。
- 发布回执数量为 0，公开提交动作为 0。

## 非结论

- 本机参考 Adapter 只用于确定性流程与安全边界验收，不代表真实模型文学质量。
- 一次端到端通过不代表长期因果一致性、人物厚度或文学价值已经提升。
- 文学质量结论必须进入 R1-B，使用固定故事种子、盲测、成对比较和可定位正文证据。
