# Public Projection Privacy Boundary Matrix

Status: active gate  
Scope: Creator Studio, Reader Web, FastAPI public responses, static preview build, logs, fixtures, CI artifacts, and rule/runtime handoff files

## Decision

P4 is frozen as an architecture boundary. Do not continue work under a vague "optimize P4" task name. Future work must name the exact boundary or gate it changes, then prove that boundary with a command.

Allowed boundary names for future PRs:

- Document-Core Boundary
- Runtime Registry Boundary
- Reference Work Privacy Boundary
- Public Projection Boundary
- Deprecated Case Logic Guard
- Quality Brake Mapping

## Matrix

| Surface | Allowed | Forbidden | Gate |
| --- | --- | --- | --- |
| Human rule docs | Product-language constraints, kernel descriptions, anonymous `rwref_*` references, redacted policy summaries | Representative work names, author names, `rwref_*` to plaintext mapping, provider prompt plumbing, deprecated case logic | `npm run scan:p4-rule-source`, `npm run scan:reference-privacy` |
| Runtime registry | `ConstraintProfile`, `GenreKernel`, anonymous `sourceRefs`, document-core policy, fail behavior, compatible profile links | Representative work names, source evidence labels, provider prompt plumbing, one-off browser notes as executable rules, deprecated case logic | `npm run scan:p4-rule-source`, `npm run check:reference-vault-access` |
| Internal session state | Full audit facts needed for runtime debugging, active profile ids, active kernel ids, runtime rule metadata, provider status inside private server/session storage | Raw model keys, vault key values, decrypted representative mapping, public response reuse without projection | `node scripts/run-backend-python.mjs -m pytest backend/tests/test_creator_dialogue_api.py` |
| Public API | Story-facing guide summary, candidate text, at most two questions, setting cards without internal ids, public quality summary | Representative work names, `sourceRefs`, `rwref_*` mapping, `profile.id`, `kernel.id`, provider prompt plumbing, `prompt_id`, `prompt_contract`, vault metadata, raw runtime facts | `npm run check:public-projection-privacy`, `npm run smoke:creator-chain` |
| UI | Product copy, reading state, creation guide, story notes, public quality feedback | Backend/provider/fallback/system wording, `sourceRefs`, `profile.id`, `kernel.id`, runtime registry ids, vault metadata, deprecated case explanations | `npm run scan:public-ui-boundary`, `npm --prefix app run build`, `npm run check:public-projection-privacy` |
| Preview build | Minified production bundle with product-facing strings only | Representative work names, `sourceRefs`, `rwref_*`, `profile.id`, `kernel.id`, provider prompt plumbing, vault metadata, `prompt_id`, `prompt_contract` | `npm run check:public-projection-privacy` |
| Logs / fixtures / artifacts | Redacted counts, pass/fail status, policy names, command evidence, anonymous aggregate refs when explicitly documenting privacy policy | Representative work names, `rwref_*` to plaintext mapping, decrypted vault payloads, raw prompts, raw provider requests, raw state, secret values | `npm run scan:reference-privacy`, `npm run check:public-projection-privacy` |
| Git history | Public docs/code/artifacts with no plaintext representative mapping and no concrete vault key | Representative work names, author names, concrete vault keys, private mapping files, raw provider secrets | `npm run scan:reference-privacy` |

## Public Projection Contract

Every public projection must satisfy these rules:

1. Public responses are story-facing. They may explain what the writer can do next, but they must not expose the machinery that produced the answer.
2. Runtime ids stay internal. `profile.id`, `kernel.id`, `sourceRefs`, active profile ids, active kernel ids, and raw runtime rule metadata are never returned to Reader Web or Creator Studio public responses.
3. Provider plumbing stays internal. Public API, UI, preview build, logs, and fixtures must not expose provider request details, model routing, raw prompt contracts, fallback chains, or vault metadata.
4. Reference works are private. Public artifacts can prove that anonymous refs exist and that a vault is encrypted, but must never expose representative work names or `rwref_*` to plaintext mapping.
5. Deprecated case logic is non-executable. Browser comments, temporary prompt experiments, and single-story negative examples cannot become runtime rules.

## CI Key Rule

The encrypted representative-work vault must not be CI-decryptable by default. CI may validate:

- encrypted vault shape,
- anonymous public refs,
- runtime/docs no plaintext title markers,
- `sourceRefs` drift,
- absence of committed keys,
- absence of leaked representative names in public files and build output.

CI should not own the default decryption key. Decryption is a team-only local or explicitly provisioned secret path.

