# P108 Remote Assignment Local Boundary Guard

P108 hardens the operator handoff boundary around the remote runtime assignment
file. P75 already defines the local assignment intake, P79 generates command
packs, and P105 turns current blockers into a fill plan. P108 proves that this
local operator surface cannot drift into source control or be confused with the
fixture path.

Command:

```bash
npm run check:remote-assignment-local-boundary
```

## Boundary

The operator-filled file remains local-only:

```text
deploy/runtime-production/remote-assignment.local.json
deploy/runtime-production/remote-assignment.*.local.json
```

Both patterns must stay ignored by Git. The gate checks tracked files in a Git
checkout and fails if any matching local assignment is committed. In source
workspace mode without `.git`, it records that the tracked-file check is skipped
and still validates the committed template, fixture, docs and release sync
manifest.

## Template Rules

`deploy/runtime-production/remote-assignment.example.json` must remain a
placeholder-only template:

- service ids are placeholders;
- HTTPS origins are placeholders;
- provider secret-store flags are `false`;
- no database URLs, Tool Bridge tokens, model keys, provider API tokens, private
  keys, system prompt payloads, raw runtime state or reference-work vault
  contents appear in the file.

## Fixture Rules

`deploy/runtime-production/remote-assignment.fixture.json` is allowed to prove
schema and P79 command generation. It is not production readiness evidence.

The fixture must:

- use reserved `.invalid` origins;
- contain no secrets;
- let P79 produce an execution pack;
- make P75 strict readiness fail on health readiness.

In short: fixture can generate commands but cannot unblock production
readiness.

Machine anchor: fixture cannot unblock production readiness.

## Artifact

The gate emits:

```text
artifacts/runtime/remote-assignment-local-boundary-*.json
```

The artifact records only boundary metadata:

- whether tracked local assignment files exist;
- whether a local assignment file is present on disk;
- whether template and fixture checks passed;
- whether the fixture was rejected by strict P75 readiness.

It never includes local assignment contents.

## Acceptance

- `package.json` exposes `check:remote-assignment-local-boundary`.
- Root `npm run test` includes `check:remote-assignment-local-boundary`.
- `.gitignore` keeps both local assignment patterns ignored.
- No `remote-assignment*.local.json` file is tracked in the release repo.
- Example assignment remains placeholder-only.
- Fixture assignment remains reserved `.invalid` evidence.
- P75 strict mode rejects the fixture.
- P75, P79 and P105 docs mention this local boundary.
- Release sync manifest includes this doc and script.
