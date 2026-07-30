# Creator RAG Open-Source Adoption Boundary

Status: `full_manuscript_measured_not_activated`

This contract prevents the Creator long-form memory layer from becoming a custom search project. It fixes what may be adopted, what remains author-controlled, and what evidence is required before automatic retrieval can be called implemented.

## Product Boundary

The current `buildCreatorRecallCandidates()` flow is a deterministic, author-visible recall directory. It filters known chapters, setting assets, and one linked External Echo by current work and branch, then lets the author choose what enters the next context snapshot.

It is **not RAG**. It has no embedding, vector index, semantic query, hybrid retrieval, or learned reranker. Keep it as the manual safety layer even after automatic retrieval exists.

Automatic retrieval must remain:

- local-first and private;
- optional and inspectable;
- evidence-bearing, with a source locator for every returned item;
- subordinate to explicit author selection;
- unable to write canon, replace prose, publish, or upload private drafts.

The backend now has a shadow proposal boundary in `creatorShadowRecallService.ts`. It validates every upstream result against the frozen source metadata, fails closed on unknown, mismatched, cross-work, cross-branch, or future-chapter sources, and exposes only `selectionState: 'unselected'` proposals. Its candidates intentionally do not have the `id` and `statement` shape required by `ManualRecallItem`. `confirmCreatorShadowRecallSelection()` is the only conversion owner: it requires explicit author confirmation, rechecks the current source revision and locator, and returns `confirmed_not_applied` manual items. `creatorEditorShadowRecallContextService.ts` is the separate application owner: it rejects tampered receipts and manifest revision conflicts, returns a new `CreationContextSource`, and delegates final snapshot construction to the existing `compileContextSnapshot()`. Neither step persists a snapshot or changes a draft, Canon, or publication. The Chrome author-facing trigger and local persistence path remain unconnected.

`creatorEditorShadowRecallQueryService.ts` provides the deterministic query boundary. It requires the current author prompt and a locked intent, then produces separate causal, character-knowledge, timeline, and promise queries from the relevant intent fields. Each group calls the upstream retriever independently. The batch contract records `crossGroupFusionPerformed: false` and `automaticSelectionApplied: false`; product code does not recalculate or combine ranks across groups.

Every searchable source now carries `memoryGroup` through the LangChain chunk metadata, LanceDB table row, and retrieval result. Automatic group queries add `memoryGroup IN (...)` to the same upstream LanceDB metadata filter used for work, branch, chapter, and authority. A causal query therefore cannot surface a character-knowledge, timeline, or promise source before ranking. Explicit manual hard-includes remain outside this automatic group restriction and retain their existing work/branch/chapter/authority checks.

## Frozen P0 Open-Source Stack

| Layer | Adopt, Do Not Reimplement | License / Runtime | P0 Use |
| --- | --- | --- | --- |
| Chinese-aware chunking | `@langchain/textsplitters` `RecursiveCharacterTextSplitter` | MIT, local Node runtime | Use upstream paragraph/sentence recursion and the official Chinese punctuation separator guidance. Preserve work, branch, chapter, scene, authority, revision, and locator metadata on every chunk. |
| Local search store | `@lancedb/lancedb` | Apache-2.0, embedded local TypeScript/Node runtime | Persist searchable chunks locally and use its full-text, vector, filter, and index APIs. No hosted LanceDB service is required for P0. |
| Hybrid fusion | LanceDB `RRFReranker` | Included in `@lancedb/lancedb` | Fuse full-text and vector results through the upstream RRF implementation. Product code must not calculate RRF scores. |
| Local embeddings | `@huggingface/transformers` feature-extraction pipeline | Apache-2.0, local ONNX runtime | Run a pinned multilingual embedding model locally. The exact model artifact, model-card license, checksum, dimensions, and memory footprint must be frozen by a separate evaluation receipt before packaging. |
| Chinese quality tier | `FlagOpen/FlagEmbedding` with `BAAI/bge-m3` and, only when local hardware permits, `BAAI/bge-reranker-v2-m3` | MIT toolkit, local Python runtime | Optional quality comparison path. Use the upstream embedder/reranker APIs unchanged; do not port their scoring logic into TypeScript. |

