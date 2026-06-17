# Creator Studio Frontend

This Vite + React app is the current product frontend for 平行宇宙小说. It owns the reader-facing gateway, Creator Studio conversation flow, and transitional reader pages.

## Runtime Modes

Local development:

```bash
npm run dev:api
npm run dev:agents
npm run dev:creator
```

The Creator Studio can use the local Agent Runtime at `http://127.0.0.1:4111`.

Public static preview:

```bash
VITE_ROUTER_MODE=hash \
VITE_PUBLIC_RUNTIME_MODE=disabled \
VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false \
npm --prefix app run build
```

The public page may show the creation entry, but it must not generate local fake drafts without a remote Runtime.

Public live preview:

```bash
VITE_ROUTER_MODE=hash \
VITE_PUBLIC_RUNTIME_MODE=live \
VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false \
VITE_AGENT_RUNTIME_BASE_URL=https://agent.example.com \
VITE_API_ORIGIN=https://api.example.com \
npm --prefix app run build
```

The remote services must be checked by `npm run check:public-runtime-preview` before changing the public build mode to live.

## QA

```bash
npm --prefix app run lint
npm run qa:creator-browser
npm run qa:pages-browser
```
