# Creator Working Agent Role Runtime

Date: 2026-07-16

## Count

The repository preserves ten NarrativeOS role contracts:

```text
Radar
Planner
Orchestrator
Architect
Writer
Observer
Reflector
Normalizer
Auditor
Reviser
```

This does not mean ten model processes run for every chapter. The localhost
Creator currently wires eight roles to bounded operations and leaves two as
contract-only roles.

| Role | Current runtime status | Owned operation |
| --- | --- | --- |
| Planner | Wired | Distinct candidate-path planning |
| Architect | Wired | Pre-prose causal scene architecture |
| Writer | Wired | Candidate prose only |
| Auditor | Wired | Evidence-locatable literary review plus separate local-repair, character-rehearsal, and cross-chapter continuity verification |
| Observer | Wired | Manuscript-grounded state and continuity evidence |
| Reflector | Wired | Optional MiroFish artifact-to-card reflection before independent review |
| Normalizer | Wired | One bounded structured-output repair attempt |
| Reviser | Wired | One evidence-scoped manuscript-block replacement candidate |
| Radar | Contract only | Trend discovery is outside a private chapter request |
| Orchestrator | Contract only | `CreationDecisionWorkflow` performs deterministic orchestration without a model call |

MiroFish is an optional external character-simulation process, not an eleventh
NarrativeOS role. A pinned community source checkout has passed one synthetic
local runtime exercise. Its generated report is not direct character evidence:
only exact responses from selected-character interviews may support proposed
cards, and those proposals still require later author review.

Reflector no longer decides whether its own MiroFish card proposals may reach
the author. Every rehearsal now follows `MiroFish -> Reflector -> Auditor`.
The independent Auditor must account for every character and setting proposal,
bind every rejection to evidence already referenced by that proposal, and
reject identity leakage, 22-dimension semantic drift, before-state mismatch,
relationship overclaim, unsupported setting facts, Canon leakage, or confidence
overclaim. A pass must verify every proposal index with no issues; any reject or
incomplete review fails closed before the author-facing candidate boundary.
Auditor cannot rewrite or save a card, and a passing result still remains a
local candidate until the author explicitly confirms capture.
The earlier community-runtime synthetic rehearsal predates this independent
review gate and remains pre-audit evidence. It proves the source lifecycle and
selected-interview boundary, not that a real MiroFish run has passed the new
Auditor contract.

The 22 character-state dimensions and 30 Agent action-surface registrations are
separate contracts. Neither number is an Agent count.

## 22-dimension state scan

The 22 dimensions are one strict state vocabulary, not 22 Agents and not a
per-chapter form. Observer scans them in four non-overlapping groups before it
decides whether any proposal exists:

| Scan group | Dimensions |
| --- | --- |
| Embodied continuity | `location`, `timePosition`, `physicalCondition`, `resources`, `capabilities`, `limitations` |
| Agency and commitment | `dominantDesire`, `immediateGoal`, `currentIntent`, `obligations`, `recentChoice`, `paidCost` |
| Inner model | `emotionalState`, `fear`, `woundTrigger`, `defenseStrategy`, `beliefs`, `falseBeliefs`, `knowledge`, `secrets` |
| Social dynamics | `relationshipStances`, `trust` |

The groups cover every registered dimension exactly once. Observer still emits
at most eight proposals and must leave a group empty when the accepted prose
does not contain an exact, sufficient evidence quote. Auditor independently
checks dimension semantics and evidence strength before the author can review a
Patch. Coverage is therefore a diagnostic for missed inspection, never a score
or a reason to manufacture character change.

`creator-character-state-pipeline.ts` divides 22 synthetic, exactly located
changes across those four legal Observer batches. It proves every dimension can
survive output validation, evidence-to-Patch conversion, state application, and
the next writing-context compilation without being dropped or collapsed. This
is transport proof only: it does not claim that every dimension changed in a
real chapter, and it does not bypass the existing author-confirmation gate.

When a future Kernel/runtime adapter supplies a partial character projection,
the context adapter overlays only registered, defined dimensions on the Canon
character state. It does not replace the whole character object. An omitted or
`undefined` dimension therefore cannot erase long-term Canon memory, and a
legacy alias such as `relationshipPosition` cannot re-enter the current context;
persisted legacy records must first migrate to `relationshipStances`.

The selected Chapter 8-20 reviewed backfill artifacts contain nine distinct
dimensions. That historical distribution exposed the former operational-state
bias but does not prove that the other thirteen dimensions should have changed
in those chapters. The privacy-safe audit is
`validation/creator-ui/conversation-recall-2026-07-14/chapter-08-20-character-state-coverage-2026-07-15/summary.json`.

## Scene Pipeline

An initial `scene_draft` request now performs independent ephemeral local Agent
executions with an evidence-bearing gate before prose:

```text
Architect
  -> creator-scene-architecture.v1
  -> Auditor
  -> creator-scene-architecture-review.v1
  -> Writer
  -> creator-scene-draft.v1 candidate
```

The Architect freezes a 4-5 beat result-level causal chain for a roughly
3000-character scene, plus an information boundary that separates observable
scene evidence, the limited inference that evidence permits, and the inference
that must remain withheld. It also carries manual-recall obligations,
character goals and knowledge boundaries, repetition avoidances, sensory
anchors, an ending consequence, and a five-axis scene mechanism signature.
The signature records `pressureSource`, `conflictEngine`, `agencyPattern`,
`costPattern`, and `endingPattern`; it is a planning constraint, not a Canon
fact. The Writer receives that structure as a candidate input. It cannot commit
canon or replace an adopted manuscript.

Before Writer execution, the bridge compares the new signature with every
signed entry in `recentSceneSummaries`, then a separate Auditor verifies that
the labels are supported by the causal chain, character choices, cost and
ending. The same Auditor must copy one observable-evidence item and the exact
allowed/withheld inference boundary, then reject any architecture whose
conclusion outruns its evidence. Repeating three or more axes or failing either
semantic or information-control review triggers one
bounded Architect revision while preserving locked intent, Canon, and manual
recall. If the revised architecture still fails either gate, Writer does not
run. The localhost bridge returns HTTP `409 author_decision_required` with both
reviews, `writerInvoked: false`, and the exhausted-revision marker so the author
can change a locked creative choice instead of receiving a disguised repeat.
Changing only a prop, place, creature, evidence carrier or signature label does
not count as a new scene mechanism.

