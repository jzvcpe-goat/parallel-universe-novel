# Publish Flow

Scope: Creator Publish Check is the only product surface that turns local draft
prose into a publish bundle, and the publish-bundle adapter is the only path
that can turn that confirmed bundle into public Reader content.

Publication is explicit, bundle-first, and author-confirmed.

Direct browser table writes are forbidden. The page calls the publish-bundle
adapter, and only that adapter may call the server-owned
`publish_bundle_transaction` RPC after author confirmation.

When the Publish Check page is opened with a local draft reference, it must
match that exact private draft. Missing or stale draft links must stop
publication and send the author back to the Writing Desk instead of falling
back to another draft.

Server transaction commits after explicit confirmation:

- `branches`
- `chapters`
- `publish_events`
- `reader_requests.status = published`

Required publish check:

1. Work destination.
2. Main line or IF branch.
3. Branch anchor.
4. Linked reader request.
5. Public title.
6. Prose preview.
7. Reader-facing location.
8. Post-publish impact.

Gate classes:

- Must pass: destination, title, non-empty prose, author identity.
- Warning: long title, missing linked request, branch summary missing.
- Confirm again: publish, archive, hide, reject, clear local settings.

The RPC validates the allowlisted, non-anonymous author session, work ownership,
bundle id, SHA-256 content checksum, target, linked public feedback, local client
identity, and idempotency key before writing. Branch preparation, chapter insert,
publish event, linked request status, authoritative receipt, and private audit
event are one transaction. A repeated idempotency key returns the same receipt.

On success:

- Write `branches` as needed.
- Write `chapters`.
- Write `publish_events`.
- Update linked `reader_requests` to `published`.

On failure:

- Tell the author: `发布未完成，正文仍在草稿箱。`
- Keep the local PublishBundle available for recovery.
- Do not leave a branch, chapter, publish event, linked request update, receipt,
  or audit event partially committed.
