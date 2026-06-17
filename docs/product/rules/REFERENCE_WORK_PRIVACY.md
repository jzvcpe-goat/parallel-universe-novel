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

```yaml
source_evidence: Some Representative Work Title
reference_work: Some Representative Work Title
benchmark_title: Some Representative Work Title
```

## Engineering Gate

Run:

```bash
npm run scan:reference-privacy
```

When the local key is available, the scanner decrypts the vault and checks public runtime/docs for accidental plaintext titles. It reports only file and line locations, not the title itself.

## UX Gate

Creator Studio and Reader Web may show:

- genre names
- story constraints
- anonymous source labels
- template names owned by this product

They must not show:

- representative work names
- source evidence names
- competitor/platform research labels
- benchmark title lists