The structure Auditor has one evidence-only correction path. The bridge first
enumerates every unlocatable `executionQualityChecks.architectureEvidence`,
`issues.architectureEvidence`, and `issues.recentSceneEvidence` reference and
sends the complete list to the same Auditor. It also supplies a deterministic
path/value catalog extracted from the current architecture string fields and
recent-scene summary/signature fields; the correction may only select a value
from the required source catalog, not rewrite or splice one. Only this exact
evidence error may enter correction. Runtime assertions freeze the top-level decision, verified
axes, information-control check, execution-quality decisions and diagnoses,
issue count/order/code/axis/diagnosis, rationale, and every unaffected evidence
field. A semantic change, a non-evidence contract error, or a second evidence
failure stops before Writer. The first real run of the sixth frozen original
fixture exposed the former path returning a second unlocatable architecture
reference; it produced no quality receipt and was not rerun. Deterministic
fixtures now cover successful all-evidence correction, semantic mutation, and
persistent invalid evidence.

The same blocked pipeline then invokes Planner once with
`creator-scene-author-decision-options.v1`. Planner returns one author-facing
question and two or three unlock options. Each option names one primary creative
axis to change, lists preserved author intent, cites review issue codes, states
the tradeoff, and proposes a signature that differs from every signed recent
scene on at least three axes. Runtime assertions reject duplicate option IDs,
duplicate signatures, unsupported issue codes, or near-duplicate mechanisms.
If an otherwise structured option set cites an issue code that neither
independent review produced, the same Planner receives exactly one semantic
correction with the explicit `allowedIssueCodes` list. That correction may only
repair issue references and narrow the affected option explanation. It cannot
add a new issue, fact, prose, author choice, or Writer call. A second unknown
code fails the pipeline closed before Writer. Deterministic fixtures cover both
the corrected path and the persistent-invalid path.
These options are not candidate prose and do not mutate the locked intent. The
bridge wraps them with deterministic decision, session, intent, revision, and
pipeline identifiers. `CreationDecisionWorkflow` records the blocked result as
a local `scene_author_decision_requested` event, so a refresh does not erase the
author's pending choice.

Only `selectSceneAuthorDecision()` may consume that event. It requires an exact
offered option id plus explicit author confirmation, rejects stale, forged, or
already-consumed decisions, and creates a new locked AuthorIntent revision with
the selected five-axis direction. The prior context, candidates, drafts,
reviews, repairs, and Canon Patch proposals all become stale; the session
returns to `candidate_search`. Candidate search must include one path whose
signature exactly matches the author-selected direction. This transition does
not call Writer, adopt prose, write Canon, or advance to another chapter.

When that revised intent later reaches scene drafting, the selected direction
is also a deterministic Architect constraint rather than prompt-only advice.
The bridge compares all five architecture axes with the author's
`expectedMechanismSignature`. One bounded Architect revision may repair a
mismatch. If any axis still differs after that revision, the bridge fails with
`scene_author_direction_not_honored` before Planner or Writer runs. It does not
silently substitute another mechanism and does not ask the author to repeat a
decision the runtime already accepted.

The same author-selected path now has a prose-level gate. After Writer returns
the local candidate, an independent Auditor checks all five expected axes and
the selected `proposedAdjustment`. Every passing check must quote exact text
from the candidate body. Invalid locators receive one Auditor-only evidence
repair; the Auditor may not change its decision. A semantic rejection returns
`scene_author_direction_draft_rejected` without another Writer run, while a
second unlocatable evidence result fails closed. Neither path adopts prose,
writes Canon, advances a chapter, or triggers a whole-scene rewrite.

On a successful response, the bridge transports the passing Auditor review
with the candidate. The app immediately maps each exact quote to manuscript
block ids, block-local offsets, and excerpt hashes, then stores only a
`scene-draft-direction-receipt.v1` on the local `SceneDraftResult`. Raw quote
text, diagnoses, and rationale are not duplicated into that receipt. A pass
whose evidence cannot be mapped is rejected locally with `evidence_missing`.
The receipt remains optional so pre-gate drafts can still be restored, and it
does not mean that the author adopted the candidate or approved Canon.
Any author text edit or accepted local repair creates a new draft revision
without the prior receipt. The changed manuscript must be reviewed again; a
pass tied to older text cannot authorize a newer revision.

If an Auditor decision uses an evidence string that cannot be located exactly,
the bridge permits one Auditor-only evidence repair. That repair may correct
locators but may not add findings or change the review decision. A second
unlocatable review fails closed.

An explicit manual-recall selection is the allowlist for historical chapters
and local writing assets. Unchecked character cards, old timelines, promises,
rules, relationships, and chapter summaries do not enter role prompts through
the context adapter. Locked intent, current Canon, the latest canonical
timeline state, Kernel rules, runtime projection, and hard constraints remain
automatic because they define the current safety boundary rather than optional
historical memory.

Historical chapter summaries preserve source authority inside that allowlist.
Intent-derived starting conditions, target changes, required choices, expected
costs, and unresolved requirements are labelled as creation constraints; they
do not prove the accepted prose implemented them. Only committed,
evidence-locatable `recentChoice` and `paidCost` Patch values receive Canon
labels and replace the corresponding intent plan. Architect, Planner, Writer,
and Auditor may treat only those Canon-labelled values and accepted ending
evidence as accomplished historical facts.

Selected causal recall also feeds the bounded `recentSceneSummaries` channel
used for repetition and causal-handoff checks. This projection is derived only
from the author's current manual selection. A selected local Canon chapter
memory remains available even when there is no public `chapters` row; a
selected prose chapter contributes its opening and actual accepted ending
instead of an opening-only truncation. The projection repeats the historical
snapshot boundary: only explicitly Canon-labelled state and accepted ending
evidence may be treated as accomplished fact, and current Canon still wins.
The authoritative manual card for a published-chapter fallback carries the
same boundary plus bounded opening and tail-preserved ending evidence, including
when the chapter is one oversized paragraph. Unselected chapters are not added
automatically.

