# Publish Bundle V2 Contract

Date: 2026-07-10

PublishBundle is the local, author-controlled bridge between private writing and public delivery. It is a durable product object, not a wrapper around immediate publication.

## Lifecycle

```text
draft
  -> reviewed
  -> author_confirmed
  -> exported | submitted
  -> published | failed | needs_manual_action
```

Prepare does not publish. `createPublishBundle()` always creates an unconfirmed manifest, persists a frozen body snapshot, and records a local `draft` bundle. Review and author confirmation are separate durable transitions. Closing a dialog or leaving the page never deletes the bundle.

`ready` remains a read-only compatibility status for pre-WP5 records. New code may not create it; compatibility reads normalize it to `author_confirmed`.

## Integrity And Identity

- Every body and package payload file uses SHA-256.
- The bundle id is deterministic for the local draft identity, target, title, and confirmed content checksum.
- The own-platform idempotency key is derived from bundle id, target, and content checksum.
- Author confirmation changes the manifest confirmation fields but not the content checksum or idempotency key.
- Package import rejects missing, undeclared, or checksum-mismatched files.
- A receipt is accepted only when bundle id, idempotency key, and content checksum all match.

## Package Shape

```text
publish-bundle-{bundleId}.zip
  publish-bundle.json
  body.md
  reader-summary.md
  external-copy/
    markdown.md
    plain-text.txt
```

The package is author-readable and can be handed to a working agent or used for manual publication. P0 does not claim automated external platform publishing.

## Submission And Recovery

Own-platform submit is a distinct high-risk action after author confirmation. It writes one deterministic local receipt as `submitted`, then updates that same receipt to `published`, `failed`, or `needs_manual_action`.

- A repeated successful submit returns the existing receipt and does not call the public adapter again.
- A known failure may retry with the same idempotency key.
- A connection loss after submit becomes `needs_manual_action`; the client does not retry blindly.
- A matching imported receipt can recover an uncertain or externally completed publication.
- A failed publication resumes from the frozen bundle package and does not rebuild from a possibly changed draft.

## Server-Owned Publish Transaction

Creator routes and components never write cloud tables directly. The
PublishBundle adapter calls `publish_bundle_transaction` with the confirmed
bundle id, target, public chapter body, SHA-256 checksum, idempotency key, and
linked public feedback ids. Local draft references, private reminders, writing
library bodies, model credentials, and agent reasoning are not RPC inputs.

The RPC verifies the non-anonymous allowlisted author and work ownership, then
commits branch preparation, chapter creation, publish event, linked request
status, authoritative receipt, and private audit record atomically. A retry with
the same matching idempotency key returns the original receipt. A conflicting
retry is rejected, and any failure rolls back every write.

## Draft Handoff Compatibility

PublishBundleDraft handoff is local-first. Writing Desk and Today may create a lightweight local handoff record before opening the existing Publish Check route. New handoffs use the `bundle` route parameter. The old `draft` parameter is fallback-only and may never silently select a different draft.

## Privacy

- Private body text stays in the local package store and author-exported ZIP.
- Agent lifecycle logs contain ids, status, risk, hashes, and message codes only.
- Receipts contain delivery identity and outcome, not prompts, provider responses, credentials, or private reasoning.
- Cloud publication receives only the content the author explicitly confirmed for delivery.

## Owners

- Schema: `app/src/features/creator-pivot/publishBundleSchema.ts`
- Package integrity: `app/src/features/creator-pivot/publishBundlePackage.ts`
- Lifecycle: `app/src/features/creator-pivot/publishBundleLifecycle.ts`
- Own-platform adapter: `app/src/features/creator-pivot/publishBundleAdapter.ts`
- Local persistence: `app/src/local-db/creatorLocalPublishRepository.ts`
- Publish orchestration: `app/src/apps/creator/routes/creatorPublishBundleActionService.ts`
- Browser download/file port: `app/src/apps/creator/routes/creatorPublishBundleBrowserActionService.ts`
- UI composition: `app/src/apps/creator/routes/CreatorPublishBundleRoute.tsx`

## Gates

```text
npm run check:publish-bundle-schema
npm run check:publish-bundle-lifecycle
npm run check:publish-receipt-recovery
npm run check:publish-transaction-contract
npm run test:publish-wp6
npm run qa:publish-bundle-roundtrip
```
