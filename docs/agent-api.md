# Life OS Learning Agent API

Use a personal API key to let an agent prepare and maintain your learning paths. Create a key in **Learning Studio → Agent key**; save it immediately because Life OS never shows the full secret again.

## Authentication

Send the key as a bearer token. Give each agent the narrowest scopes it needs:

- `learning:read` — read paths and progress.
- `learning:write` — import or replace a complete curriculum.
- `learning:progress` — mark work complete and append sessions or evidence.

```sh
curl -H "Authorization: Bearer los_your_secret" \
  https://your-life-os.example/api/v1/learning/paths
```

## Import a learning path

`POST /api/v1/learning/paths/import` accepts a whole, ordered curriculum. Always send a unique `Idempotency-Key`: retries with the same body return the original result rather than duplicating the path.

```sh
curl -X POST https://your-life-os.example/api/v1/learning/paths/import \
  -H "Authorization: Bearer los_your_secret" \
  -H "Idempotency-Key: go-path-2026-10-16" \
  -H "Content-Type: application/json" \
  --data @docs/examples/go-learning-path.json
```

Required values are `title`, module `title`, and item `title`. `externalSourceId` identifies a path across imports. To replace it safely, send the current `expectedVersion` returned by the API. A mismatch returns `VERSION_CONFLICT` rather than overwriting newer work.

## Progress and evidence

- `PATCH /api/v1/learning/items/:id` with `{ "state": "completed" }` marks a task complete.
- `POST /api/v1/learning/sessions` records focused time.
- `POST /api/v1/learning/evidence` records notes, links, submissions, or reflections. Items that require evidence cannot be completed first.

Responses include `{ "api_version": "v1", "data": ... }`; errors include a stable error `code`. Revoke a compromised key in Learning Studio immediately.