Selection and prompt transport do not by themselves prove that Writer used the
chosen memory correctly. When `WritingAgent.reviewDraft()` receives a Context
with selected manual recalls, it therefore invokes an independent Auditor under
`manual_recall_adherence_review`. The request contains the draft plus only the
selected recall allowlist. Every selected source must be returned exactly once,
in the same order and memory group, with one of `fulfilled`, `respected`,
`violated`, or `omitted`. A non-omitted result must quote exact manuscript text;
the application maps that quote to block id, local offsets, and an excerpt hash
before storing `manual-recall-adherence-receipt.v1` on the real
`LiteraryReview`. Raw quotes, diagnoses, rationale, aggregate scores, and
unselected recall content are not persisted in the receipt.

The Auditor may make one evidence-only correction when a quote cannot be
located. Source identity, group, status, and the pass/reject decision remain
frozen; a semantic change or second evidence failure stops closed. A
`violated` or `omitted` source becomes the deterministic quality violation
`manual_recall_violated:<sourceId>` or
`manual_recall_omitted:<sourceId>`. Those violations enter the existing
candidate/Canon quality gate, so this is part of the production review path and
not an optional benchmark annotation. It still cannot adopt prose, commit
Canon, open another chapter, write cloud state, or publish.

The quality gate does not trust that derived violation array alone. Both Canon
Patch proposal and atomic Canon confirmation must provide the current Context.
The gate independently requires exact selected-source coverage and order,
matching memory groups, a passing receipt, non-violating statuses, and evidence
that still hashes to the current draft. A missing receipt, imported source
mismatch, rejected result, stale Context, or edited prose invalidates the
candidate even if `deterministicViolations` was empty or removed.

Every new `LiteraryReview` is additionally bound to the Context snapshot id,
compilation-policy version, source fingerprint, and a deterministic fingerprint
of the complete compiled Context content. The gate recomputes that content
fingerprint before both Canon Patch proposal and confirmation. Changing a hard
constraint, timeline, character state, promise, manual recall, or any other
Context content after review therefore requires a new review even when the
caller keeps the old Context id and source fingerprint. Pre-binding reviews
remain parseable through legacy defaults, but they cannot authorize Canon.

The compiled Context also persists its own `contentFingerprint`. Candidate
search, scene drafting, literary review, local repair, Canon Patch proposal,
and Canon confirmation recompute this value before invoking a role. A Context
mutated after compilation therefore stops before Writer, Reviewer, Reviser, or
Canon work, even if a caller also rewrites the Review binding. Legacy Contexts
remain readable with `legacy-unfingerprinted`, but cannot authorize a new
operation. This is a deterministic local consistency boundary, not a
cryptographic claim against an attacker who controls every local record.

The first real-model receipt is
`validation/creator-ui/manual-recall-adherence-real-trial-2026-07-18/summary.json`.
It used one frozen original scene, generated 3063 visible characters through
the real local role pipeline, and mapped all three selected causal, character
knowledge, and timeline sources to exact evidence. Eight role calls completed,
including the independent manual-recall Auditor. This proves one executable
single-scene path and its containment boundaries; it does not prove stable
long-form literary improvement or activate automatic RAG.

A second receipt,
`validation/creator-ui/manual-recall-effect-real-trial-2026-07-18/summary.json`,
measures one randomized two-arm execution. Both arms use the same session,
locked intent, selected candidate, target length, and local role bridge; each
arm receives its own Context identity, while `manualRecallItems` is the only
authored context difference. The selected-memory arm passed all four causal,
character-knowledge, timeline, and promise checks; the absent-memory control
passed one, violated one, and omitted two. Two blind Auditors independently
confirmed the measured hard-constraint difference. This receipt demonstrates
one real local effect and keeps the no-stability-claim boundary; it neither
enables automatic retrieval nor authorizes candidate adoption or Canon writes.

The same isolated-difference method now covers two additional frozen original
scenes: archive-tribunal institutional refusal and floodgate countdown
sacrifice. The three-pair campaign receipt is
`validation/creator-ui/manual-recall-effect-real-campaign-2026-07-18/summary.json`.
Across 44 real local role calls, selected memory improved measured recall-duty
adherence in all three pairs. Blind independent verification retained 19
preferences for selected memory, 4 for absent memory, 7 ties, and 3 first-pass
preferences that the verifier rejected. The floodgate pair alone
also completed the product `reviewDraft` path for both arms, including evidence
revision where required and independent verification of actionable findings.
The selected-memory arm retained one locatable continuity hard block plus
exposition and pacing revision candidates. The absent-memory arm retained
locatable repetition and exposition revision candidates without inventing a
hard block. The unified candidate gate rejected both arms and exactly mirrored
those active findings; neither candidate was adopted. The other two pairs are
not described as having completed this full product review. The campaign does
not declare an overall winner, use a composite literary score, prove stable
long-form improvement, or enable automatic retrieval.

Newly selected Planner candidates carry the same five-axis signature. When a
chapter is locally confirmed, its selected-candidate signature stays attached
to the local chapter memory and reaches the next chapter only when that memory
is manually selected. Legacy chapters remain readable without a signature;
the runtime does not invent categorical history from prose or promote planning
metadata into Canon.

Voice context is position-aware. A non-empty current manuscript contributes its
opening, a deterministic progression paragraph, and the actual ending instead
of only its first two paragraphs. A blank manuscript falls back to the latest
two prose chapters already admitted by the manual-recall allowlist: opening and
ending from the latest, then the ending from the next latest, with at most three
samples. A short sentence may be the actual ending; blank or separator-only
paragraphs cannot. Opening and progression evidence preserve the front of a
long paragraph; ending evidence preserves its tail. One long paragraph may
therefore expose distinct `head` and `tail` locators, while identical short
evidence is deduplicated. Every entry retains its original paragraph number and
position provenance.

