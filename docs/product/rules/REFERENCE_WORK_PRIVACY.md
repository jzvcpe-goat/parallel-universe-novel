# Representative Work Privacy

This project may use market and genre research internally, but public source code, public docs, runtime payloads, frontend UI, and GitHub Pages output must not expose representative work titles used as source evidence.

## Rule

- Public rule/kernel files use anonymous IDs such as `rwref_0013`.
- Plain titles stay outside the public repository.
- The encrypted vault is committed at `reference-work-vault.enc.json`.
- The local decryption key is stored outside the repo at `/Users/james/Documents/PUF/private/reference-work-vault.key`.
- Team environments can provide the same key through `REFERENCE_WORK_VAULT_KEY`.

## Allowed Public Fields

```json
{
  "sourceRefs": ["rwref_0013", "rwref_0027"]
}
```

## Forbidden Public Fields

Public files must not contain plaintext fields that identify a research work or its author. Use anonymous `rwref_*` IDs only. If a field would reveal a title, author, benchmark item, or source evidence name, keep it out of the public repository and store it only inside the encrypted vault.

## Engineering Gate

Run:

```bash
npm run scan:reference-privacy
```

When the local key is available, the scanner decrypts the vault and checks public runtime/docs, Git object history, runtime readiness artifacts, and the current static deployment bundle for accidental plaintext titles. It reports only file and line locations, not the title itself.

The scan covers tracked public repository files, selected source roots, `app/dist`, `artifacts/runtime`, and Git history, not only the rule directory. This prevents handoff notes, QA reports, generated code, readiness ledgers, build outputs, or old commits from reintroducing private research titles.

GitHub Pages CI runs the privacy scan twice: once inside the root runtime checks, and once immediately after `npm --prefix app run build` so the uploaded Pages artifact is checked after the current bundle exists.

Without the local key, CI still enforces the structural gates: no committed key file, no concrete `REFERENCE_WORK_VAULT_KEY`, no public title metadata in rule artifacts, no non-anonymous `sourceRefs`, and matching encrypted/public ref counts.

The repository must never contain the vault key file or a concrete `REFERENCE_WORK_VAULT_KEY` value. Documentation may mention the variable name, but values belong only in team-controlled local or CI secrets.

## UX Gate

Creator Studio and Reader Web may show:

- genre names
- story constraints
- template names owned by this product

They must not show:

- representative work names
- source evidence names
- source labels or provenance maps
- competitor/platform research labels
- benchmark title lists