Primary sources:

- LangChain recursive splitter: <https://docs.langchain.com/oss/javascript/integrations/splitters/recursive_text_splitter>
- LanceDB repository and TypeScript SDK: <https://github.com/lancedb/lancedb> and <https://lancedb.github.io/lancedb/js/>
- LanceDB upstream RRF reranker: <https://lancedb.github.io/lancedb/js/namespaces/rerankers/classes/RRFReranker/>
- Transformers.js: <https://github.com/huggingface/transformers.js>
- FlagEmbedding / BGE: <https://github.com/FlagOpen/FlagEmbedding>

The current adoption slice pins `@langchain/textsplitters@1.0.1`, `@lancedb/lancedb@0.31.0`, and `@huggingface/transformers@4.2.0`. Thin adapters now configure the upstream Chinese-aware splitter, LanceDB local table, LanceDB `ngram` FTS, vector query, metadata prefilter, and LanceDB `RRFReranker`. The embedding adapter pins `Xenova/multilingual-e5-small` at revision `761b726`, uses the model-card-required `query:` / `passage:` prefixes, and delegates pooling and normalization to Transformers.js. Product code does not implement tokenization, similarity, BM25, RRF, embedding inference, or vector indexing.

The optional comparison adapter `creatorLocalBgePairScorer.ts` pins the community ONNX export of `BAAI/bge-reranker-v2-m3`, validates the q8 model and tokenizer artifacts by SHA-256, and delegates query-passage tokenization and sequence-classification logits to Transformers.js. Product code only batches pairs, validates that upstream logits are finite, orders candidates by those upstream logits for the offline comparison, and preserves manual hard-includes. It does not implement or transform a relevance score. This adapter is not connected to the Creator route or automatic recall service.

The LanceDB package load and local table/FTS/filter/RRF wiring have run successfully. Direct Hugging Face download failed with `ECONNRESET`, so the benchmark used a pinned ModelScope mirror commit only after its q8 ONNX and tokenizer SHA-256 values were matched against the Hugging Face file records. The local files were hashed again before the run.

The 30-query frozen synthetic baseline completed with Recall@10 `1.0`, Precision@3 `0.3222` (29 of 30 queries placed their single relevant source in the top three), zero wrong-work, wrong-branch, and future-chapter leakage, source-locator coverage `1.0`, and manual-selection inclusion `1.0`. With the reviewed model already in the local cache, P50/P95 query latency was approximately `7.7/10.5 ms` on the recorded Apple M4 machine; cached model load plus index build took about `2.1 s`, observed RSS delta was about `392 MB`, and the tiny frozen index used about `98 KB`. Cold-download performance is not claimed because the first receipt was not retained. These are synthetic-baseline measurements, not real-novel quality proof. Automatic retrieval therefore remains disabled and `contract_only`; the manual recall directory remains the only active product path. Database and payment implementation remain assigned outside this writing-runtime task.

A second read-only run used the 13 long-range thread evidence cards independently verified from the accepted Chapter 1-20 campaign. All 13 expected cards appeared in the top three, with Recall@10 `1.0`, Precision@3 `0.3333`, zero wrong-work, wrong-branch, and future-chapter leakage, source-locator coverage `1.0`, and manual-selection inclusion `1.0`. Cached P50/P95 query latency was approximately `8.6/40.6 ms`; model load plus index build took about `2.4 s`, with about `394 MB` observed RSS growth. The committed receipt contains hashes, counts, and metrics only. This is real reviewed evidence, but it is not a full Chapter 1-20 paragraph index and has only 13 queries, so it does not satisfy the real-corpus activation bar.