Style evidence has no factual authority. Architect, Planner, Writer, literary
Auditor, Reviser, and repair Auditor receive the same hard boundary:
`context.styleSamples` may guide syntax rhythm, narrative distance, paragraph
breathing, and dialogue density only. Characters, events, places, time,
causality, promises, and foreshadowing inside those excerpts cannot be restored
as current facts; factual authority remains with locked intent, current Canon,
and manual recall.

That allowlist is revalidated at the operation boundary, not only when the
author first selects a path. Every `ContextSnapshot` records a compilation
policy version and deterministic fingerprint of its full current source. A
literary review must rebuild a legacy or mismatched snapshot before invoking
Auditor. The replacement is persisted only after a successful Agent response;
then prior contexts and their dependent reviews, repairs, and patches become
stale, and a local `context_refreshed` event records the transition. This keeps
a changed recall selection from silently reusing an older, broader prompt.

If the final JSON fails validation, the one allowed repair attempt is a separate
Normalizer execution. The Architect is not rerun and the Normalizer is told to
preserve the existing causal chain and prose rather than regenerate from zero.

Literary evidence failures are narrower than general structured-output
failures. When the application can parse an initial `literary_review` but an
exact evidence quote cannot be found in the final draft, it may invoke the same
Auditor role once with operation `literary_review_revision`. That call receives
the prior review, the evidence validation issue, and the unchanged final draft.
It may only correct or remove the unlocatable finding. It cannot add a finding,
raise severity or confidence, change prose, trigger a Reviser, adopt a
candidate, propose Canon state, open a next chapter, or publish. The corrected
review is mapped through the same exact-evidence validator; a second failure
stops the review closed. Normalizer is not used to make a semantic literary
judgment.

Evidence-valid model findings with severity `hard_block` or
`revision_candidate` then receive a second independent Auditor pass under
operation `literary_review_verification`. The second Auditor must return every
supplied finding exactly once and may only `verify` or `reject` it. Finding id,
dimension, severity, location, and the quoted evidence block remain frozen; the
verifier cannot add findings, introduce a composite score, rewrite prose, or
authorize any state or Canon write. A rejected model finding is removed before
the optional local-repair scheduler receives the review. Deterministic
application findings are not sent to this model verifier and remain
authoritative. The local `LiteraryFindingVerificationReceipt` records verified
and rejected ids without retaining the verifier's raw response.

The first frozen real-model receipt for this operation is
`validation/creator-ui/frozen-paired-quality-literary-finding-verification-archive-2026-07-17/summary.json`.
It records three independent verification calls, seven verified model findings,
one rejected model finding, and no retained local repair. All three operations
used Auditor and all repository, adoption, Canon, chapter 20/21, cloud, and
publication write boundaries remained false. This proves execution and
containment, not verifier correctness or literary improvement.

The author may explicitly set `focusDimensions` for one literary-review
request. The domain accepts only the registered 11 literary dimensions and
stores the normalized selection as `requestedFocusDimensions` on the local
review. The local Working Agent transports it to Auditor as a priority, not as
a new scoring system. Auditor must still enforce all hard constraints and may
still report evidence-locatable findings outside the focus. A focused dimension
with no exact manuscript evidence produces no finding; the runtime does not
invent a minimum count. Campaign tooling records `reviewFocusSource` and fixes
`automaticFocusSelectionPerformed` to `false`, so repeated model weaknesses
cannot silently choose the next review focus or mutate prompts. Focused review
does not itself trigger adoption, Canon write, next-chapter access, cloud write,
or publication. If the optional local-repair scheduler is already running, hard
blocks remain first; findings at the same severity are ordered by the author's
`focusDimensions`, then confidence and the established default dimension order.
This makes human focus operational without allowing it to suppress continuity
or another hard constraint. With no explicit focus, the previous deterministic
order remains unchanged.

The first real focused-review receipt is
`validation/creator-ui/frozen-paired-quality-six-seed-focused-review-rerun-2026-07-17/trials/04-frozen-original-glass-lung-endurance-v1.json`.
It records human-specified `pacing,voice`, one evidence-locatable non-actionable
finding in each focus dimension, zero local repairs, and no automatic focus
selection. A first attempt failed closed on an unlocatable anonymous-comparison
evidence block. The next fixture failed once because an Auditor-guided repair
revision repeated the rejected candidate, then failed on its single manual
rerun because scene re-decision returned an unknown issue code. No third run
was made, so this is one successful fixture rather than a completed focused
six-seed campaign.

Those two runtime failures now have deterministic containment contracts without
rewriting the historical receipt. Optional local repair uses
`executeBoundedOptionalLocalRepair`: initial Reviser failure, independent
Auditor failure, or a non-distinct Auditor-guided revision is recorded as an
unapplied repair while the unchanged candidate remains available for anonymous
evaluation. Unknown scene-decision issue codes receive the one Planner-only
correction described above. At that checkpoint no real fixture had been rerun,
so those checks proved failure handling rather than a recovered quality result.

A later real follow-up tightened the optional two-cycle scheduler. A failed,
rejected, or length-invalid repair now consumes that finding's attempt but does
not consume the remaining candidate-level opportunity: the unchanged current
candidate is reviewed again, the attempted finding signature is skipped, and
the next independently locatable finding may use the remaining cycle. In the
archive-tribunal fixture this allowed a voice repair to pass independent review
after a previous run had stopped at a rejected continuity repair. A second
repetition repair was discarded for leaving the length/ending contract. The
final anonymous comparison still preferred the direct Writer on voice and
pacing, so the experimental voice prompt was rolled back; only the scheduler
behavior remains. The receipt is
`validation/creator-ui/frozen-paired-quality-character-voice-repair-followup-archive-2026-07-17/summary.json`.

