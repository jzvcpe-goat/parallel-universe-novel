# P109 GitHub Runtime Variable Boundary Guard

## Purpose

P109 protects the GitHub repository variable layer used by GitHub Pages. These
variables are public runtime configuration and non-secret attestation only. They
must never become a convenient place to store database URLs, Tool Bridge token
values, model keys, private keys or provider API tokens.

## Command

```bash
npm run check:github-runtime-variable-boundary
```

The command reads repository variables with `gh variable list` when available,
validates the allowed runtime variable names and writes a privacy-safe artifact:

```text
artifacts/runtime/github-runtime-variable-boundary-*.json
```

The artifact contains variable names, gate status and issue codes only. It never
copies variable values.

## Allowed Repository Variables

Only these runtime variables are accepted:

- `VITE_PUBLIC_RUNTIME_MODE`
- `VITE_API_ORIGIN`
- `VITE_API_BASE_URL`
- `VITE_AGENT_RUNTIME_BASE_URL`
- `REMOTE_API_SERVICE_ID`
- `REMOTE_AGENT_SERVICE_ID`
- `REMOTE_API_SECRETS_CONFIGURED`
- `REMOTE_AGENT_SECRETS_CONFIGURED`

`VITE_PUBLIC_RUNTIME_MODE` must be `disabled` or `live`. Public runtime origins
must be remote `https://` origins, not localhost, example, placeholder or
`.invalid` values. Remote service ids cannot be placeholders. Secret-store flags
must be `true` or `false`.

## Forbidden Repository Variable Content

Do not put database URLs, Tool Bridge token values, model keys, private keys or provider API tokens in repository variables.

The gate rejects secret-like variable names and values, including database URLs,
bearer tokens, `sk-...` model keys, Tool Bridge token assignments and provider
API key assignments. Those values belong only in the deployment provider secret
store or local ignored operator files.

## Live Runtime Rule

When `VITE_PUBLIC_RUNTIME_MODE=live`, P109 requires the public API origin, public
Agent Runtime origin, remote service ids and both remote secret-store flags. The
flags must be `true` because live mode is only valid after the backend and Agent
services have their provider-side secrets configured.

## Acceptance

- `package.json` exposes `check:github-runtime-variable-boundary`.
- Root `npm run test` includes `check:github-runtime-variable-boundary`.
- P16, P20 and P76 document the repository-variable boundary.
- Pages workflow passes only public origins and non-secret attestation variables.
- Generated artifacts do not contain secret-like values.