A third read-only run indexed all 20 accepted Canon chapters from the frozen local workspace package: 1,195 accepted blocks and 68,766 visible characters. The runner verified the archive checksum and every per-chapter manuscript hash against the existing inventory before indexing, then derived 35 private queries from 13 independently verified causal, character-knowledge, timeline, promise, foreshadowing, and character-arc threads. The committed receipt contains only hashes and aggregate metrics. It records Recall@10 `0.8429`, Precision@3 `0.2571`, and 25/35 top-three hits. Exact source-evidence queries reached Recall@10 `1.0`, while semantic context queries reached `0.7308` and latest-evidence meaning queries reached `0.7778`. Wrong-work, wrong-branch, and future-chapter leakage remained `0`; source-locator coverage and manual-selection inclusion remained `1.0`. The run did not read or create Chapter 21 manuscript text and did not change the workspace, accepted manuscript, Canon, cloud data, or publication state.

This full-manuscript result is measured negative evidence for automatic activation. The evidence gate passes because the corpus, provenance, leakage, locator, manual-selection, privacy, and no-write boundaries are intact. The separate activation gate intentionally fails because the first provisional product targets are Recall@10 `>= 0.95`, context-query Recall@10 `>= 0.90`, latest-evidence Recall@10 `>= 0.90`, and top-three hit rate `>= 0.85`. These are conservative product activation targets chosen after the first real full-manuscript baseline, not research claims. They may only be revised through an author-reviewed benchmark decision, never merely to make the current run pass.

A fourth read-only comparison used the same frozen 35 queries and all 20 accepted chapter sources, retrieved a 20-source candidate pool through the existing upstream LanceDB hybrid/RRF path, and scored each query-passage pair with the frozen q8 `BAAI/bge-reranker-v2-m3` ONNX export. Overall Recall@10 improved from `0.8429` to `0.9143`; semantic-context Recall@10 improved from `0.7308` to `0.8462`; latest-evidence Recall@10 improved from `0.7778` to `0.8889`; and top-three hit rate improved from `0.7143` to `0.7429`. All improvements are measured positive deltas, but all four activation targets still fail. Cached per-query P50/P95 latency was approximately `4.37/5.14 s`, which is also unsuitable for silently inserting this path into the current interaction. Leakage remained `0`, locator and manual-selection coverage remained `1.0`, and no workspace, manuscript, Canon, cloud, publication, or Chapter 21 state changed. The comparison therefore proves a useful upstream quality candidate, not a completed or activatable product capability.

A fifth read-only comparison kept the same frozen corpus and queries but exposed the top 40 upstream LanceDB/RRF chunks before source collapse. BGE scored those chunks, then product orchestration retained the highest upstream-scored chunk per source without transforming its score. Overall Recall@10 reached `0.9714`, semantic-context Recall@10 `0.9231`, and latest-evidence Recall@10 `1.0`; those three frozen quality targets pass. Top-three hit rate reached `0.80`, still below `0.85`, while P50/P95 query latency increased to approximately `8.74/9.94 s`. This identifies chapter-internal candidate selection as a real recall bottleneck, but also proves that the current local cross-encoder path is not interaction-ready. Automatic activation additionally requires P95 local retrieval latency `<= 2,000 ms`; this is a provisional product-interaction target, not a research claim. The chunk comparison remains offline-only and did not change any author or public state.

A sixth comparison adopted the smaller upstream `Xenova/bge-reranker-base` Transformers.js ONNX export of `BAAI/bge-reranker-base`, pinned commit `280bcc27a84e0b898c251e06fddb25171bd9b101`, q8 model SHA-256 `dd98f3e67837d23210a6b7550c08cced4f61845b940ac45be3565840a10f3244`, and the base model's MIT license. No product reranking math was added. With 40 upstream chunks in one upstream model batch, two independent reruns produced the same ranking digest `e522ee15b49d688f77a828e47d5599219cd03749d26adc15dda8a910035ea130` and evaluation digest `29d6136f339d89f528c8869adb090f65526ba48d2ded553bdbc7353713de9b37`. Overall Recall@10 was `0.9571`, semantic-context Recall@10 `0.8846`, latest-evidence Recall@10 `1.0`, top-three hit rate `0.8571`, and P95 latency about `3.31 s`. It passes overall, latest-evidence, and top-three quality targets but fails context recall and latency. Reducing the candidate pool to 20 lowered P95 to about `1.78 s`, but overall Recall@10 fell to `0.8714`, context recall to `0.7308`, latest-evidence recall to `0.8889`, and top-three hit rate to `0.8286`. Intermediate measurements closed the untested gap: pool 24 reached `1.99 s` but only `0.9000` overall and `0.7308` context recall; pool 28 recovered `0.9571` overall and `0.8846` context recall but took `2.44 s`. No measured pool passes all frozen targets.