That negative result also exposed a second boundary: a Repair Auditor pass
proves only that the proposed block preserves the enumerated facts and stays
inside the replacement scope. It does not prove that the literary finding has
disappeared from the revised manuscript. The frozen quality workflow therefore
runs one independent full-manuscript literary review after an otherwise valid
replacement. If an active `hard_block` or `revision_candidate` remains in the
target dimension, the workflow restores the pre-repair candidate and records
`reverted_target_dimension_persisted`. A passing post-repair review is reused
as the next cycle's current review rather than called twice. Deterministic tests
cover retain and revert decisions. A single archive-tribunal rerun then made 16
real role calls and two efficacy reviews: the pacing replacement was reverted
because one active pacing finding remained, while the voice replacement was
retained after the target count reached zero. The final blind verification
preferred the workflow on voice and the direct Writer on pacing. This proves
the gate executed; one stochastic fixture does not establish general literary
improvement. The receipt is
`validation/creator-ui/frozen-paired-quality-post-repair-efficacy-archive-2026-07-17/summary.json`.

Scene state proposals may be empty. The schema no longer forces a fabricated
character change merely to satisfy `minItems`.

## Candidate Quality Gate

`candidateQualityGate.ts` is the deterministic composition boundary before a
Canon Patch can be prepared and again before an author-confirmed local commit.
It requires the locked intent, active draft, and active literary review to
share the current revisions. Active hard blocks and deterministic violations
block the candidate. An active `revision_candidate` also requires an explicit
author decision: adopt a reviewed local replacement or dismiss the finding.
Taste notes and preserve findings do not become mandatory edits. A local repair proposal that is still `proposed` for the
current review and draft revision also blocks the candidate until the author
accepts or rejects it; stale, accepted, or rejected proposals do not block the
current candidate. When the author selected a five-axis scene direction, the
current draft must also retain a matching direction receipt whose axis and
adjustment evidence still resolves to the current block text by
block/offset/hash. The gate does not calculate a literary score, dismiss an
advisory finding, adopt prose, write Canon, or replace adjacent/long-range
continuity review.

## Local Repair Pipeline

An author-requested repair for an active, evidence-locatable finding invokes a
separate Reviser. It receives one exact target block, its evidence quote,
neighboring blocks for continuity, locked intent, selected recall, and current
constraints. Its output is a `creator-local-repair.v1` candidate with a fixed
`replace_range` operation.

Every declared preserved fact carries two exact locators: one quote copied
from the original target block and one quote copied from the replacement
candidate. Free-text claims that cannot be located on both sides are rejected
before independent review.

The candidate cannot modify the draft. Protected blocks are rejected before
the Reviser runs; a draft revision change rejects a pending candidate; and the
author may explicitly reject the repair candidate. Repair rejection records a
`repair_rejected` event but leaves the underlying finding active. A
`hard_block` cannot be dismissed; only a verified correction can resolve it.
Only the existing explicit author-adoption action creates a new local draft
revision, and it preserves all non-target blocks.
Adoption revalidates the active review, active finding, and exact draft
revision. Rejected or stale repairs, repairs from another review, unchanged
replacement text, and multi-block `offer_variants` guidance cannot create a
new draft revision or imply that a finding was resolved.

Starting a new literary review invalidates every older `RepairProposal` and
`CanonPatch` in the local repository, even when the Context itself did not
need rebuilding. The adoption surface additionally requires a `proposed`
repair whose `reviewId` exactly matches the session's active Review. This
prevents a previously verified suggestion from surviving a later author edit
or review result. The Chapter 20 Computer Use run in
`validation/creator-writing/computer-use-chapter-20-local-repair-invalidation-2026-07-18.json`
exposed one real overpass caused by missing same-chapter comparison evidence,
kept it unadopted, and then verified that a new review persistently removed it.
The new review contained only a `preserve` finding, so the runtime did not
manufacture a replacement proposal merely to exercise the repair UI.

The Reviser does not approve its own candidate. Every generated
`replace_range` proposal is passed to a separate Auditor execution:

```text
Reviser
  -> creator-local-repair.v1 candidate
  -> Auditor
  -> creator-local-repair-review.v1 pass or reject
```

The Auditor checks the repair goal, target scope, continuity, character
knowledge, timeline, causality, promise obligations, and voice. A rejection
must cite the original or candidate block and keeps that proposal hidden from
the adoption surface. One rejection may trigger exactly one bounded Reviser
revision on the same finding and target block. The second Reviser receives the
rejected candidate plus the Auditor's located issues and may only correct those
issues; it cannot offer another direction or expand the repair scope. A new
Auditor execution reviews the revision. A second rejection, invalid evidence,
or incomplete verification fails closed without a third attempt.

A `pass` must enumerate every preserved-fact index after confirming that both
quotes support the same fact. Missing, duplicate, or incomplete coverage fails
closed. Only a complete verified `pass` may be shown to the author, and even
that result remains a candidate until the author explicitly adopts it.

## Cross-chapter Continuity Pipeline

Accepted local chapters can enter a read-only adjacent-chapter campaign:

```text
Auditor continuity review
  -> creator-longform-continuity-review.v1
  -> separate Auditor verification
  -> creator-longform-continuity-verification.v1
  -> Reviser single-block candidate
  -> repair Auditor
  -> in-memory adjacent-window re-review
```

The first review must account for every adjacent transition in its requested
window. Every finding needs one exact quote in the earlier chapter and one in
the later chapter. It separately checks causal handoff, knowledge boundaries,
timeline, promises, foreshadowing, motivation, setting consistency, repetition,
and voice drift; it does not calculate a composite literary score.

A second Auditor execution receives the manuscripts and first-pass findings,
but not permission to edit them. It must independently account for every
finding index, locate evidence in both chapters again, and either verify or
reject the item. Verification may preserve or lower severity but cannot
escalate it. A rejected item cannot enter repair. When the first-pass review
returns no finding, this second gate resolves locally as an empty result and
does not spend a model call.

Only a verified `hard_block` or `revision_candidate` may reach the existing
Reviser-to-Auditor single-block path. A passing repair is applied only to an
in-memory manuscript copy during the trial, then its full adjacent window is
reviewed again. The campaign runner enforces a Chapter 20 stop line, verifies
that the workspace archive hash is unchanged, and records `canonCommitAllowed:
false` for every role run.

