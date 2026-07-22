# MiroFish Character Rehearsal Adapter

## Status

The repository implements the adapter contract, request/result schemas,
evidence validation and a local bridge endpoint. Synthetic runs and one frozen
real Chapter 20 context run are runtime-verified on this machine at community commit
`3e98e776cdfc9556c12ace82a60e9d3da5bd41e7`.

The packaged `uv tool` wheel is not the verified path: that build omitted
`scripts/run_reddit_simulation.py`. The verified path uses an explicit
`PUF_MIROFISH_PROJECT` source checkout. The upstream doctor also checks the
name `codex-cli`, while the installed executable is named `codex`; the local
operator test used a temporary command-name shim without modifying upstream
source.

This is an optional character rehearsal path. It is not the main writing agent,
not a retrieval system, not a literary score and not a canon writer.

## Upstream Choice

- The [official MiroFish repository](https://github.com/666ghj/MiroFish) provides
  the multi-agent simulation design, GraphRAG pipeline and OASIS-based social
  simulation. Its source deployment documents separate LLM and Zep credentials.
- The zero-extra-API-key startup path targets the independent
  [mirofish-cli community fork](https://github.com/amadad/mirofish-cli), which can
  route model work through an existing Codex CLI or Claude CLI subscription and
  emits machine-readable run artifacts.
- Both repositories use AGPL-3.0. No upstream code is vendored into this
  repository. Distribution and production use require a separate license review.

The CLI fork is an external process adapter, not an official MiroFish API
guarantee. Its behavior and artifact contract must be rechecked before version
upgrades.

## Product Boundary

```text
author selects 2-8 characters and confirmed facts
  -> author confirms external export
  -> MiroFish runs 1-5 short rounds
  -> bridge uses upstream batch_interview for selected character profiles
  -> bridge closes the upstream environment through close_env
  -> bridge reads selected interviews / actions / timeline / report
  -> Reflector extracts exact evidence into card proposals
  -> independent Auditor verifies every proposal or fails closed
  -> proposed character cards and setting cards
  -> author may accept, edit or reject later
```

Hard invariants:

1. Only explicitly selected characters and facts leave the Creator process.
2. Every proposed card and state change must point to a selected character's
   located direct interview evidence. A generated report cannot support a card
   or state change by itself.
3. State changes are limited to the registered 22 character dimensions.
4. The result status is always `proposed`.
5. The adapter cannot write manuscript text, build a Canon Patch or commit canon.
6. Empty proposals are valid when evidence is weak; similar cards are not added
   to fill a quota.
7. Auto-generated group profiles are not accepted as selected-character
   evidence and are not exposed as card owners.
8. Temporary run artifacts remain under the local operating-system temp folder.
9. A semantic revision must preserve every proposal and bound evidence item that
   the first Auditor already verified. It may only revise or remove rejected
   proposal identities and cannot introduce a new proposal identity.

## Real Owners

| Responsibility | File |
|---|---|
| 22-dimension state contract | `app/src/features/creator-decision/characterState.ts` |
| Request/result and evidence rules | `app/src/features/creator-decision/characterSimulation.ts` |
| Browser-side external adapter | `app/src/features/creator-decision/miroFishCharacterSimulationAdapter.ts` |
| Active Agent capability and author-confirmed card capture | `app/src/features/creator-decision/localWorkingAgent.ts`, `app/src/apps/creator/routes/creatorCharacterRehearsalService.ts` |
| Conversational request and current-context projection | `app/src/apps/creator/routes/creatorCharacterRehearsalConversationService.ts`, `app/src/apps/creator/routes/useCreatorCharacterRehearsal.ts` |
| Author-facing candidate review | `app/src/components/creator/workspace/CreatorCharacterRehearsalCandidate.tsx` |
| Local external-process bridge | `scripts/creator-working-agent-bridge.mjs` |
| Source-mode invocation and IPC lifecycle | `scripts/mirofish-cli-invocation.mjs`, `scripts/mirofish-cli-lifecycle.mjs` |
| Direct-evidence gate | `scripts/mirofish-character-evidence.mjs` |
| Independent semantic-review gate | `scripts/mirofish-character-review.mjs` |
| Verified-candidate preservation regression | `scripts/test-mirofish-character-review.mjs` |
| Structured result schema | `validation/creator-ui/schemas/character-simulation.schema.json` |
| Domain regression | `app/tests/creator-character-simulation.ts` |

## Local Activation

The verified local operator procedure uses a pinned source checkout:

```bash
git clone https://github.com/amadad/mirofish-cli.git /tmp/puf-mirofish-cli
git -C /tmp/puf-mirofish-cli checkout 3e98e776cdfc9556c12ace82a60e9d3da5bd41e7
LLM_PROVIDER=codex-cli uv run --project /tmp/puf-mirofish-cli mirofish doctor
PUF_MIROFISH_PROJECT=/tmp/puf-mirofish-cli \
PUF_MIROFISH_LLM_PROVIDER=codex-cli \
npm run dev:creator-working-agent
```

The bridge exposes `POST /v1/character-simulation`. A request is rejected unless
`authorConfirmedExport` is exactly `true`. The `/health` response reports only
configuration and invocation mode; it does not claim that a future run will
produce useful evidence.

The source process intentionally waits for IPC after simulation. The adapter
uses the upstream `batch_interview` command for exact selected-name profile
matches, captures those responses, then sends the upstream `close_env` command.
It does not patch OASIS, GraphRAG or MiroFish simulation code.

The real Creator conversation accepts one compact instruction instead of a
multi-field form, for example:

```text
角色排练：陆沉舟、塞文；如果两人必须争夺同一项现场决定权，会怎样？
```

The command only becomes a prepared request. The external process does not start
until the author confirms the visible gate. Only explicitly named local
character cards, current selected setting facts and hard constraints are sent;
the manuscript body is excluded. Returned proposals remain local candidates and
each card requires a separate confirmation before a new writing asset is saved.

## Verified Synthetic Run

Evidence is stored in
`validation/creator-ui/mirofish-synthetic-runtime-2026-07-15/`.

The run completed with two selected synthetic characters. MiroFish also created
two group profiles; they were excluded from interviews and cannot own evidence
or cards. One selected character gave a substantive answer and received a
candidate card. The second gave only a boundary statement and received no card.
That is the intended fail-closed behavior. Nothing was adopted or written to
canon.

A second synthetic source-mode run on 2026-07-17 is stored in
`validation/creator-ui/mirofish-synthetic-runtime-rerun-2026-07-17/`. The
upstream run completed with seven generated profiles, while the bridge
interviewed only the two exact selected names. The first Reflector returned two
low-confidence character cards and one setting card. The first Auditor verified
the character cards but rejected the setting card for an evidence overclaim.
The only semantic revision preserved the verified cards, removed the rejected
card, and passed the final Auditor. The run then motivated a deterministic
preservation gate; replaying the archived responses through that gate passed,
while proposal mutation, bound-evidence drift and new proposal identities are
covered by failing regressions. The final result contains no state changes and
remains entirely `proposed`.

## Verified Real Chapter 20 Context Run

The public receipt is stored at
`validation/creator-writing/chapter-20-mirofish-character-rehearsal-2026-07-18.json`.
The source prompt hash matches the frozen real Chapter 20 Working Agent input.
The author-confirmed request exported only the selected character cards for Lu
Chenzhou and He Lan, three confirmed setting facts and the hard constraints;
the manuscript body was excluded.

The pinned source-mode process completed one round. Seven direct interview
evidence items produced two character-card proposals and two setting-asset
proposals. The first Auditor required a bounded semantic revision; the final
result passed the direct-evidence gate and stopped at the author candidate
boundary. No card or setting was saved, no 22-dimension state change was
proposed, and no manuscript, Canon, Chapter 21, cloud or publication state was
read or changed by the trial. The private request/result remains in an
operating-system temporary directory; the repository retains only hashes and
aggregate counts.

This run proves that the external rehearsal and review boundary execute against
real story context. It does not prove that adopting the proposals improves
literary quality, and it does not remove the AGPL distribution review or author
blind-review requirements.

## Acceptance Before Product Use

- `mirofish doctor` passes with the chosen external provider.
- One fixture run completes with no unselected character evidence or private
  draft data.
- Every returned quote exists in its declared actions, timeline or report artifact.
- A weak selected-character answer returns a warning and no card instead of an
  invented proposal.
- The author can reject all proposals without changing local canon.
- No Chapter 21 or later content is generated during the current 20-chapter quality run.
