# Request Status Machine

Scope: Reader can see public request progress. Creator can move requests through
allowed author-side transitions.

Allowed public statuses:

```text
已收到 -> 已看到 -> 处理中 -> 已发布
                 \-> 暂不处理
```

Internal values:

- `pending`: 已收到
- `acknowledged`: 已看到
- `in_progress`: 处理中
- `published`: 已发布
- `rejected`: 暂不处理

Rules:

- `published` cannot move back to `in_progress`.
- `rejected` cannot move to `published` unless a future reopen flow records a reason.
- P0 does not permanently merge duplicate requests unless `duplicate_of_request_id` or `merged_into_request_id` exists.
- Without merge columns, P0 may only show grouped requests visually.