The 2026-07-16 real Chapter 1-20 campaign inspected all 19 adjacent transitions
in four windows. It found and separately verified two local issues: the Chapter
5-to-6 pursuer-count handoff and the Chapter 19-to-20 pronoun for Mu Sheng. Both
single-block candidates passed repair review and disappeared from the in-memory
window re-review. Neither candidate was adopted. Evidence is recorded in
`validation/creator-ui/conversation-recall-2026-07-14/chapter-01-20-continuity-campaign-verified-2026-07-16/`
and `chapter-01-20-continuity-repair-trial-2026-07-16/`.

## Long-range Story-thread Pipeline

Adjacent continuity cannot prove that a promise introduced many chapters ago
was progressed, fulfilled, or contradicted. Accepted local chapters therefore
have a separate read-only full-corpus path:

```text
Observer causal/state pass
  -> Auditor independent verification
Observer promise/arc pass
  -> Auditor independent verification
rejected thread only
  -> bounded Observer revision
  -> Auditor re-verification
```

Both Observer passes must inspect every requested chapter. The causal/state
pass covers causal debt, character knowledge, and timeline anchors; the
promise/arc pass covers promises, foreshadowing, and character arcs. Every
thread needs exact source evidence. A `progressed`, `fulfilled`, or `broken`
thread also needs exact later evidence. An `active` thread has source evidence
only and must remain a medium- or low-confidence recall candidate; it is not a
quality finding and is never proof that the author forgot the thread.

A `broken` thread may expose exactly one non-adjacent, dual-evidence finding.
The finding must target only the later chapter and must skip at least one
chapter, leaving adjacent handoffs to the continuity pipeline. A separate
Auditor execution accounts for every thread and finding. A rejected thread or
finding cannot enter repair.

One bounded Observer revision is allowed only for rejected items. It must keep
all verified threads byte-for-byte equivalent, cannot add a thread or finding,
and may only correct or remove a rejected candidate. The revised set then goes
through a new Auditor execution. This is a recall-accuracy correction, not a
manuscript rewrite.

The 2026-07-16 real Chapter 1-20 full-corpus run covered all six dimensions in
two passes. Its latest complete run returned 13 independently verified threads,
including four active recall candidates, and no verified broken-thread
finding. An earlier run exercised the failure path: the Auditor rejected one
Chapter 11 thread marked active after locating progression evidence in Chapter
14. A targeted bounded revision changed only that candidate to `progressed`;
the next Auditor verified it. No manuscript, Canon state, saved thread, or
Chapter 21 state changed. Hash-only evidence is recorded in
`validation/creator-ui/conversation-recall-2026-07-14/chapter-01-20-long-range-story-threads-reconciled-2026-07-16/`
and `chapter-01-20-long-range-thread-reconciliation-2026-07-16/`.

## Historical State Evidence Pipeline

Accepted historical chapters with an empty committed state Patch use a
separate read-only path:

```text
Observer
  -> creator-state-evidence.v1
  -> Auditor
  -> creator-state-evidence-review.v1 pass or reject
```

Every rejected issue must quote an exact substring of the proposal's own
primary or supporting evidence quote. Each proposal may provide up to three
distinct supporting quotes when one accepted manuscript block cannot locate
the complete state claim. All quotes must map to exact accepted block IDs, and
the resulting Patch operation carries the full unique evidence-block set.
Historical artifacts that predate this field still parse with an empty
supporting-quote list.

A structurally valid review with an invented or unlocatable issue quote is
recorded as `review_invalid`; it creates no proposal, triggers no additional
Observer revision, and performs no repository write. A valid first rejection
may request one bounded Observer semantic revision. A second valid rejection
creates no full or partial Patch. The Chapter 11 run exercised multi-block
evidence on seven of eight extracted operations, but Auditor still rejected
unsupported temporal and causal scope. The independent validator therefore
emitted zero proposal operations and performed no write.

## Evidence Boundary

Each local role execution writes a private temporary `run-manifest.json` with:

- pipeline id and sequence;
- exact role and operation;
- start/completion status;
- `privateDataBoundary: local_ephemeral`;
- `canonCommitAllowed: false`.

The manifest does not make model quality claims. The integration fixture proves
the role order, separate executions, shared pipeline identity, zero-state
proposal path, Normalizer repair path, and Reviser-to-Auditor candidate gate
with a fake local executable. The same fixture sends one author-selected local
Canon causal ending and a complete 22-dimension character-state sentinel through
the actual localhost bridge, then reads the temporary Architect and Writer
prompt files. Both prompts must retain every registered dimension,
`recentSceneSummaries`, `manualRecallItems`, and the exact ending while excluding
the retired `relationshipPosition` alias. This proves serialization and role
transport, not that every real character changed or that the model used every
field well. A real Google Chrome Chapter 20 run also proves that both manifests
forbid canon commit and that only an Auditor `pass` exposes the adoption button.
That run did not adopt the candidate and therefore does not claim an accepted
prose improvement.

The frozen original-scene trial at
`validation/creator-ui/author-direction-prose-real-trial-2026-07-16/` separates
the deterministic role fixture from an actual local Working Agent execution.
It ran Architect, structure Auditor, one Writer, and prose Auditor in four
separate calls. The Writer returned 2959 visible characters with a complete
ending. The prose Auditor located exact draft evidence for all five
author-selected mechanism axes and the proposed adjustment. The repository
retains only hashes, counts, role order, and gate decisions; the raw prompt,
draft, and evidence quotes were deleted with the temporary run directory.
This proves one frozen pipeline execution, not general literary quality or an
author decision for the real Chapter 20.

Character context follows a locked-primary-plus-manual-selection rule. The
primary actor from the locked intent remains in `activeCharacters` even when
the author selects only a secondary character card. Every valid manually
selected `character_knowledge` asset also survives Context Snapshot filtering,
so its state and knowledge can reach Planner, Architect, Writer, and Auditor.
Wrong-work, wrong-branch, stale, and unselected character assets remain
excluded.