The community-candidate audit also rejected two apparent shortcuts before product integration. The Apache-2.0 `onnx-community/gte-multilingual-reranker-base` export was frozen at revision `5807a06097ed1e68331fec2201751ccaf356d96b` and q8 SHA-256 `ccf51dba7f8aa9205753761cfaa68c55f741792501463a3bf25d7e5bcdac7c35`, but the real `@huggingface/transformers@4.2.0` probe stopped with `Unsupported model type: new`; no custom inference implementation was added to bypass that incompatibility. `jinaai/jina-reranker-v2-base-multilingual` was rejected before download because its `CC-BY-NC-4.0` license is not suitable for the intended commercial product. The evidence is frozen in `validation/creator-rag/community-reranker-compatibility-audit-2026-07-18.json`.

A seventh read-only comparison tested the existing community Transformers.js ONNX export of MIT-licensed `BAAI/bge-small-zh-v1.5`, pinned to revision `75c43b069aac4d136ba6bc1122f995fedcfd2781`. The runner verified the q8 model, tokenizer, config, and tokenizer-config SHA-256 values before loading it, used the model-card Chinese query instruction, and delegated mean pooling and normalization to Transformers.js. No embedding, similarity, fusion, or ranking algorithm was reimplemented. Against the same frozen 20 chapters and 35 queries, Recall@10 reached `0.8571`, context Recall@10 `0.7692`, latest-evidence Recall@10 `0.7778`, and top-three hit rate `0.6857`; cached P95 query latency was about `16.6 ms`. Compared with multilingual E5-small, overall and context recall improved slightly, latest-evidence recall did not change, and top-three hit rate regressed. All four quality targets still fail, so this fast Chinese embedding is retained only as negative comparison evidence and automatic retrieval remains disabled. The receipt is `validation/creator-rag/full-manuscript-bge-small-zh-v1.5-comparison-2026-07-18.json`.

The additional model also exposed two benchmark reproducibility defects before any result was accepted. The runner previously searched the entire cache by filename and could hash the wrong `model_quantized.onnx` once multiple models existed; it now resolves every embedding and reranker artifact by frozen model id and revision. Transformers.js also attempted Hub metadata access despite a complete cache, so verified benchmarks now pass an absolute, hash-checked model directory with `local_files_only`. A network outage no longer decides whether the local comparison can run. These fixes harden the benchmark and loader only; they do not activate RAG or alter ranking logic.

Current evidence:

- dependency receipt: `validation/creator-rag/langchain-textsplitters-1.0.1-receipt.json`;
- frozen benchmark: `scripts/fixtures/creator-rag-frozen-benchmark.mts`;
- thin adapter: `app/src/integrations/creator-rag/creatorChineseTextSplitter.ts`;
- local embedding adapter: `app/src/integrations/creator-rag/creatorLocalEmbedding.ts`;
- local LanceDB/RRF adapter: `app/src/integrations/creator-rag/creatorLanceDbRetriever.ts`;
- shadow-only proposal boundary: `app/src/integrations/creator-rag/creatorShadowRecallService.ts`;
- confirmed-selection Context application boundary: `app/src/apps/creator/routes/creatorEditorShadowRecallContextService.ts`;
- author-grounded grouped query boundary: `app/src/apps/creator/routes/creatorEditorShadowRecallQueryService.ts`;
- deterministic execution: `npm run test:creator-rag-bootstrap`;
- metric evaluator: `npm run test:creator-rag-benchmark-evaluator`;
- upstream LanceDB wiring smoke: `npm run test:creator-rag-lancedb-wiring`;
- shadow proposal domain test: `npm run test:creator-shadow-recall-service`;
- real local benchmark entry point: `npm run validate:creator-rag-local-benchmark`;
- dependency and model provenance receipt: `validation/creator-rag/open-source-local-retrieval-dependencies-2026-07-17.json`;
- measured frozen baseline: `validation/creator-rag/local-hybrid-benchmark-2026-07-17.json`;
- real thread-evidence benchmark entry point: `npm run validate:creator-rag-real-thread-evidence`;
- hash-only real thread-evidence receipt: `validation/creator-rag/real-thread-evidence-benchmark-2026-07-17.json`;
- full Chapter 1-20 manuscript benchmark entry point: `npm run validate:creator-rag-full-manuscript -- --workspace <local-workspace.pufw.zip> --ledger <private-thread-ledger.json>`;
- hash-only full-manuscript receipt: `validation/creator-rag/full-manuscript-thread-benchmark-2026-07-17.json`;
- full-manuscript evidence gate: `npm run check:creator-rag-full-manuscript`;
- deliberately strict activation gate: `npm run check:creator-rag-full-manuscript:activation`;
- BGE full-manuscript comparison receipt: `validation/creator-rag/full-manuscript-bge-v2-m3-comparison-2026-07-17.json`;
- BGE evidence gate: `npm run check:creator-rag-bge-comparison`;
- deliberately strict BGE activation gate: `npm run check:creator-rag-bge-comparison:activation`;
- BGE chunk-level comparison receipt: `validation/creator-rag/full-manuscript-bge-v2-m3-chunk-comparison-2026-07-17.json`;
- BGE chunk-level evidence gate: `npm run check:creator-rag-bge-chunk-comparison`;
- deliberately strict chunk-level activation gate: `npm run check:creator-rag-bge-chunk-comparison:activation`;
- repeat-stable BGE base 40-candidate receipts: `validation/creator-rag/full-manuscript-bge-base-batch40-repeat-2026-07-18.json` and `validation/creator-rag/full-manuscript-bge-base-batch40-repeat-2-2026-07-18.json`;
- BGE base 20-candidate latency comparison: `validation/creator-rag/full-manuscript-bge-base-pool20-comparison-2026-07-18.json`;
- BGE base 24- and 28-candidate intermediate comparisons: `validation/creator-rag/full-manuscript-bge-base-pool24-comparison-2026-07-18.json` and `validation/creator-rag/full-manuscript-bge-base-pool28-comparison-2026-07-18.json`;
- community reranker compatibility audit: `validation/creator-rag/community-reranker-compatibility-audit-2026-07-18.json`;
- BGE small Chinese embedding comparison: `validation/creator-rag/full-manuscript-bge-small-zh-v1.5-comparison-2026-07-18.json`;
- BGE small Chinese evidence and activation gates: `npm run check:creator-rag-bge-small-zh-comparison` and `npm run check:creator-rag-bge-small-zh-comparison:activation`;
- BGE base quality/latency tradeoff gate: `npm run check:creator-rag-bge-base-comparison`;
- structural gate: `npm run check:creator-rag-bootstrap`.

This checkpoint proves upstream Chinese-aware chunking, metadata preservation, package installation, LanceDB local FTS/filter/RRF wiring, pinned local embedding runtime, the frozen synthetic benchmark, a bounded real-evidence-card run, a real Chapter 1-20 full-manuscript measurement, and a fail-closed shadow proposal boundary. The full-manuscript measurement is below the activation threshold and author-facing product-flow integration is still absent. Automatic RAG therefore remains unimplemented as a user-facing capability.

The benchmark evaluator is intentionally separate from retrieval. It accepts returned upstream items and calculates Recall@10, Precision@3, wrong-work, wrong-branch and future-chapter leakage, locator coverage, and manual-selection inclusion. It does not split text, embed, search, fuse, or rerank results. Its negative fixture proves all three leakage classes and a missing manual hard-include are observable before any real index is activated.

## Retrieval Shape

The adopted pipeline is configuration and composition, not a new algorithm:

```text
accepted local chapters and writing assets
  -> upstream RecursiveCharacterTextSplitter
  -> local embedding pipeline
  -> LanceDB local table
  -> work/branch/chapter/authority metadata filter
  -> LanceDB full-text + vector search
  -> LanceDB RRFReranker
  -> evidence-bearing shadow proposals, all unselected
  -> author-visible recall directory
  -> explicit author selection
  -> ContextSnapshot manifest
```

