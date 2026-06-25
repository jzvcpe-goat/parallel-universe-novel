# P165 Narrative OKF Knowledge Layer

Status: active contract gate  
Boundary: internal knowledge packaging, no runtime rewrite  
Owner: product architecture + agent runtime  
Date: 2026-06-24

## Purpose

P165 turns recurring architecture knowledge into OKF-style Markdown cards with
frontmatter. The goal is to make the rules readable by humans and agents while
keeping the existing runtime truth unchanged.

This is a knowledge-contract layer, not a new source of executable rules.
`genre-runtime-rules.v1.json` remains the runtime truth, and FastAPI remains the
business fact owner.

## Command

```bash
npm run check:narrative-okf-knowledge-layer
```

## Cards

```text
docs/product/knowledge/narrative-okf/genre-kernel.md
docs/product/knowledge/narrative-okf/constraint-profile.md
docs/product/knowledge/narrative-okf/creator-socratic-flow.md
docs/product/knowledge/narrative-okf/quality-brake.md
docs/product/knowledge/narrative-okf/runtime-tool-bridge.md
docs/product/knowledge/narrative-okf/public-projection-policy.md
docs/product/knowledge/narrative-okf/market-template-refresh.md
```

## Checks

P165 verifies that:

1. Every required card has frontmatter.
2. Every card declares `okf_version`, `kind`, `id`, `status`, `visibility`,
   `runtime_boundary`, `source_authority`, `public_projection` and
   `representative_work_names`.
3. Cards point back to existing authoritative source files.
4. Cards preserve the privacy boundary:
   `representative_work_names: encrypted_vault_only`.
5. Cards do not contain visible representative-work title syntax, recoverable
   source mappings, provider keys, database URLs or service-role material.
6. Root `npm run test` includes the P165 check.
7. Release sync includes the P165 cards and script.

## Non-Goals

P165 does not:

- rewrite ConstraintProfile or GenreKernel selection;
- create new provider prompts;
- expose internal registry identifiers to public UI;
- change public projection DTOs;
- deploy or configure managed Data API services;
- promote candidate story text to canon.

## Acceptance

1. `npm run check:narrative-okf-knowledge-layer` passes in release and source.
2. `npm run test` passes.
3. `npm run check:public-projection-privacy` and `npm run scan:reference-privacy`
   still pass.
4. The next live blocker remains external managed Data API evidence, not a
   missing internal knowledge contract.