The localhost role-pipeline fixture serializes one primary character with all
22 state dimensions and one author-selected secondary character with distinct
knowledge, false-belief, and resource sentinels. It reads the actual temporary
Planner, Architect, structure Auditor, Writer, and literary Auditor prompt
files. Candidate search and the structure pipeline must retain both characters
and every secondary sentinel; the literary Auditor must retain the secondary
character's knowledge and false belief when checking the final prose. This
verifies transport through the local role boundary; it does not prove that a
model will use every supplied fact well.

The same fixture also passes the Context Snapshot to the independent literary
verifier, Reviser, and repair Auditor, then inspects their temporary prompts.
All three must retain the manually selected secondary character's knowledge and
false belief. A local repair therefore cannot be treated as verified merely
because the first literary Auditor saw the correct character boundary; the
repair proposal and its independent review must see it too.

The role-pipeline fixture additionally runs a secondary-character `knowledge`
proposal through `Observer -> state Auditor`. The Observer may propose the
knowledge only from a direct prose quote, the proposal path must target the
selected secondary character, and `irreversible` must be true. The independent
state Auditor receives the same Context Snapshot and must explicitly verify the
proposal index. Both temporary prompts are inspected for the prior knowledge
and false-belief sentinels, preventing the state pipeline from silently changing
character identity or promoting an unsupported inference to knowledge.

Model review is not the final source boundary. After Observer and state Auditor
pass, deterministic validation checks every character id against active or
current-Canon characters and checks every advanced or fulfilled promise and
foreshadowing source id against the same Context Snapshot. Newly created
continuity evidence must not claim an existing source id, while timeline and
causal evidence may only use the current chapter id. Any mismatch fails before
state operations are constructed, so two agreeing model roles still cannot
invent a long-form memory source.

The same-model frozen paired trial at
`validation/creator-ui/frozen-paired-quality-real-trial-2026-07-16/` compares a
direct Writer with the Architect/Writer workflow under the same locked intent,
Context Snapshot, manual recall, author-selected direction, target length, and
local bridge. Generation order and anonymous A/B labels are randomized. A first
Auditor and an independent verifier compare 11 dimensions without seeing the
generation path and without producing a composite score or overall winner. The
latest recorded run produced complete 3004- and 3243-character candidates.
The workflow was preferred on tension, character agency, and genre fulfillment;
the direct Writer was preferred on voice, repetition, exposition, and pacing;
continuity, information control, freshness, and scene detail were ties. Both
hard-constraint checks passed. Dimension tradeoffs and hard failures use typed
reason codes that the second Auditor must confirm exactly or reject. The
workflow candidate retained its final
prose-direction receipt. This is evidence of measurable tradeoffs in one
original scene, not a general quality-improvement claim.

The three-seed frozen campaign at
`validation/creator-ui/frozen-paired-quality-multi-seed-real-campaign-2026-07-16/`
repeats the same randomized, anonymous, independently verified comparison for
resource negotiation, environmental withdrawal, and information infiltration.
The workflow was preferred in all three trials for tension, character agency,
genre fulfillment, and embodied scene detail. Continuity was a three-way tie;
information control produced two ties and one rejected first-pass judgment.
Both paths passed all three independently verified hard-constraint checks. No
workflow weakness reason repeated across two seeds, so the runtime was not
tuned to a one-off loss. The campaign still has only three model-reviewed
scenes and therefore does not establish general or statistical literary
improvement.

`pairedQualityCampaign.ts` makes that restraint executable. Repeated literary
weaknesses are counted by distinct fixture id rather than raw dimension count.
One verified workflow hard failure immediately requires human review; a
literary weakness requires at least two distinct fixtures. The decision never
permits automatic prompt mutation. Re-aggregating the three retained child
receipts produced `hold_current_workflow / no_repeated_workflow_weakness`.

The six-seed literary-review and local-repair rerun at
`validation/creator-ui/frozen-paired-quality-six-seed-literary-repair-rerun-2026-07-16/`
reuses the three original child receipts and adds three new frozen original
scenes. Only the new scenes run the post-generation literary review and bounded
local-repair loop. Each new scene exposed at least two actionable findings; the
runner selected at most two, ran one Reviser target block at a time, and sent
every candidate to a fresh repair Auditor. All six applied repairs passed their
independent review. The final workflow lengths were 3105, 2916, and 3007 visible
characters; no whole-text rewrite or author-text overwrite occurred.

Across all six anonymous comparisons, continuity was a six-way tie. The
workflow was preferred in five scenes for tension and scene detail, four for
voice, genre fulfillment, and pacing, three for character agency, freshness,
and repetition, and two for information control. Both paths passed all six
hard-constraint reviews. The evidence also exposes two repeated workflow
weaknesses: `language_repetitive` and `pacing_overextended` each occurred in two
distinct fixtures. The domain decision is therefore
`review_workflow_change / repeated_workflow_weakness`, while automatic prompt
mutation remains forbidden. This is a bounded model-reviewed campaign, not a
composite winner, statistical quality proof, professional editorial judgment,
or author adoption result.

A manually reviewed follow-up adds one prose-economy boundary to the workflow
Writer and literary Auditor. Except for a necessary short pause, a paragraph
must change action state, available information, relationship position, or paid
cost. Adjacent paragraphs may not merely restate the same fact, emotion,
decision, or pressure, and the Architect causal chain may not be expanded as a
shot-by-shot checklist. This boundary is static source code protected by the
role-pipeline fixture and workbench gate; it is not generated from campaign
output and does not enable automatic prompt mutation.

The follow-up evidence at
`validation/creator-ui/frozen-paired-quality-six-seed-prose-economy-rerun-2026-07-17/`
retains the three original child receipts as anchors and reruns only the three
extended fixtures. In those reruns, the archive tribunal scene reversed its
prior repetition and pacing losses after two independently reviewed local
repairs; the floodgate scene favored the workflow on pacing while its repetition
judgment was rejected by the second Auditor; the glass-lung scene favored the
workflow on repetition but still favored the direct Writer on pacing. Across
the mixed six-receipt aggregate, `language_repetitive` is no longer a repeated
workflow weakness. `pacing_overextended` remains repeated, and
`voice_flattened` becomes repeated. Both paths still pass 6/6 hard-constraint
reviews, so the decision remains `review_workflow_change`, not automatic
promotion. Because only three fixtures were regenerated and model sampling is
non-deterministic, this cannot attribute every change to the prose-economy
boundary.