Required metadata filters run before results can enter the author surface:

- exact `workId`;
- compatible `branchId` and branch ancestry;
- `chapterNo` not later than the current writing position unless the author explicitly asks for future planning material;
- source authority: `canon`, `author`, or `derived`;
- exact memory group for automatic causal, character-knowledge, timeline, or promise queries;
- source revision and invalidation status;
- source locator and original record id.

Manual selections are appended as hard includes after automatic retrieval. They are never dropped because of a low similarity score.
The currently implemented manual directory already applies the same fail-closed
scope before a selected item enters `ContextSnapshot`: a chapter must belong to
the exact work and branch and precede the current writing chapter; an asset must
belong to the current work and compatible branch; an echo must match the linked
request. Directly forged or stale chapter/asset/echo selections are removed from
both `manualRecallItems` and the source manifest. Local Canon memories remain
owned by the work/branch-filtered local repository, and the recall ViewModel
rechecks their work and branch before rendering or resolving selections. This
second check prevents a stale asynchronous result from the previously opened
work from entering a newly selected route while the repository reload is in
flight. The current writing position is resolved deterministically from an
explicit chapter route, then an active local draft chapter number, then the
latest chapter in the resolved branch plus one; an empty branch begins at
chapter one. A reader request chapter remains context only and never becomes
the unpublished target chapter. This does not activate automatic retrieval.

## Thin Adapter Allowlist

The only future automatic-retrieval implementation owner is:

```text
app/src/integrations/creator-rag/
```

That adapter may:

- translate local Creator records into upstream `Document`/table rows;
- configure upstream chunk sizes, overlap, Chinese separators, embedding model ids, indexes, and result limits;
- apply metadata filters through upstream query APIs;
- map upstream results into existing `ManualRecallItem`-compatible view models;
- preserve source ids, revisions, authority, evidence text, and locators;
- translate upstream errors into typed local failures.

It may not implement:

- cosine, dot-product, or other vector similarity math;
- tokenization or embedding inference;
- ANN/HNSW/IVF/PQ indexes;
- BM25 or another lexical scorer;
- RRF, weighted fusion, MMR, or custom rank aggregation;
- a cross-encoder or LLM reranker;
- a custom semantic chunker;
- a knowledge graph or GraphRAG clone;
- automatic canon selection or state mutation.

## Validation Before Activation

Automatic retrieval stays disabled until a frozen local benchmark records, without invented results:

- at least 30 queries spanning causality, character knowledge, timeline/location, and unresolved promises;
- automatic Recall@10 and Precision@3;
- wrong-work and wrong-branch leakage;
- source-locator coverage;
- manual-selection inclusion rate;
- local index build time, query latency, memory, and disk usage;
- exact package/model versions, licenses, model checksum, and machine profile.

Before product activation, the same bar must also be run on at least 30 author-reviewed real-corpus queries against accepted manuscript chunks or independently verified evidence cards. The current 35-query Chapter 1-20 full-manuscript run satisfies the corpus-size and query-count requirement, but fails the provisional semantic quality targets.

Minimum product invariants:

- wrong-work leakage: `0`;
- manual-selection inclusion: `100%`;
- source-locator coverage: `100%`;
- retrieval results remain candidates until author selection;
- no paid API, hosted vector database, cloud draft upload, or public write is required.

Provisional activation targets after the first full-manuscript baseline are:

- overall Recall@10: `>= 0.95`;
- semantic context Recall@10: `>= 0.90`;
- latest-evidence meaning Recall@10: `>= 0.90`;
- top-three hit rate: `>= 0.85`;
- local query latency P95: `<= 2,000 ms`;
- wrong-work, wrong-branch, and future-chapter leakage: exactly `0`;
- source-locator coverage and manual-selection inclusion: exactly `1.0`.

The evidence gate and activation gate remain separate. A valid measurement receipt can pass `npm run check:creator-rag-full-manuscript` while correctly failing `npm run check:creator-rag-full-manuscript:activation`. This document does not claim that automatic RAG is implemented or validated for product activation.