Any proposed local repair removes the previous prose-direction receipt before
review. The repair Auditor verifies the target, preserved facts, continuity,
knowledge, timeline, causality, promises, and voice, but that pass alone does
not recreate the five-axis receipt. After the full-manuscript literary review
confirms that the target dimension no longer has an active hard or revision
finding, the runtime invokes a standalone Auditor-only
`scene_author_direction_draft_review` against the revised body. A semantic
reject or invocation failure keeps the original candidate. A pass is mapped to
new block-local offsets and excerpt hashes for the revised draft revision;
mapping failure also fails closed. This operation never calls Writer, adopts
prose, writes Canon, advances a chapter, or publishes.

The isolated real-model receipt at
`validation/creator-ui/post-repair-direction-receipt-real-trial-2026-07-17/summary.json`
uses a frozen original five-block draft with exactly one repaired block. One
real Auditor passed all five axes and the proposed adjustment; the application
mapped all evidence to the revised blocks and created a
`scene-draft-direction-receipt.v1`. This closes the standalone execution gap.
It does not claim that the stochastic full repair pipeline reliably passes its
earlier fact-preservation and target-dimension gates.

If the first full-manuscript efficacy review still reports the same target
dimension, the frozen quality runner may make one evidence-guided retry. The
new finding must be active, non-low-confidence, in the same dimension, and
bound to exactly one unprotected revised block. The retry has one Reviser call
and one independent Repair Auditor call, with no Auditor-guided third version.
Length, complete ending, full-manuscript efficacy, and author direction are all
rechecked; any failure restores the pre-repair candidate. The first real run
after wiring this contract did not trigger it because its initial exposition
repair passed all gates. That receipt is
`validation/creator-ui/frozen-paired-quality-efficacy-guided-retry-archive-2026-07-17/summary.json`;
it proves compatibility, not real-model retry efficacy.

The first comparison Auditor has one narrower evidence-only correction path.
The domain enumerates every missing Candidate A/B block reference across all 11
dimensions and both hard-constraint entries, then sends the complete list to
`paired_literary_comparison_revision`. That call is allowed only when the
domain error is exactly `evidence_missing`. Dimension ordering, candidate
ordering, reason-code semantics, comparison identity, or other contract errors
fail closed without a model correction. The corrected object must pass the
complete validator again; a second evidence failure stops the trial. This does
not alter either manuscript or replace the independent verification Auditor.

The independent verification Auditor has a separate, equally bounded
`paired_literary_comparison_verification_revision` path. The domain first
enumerates every invalid verification block reference. The same verification
Auditor may then replace only the affected candidate-side ids and rationale.
Runtime assertions freeze every decision, confirmed preference, reason code,
hard-constraint status, violation type, and all unaffected evidence. A semantic
change or second evidence failure closes the trial; no third Auditor or Writer
is invoked.

If Writer output needs length or terminal-sentence normalization, the
Normalizer runs inside the same scene pipeline before the prose-direction
Auditor. If a normalized draft is already a complete scene and only remains
slightly short, one bounded Writer call may return only `appendText` within the
calculated deficit. The bridge appends it without replacing existing prose,
revalidates the complete candidate, and still runs the final prose Auditor.
Writer and selected-text outputs must return `stateProposals: []`;
the independent Observer owns evidence-grounded 22-dimension extraction after
the final prose exists. A repair cannot reuse evidence from the old body; the
final returned body must receive the independent review that produces the
receipt.

## Current-manuscript continuation boundary

The current author manuscript now contributes one bounded
`current-manuscript:<chapterId>` entry to `recentSceneSummaries`. The adapter
selects direct opening, progression, and ending evidence from the manuscript;
it does not treat the manuscript as Canon and does not admit an unselected
historical chapter. Historical scene summaries remain restricted to the
author's manual recall allowlist.

Long-form scene generation fails before Architect or Writer when all of the
following are true: the request is not a selected-text operation, it continues
author text or targets chapter 2 or later, and no recent-scene summary exists.
Both the browser adapter and localhost bridge enforce the same
`recent_scene_context_required` error. This prevents an unstable or incomplete
route from spending a model call on a context-free continuation while leaving
new first-chapter and selected-text work available.

A real Google Chrome Chapter 20 run first exercised the negative path on an
unstable route: the product showed the specific recent-context instruction and
the bridge received no request. The stable work/branch/chapter route then
restored the accepted local manuscript, Chapter 19 Canon memory, the protagonist
card, and one author-selected MiroFish rehearsal card. A real independent review
found a cross-chapter repetition risk in the shared
`mechanical diagnosis -> spoken relay -> other characters execute` climax
shape.

The author-triggered local-repair path made two real Reviser attempts. The first
repair Auditor rejected semantic drift in repair goal, fact preservation, and
command authority. The bounded retry preserved eight enumerated facts but was
still rejected because it narrowed an author-locked three-recipient report to
one recipient. No repair candidate reached the adoption surface, no manuscript
or Canon value changed, and Chapter 21 remained untouched. This is a real
fail-closed workflow result, not a prose-improvement claim. The privacy-safe
receipt is
`validation/creator-writing/computer-use-chapter-20-mirofish-workflow-2026-07-18.json`.

## Verification

```bash
npm run test:creator-working-agent-roles
npm --prefix app run test:creator-decision-domain
npm run test:creator-manual-recall-adherence
npm run check:creator-manual-recall-adherence-real-trial
npm run test:creator-paired-quality-campaign
npm run check:creator-author-direction-prose-trial
npm run check:creator-post-repair-direction-receipt-trial -- --require-pass
npm run check:creator-frozen-paired-quality-trial
npm run check:creator-frozen-paired-quality-campaign
npm run check:creator-frozen-paired-quality-literary-repair-campaign
npm run check:creator-frozen-paired-quality-prose-economy-campaign
npm run test:creator-long-range-story-threads
npm run check:creator-decision-workbench
npm run check:longform-quality
npm run check:pivot
```
