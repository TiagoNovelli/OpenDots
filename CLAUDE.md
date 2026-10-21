# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is a fork of [CopilotKit/OpenDots](https://github.com/CopilotKit/OpenDots) (remote `upstream`, push disabled; `origin` is the fork). The maintainer is Brazilian: talk to them in Portuguese (pt-BR). Code, comments, commit messages and English docs stay in English.

## Commands

Node.js 24+ is required (`engines`). Install with `npm ci`.

```sh
npm run dev           # API on 127.0.0.1:4310 (tsx --watch) + Vite on 127.0.0.1:5173, proxying /api
npm run check-format  # Prettier
npm run lint          # ESLint on src, tests, vite.config.ts
npm run typecheck     # tsc --noEmit
npm test              # Vitest, all tests
npx vitest run tests/model-provider.test.ts   # one file
npx vitest run -t 'rejects an unknown provider' # one test by name
npm run build         # Vite client to dist/client + server tsc to dist/server
```

CI (`.github/workflows/ci.yml`) runs check-format, lint, typecheck, test and build. Run all five before committing. `npm run format` writes Prettier fixes (README.pt-BR.md, TODO.md and this file are outside its globs; format them explicitly).

The server reads `.env` through `--env-file-if-exists`, which does not override variables already set in the environment. A tool that injects `PORT` (some preview runners do) makes the API bind Vite's port; unset `PORT` before `npm run dev`.

`package.json` `allowScripts` lists dependency install scripts that npm may run (esbuild needs its own). `@scarf/scarf` is deliberately left unapproved.

## Deployment

Pushing to `main` deploys to production: CI runs, then `.github/workflows/deploy.yml` (on CI success for pushes to this repo's `main`, or manual dispatch) SSHes to the VPS with a key that `authorized_keys` pins to `/usr/local/bin/opendots-deploy` (reference copy: `deployment/vps/opendots-deploy.sh`), which pulls, rebuilds the `app` container and waits for `/api/state` to answer 401. Commit locally and ask before pushing.

Production runs `compose.yml` plus a server-only `compose.override.yml` with Traefik labels. Outside localhost the server refuses to start without an `OWNER_TOKEN` of 24+ characters; every `/api/*` route requires it as a bearer token.

## Architecture

**Two processes in one repo.** `src/server` is a Hono app (`index.ts` wires everything; `app.ts` owns auth, CORS/origin checks and the REST routes) that also serves `dist/client` in production. `src/client` is a React SPA. `src/shared` holds types and schemas used by both. `src/browser` is the optional isolated read-only page reader (`WEB_SEARCH_PROVIDER=browser`).

**Conversations live in CopilotKit Intelligence, not in SQLite.** `platform.ts` builds a `CopilotRuntime` with Intelligence and one `DotAgent` per Dot, mounted at `/api/copilotkit`. `runtime-scope.ts` is an allowlist in front of that handler: it matches whole paths, checks methods and verifies every agent and thread ID against the workspace; anything else returns 403 by design (including the SDK's inspector routes). SQLite (`node:sqlite`, one file at `DATABASE_PATH`, opened separately by `Store`, `WorkspaceStore` and `PushService`) holds settings, tasks, memories, Spaces, pages, Dots, thread bindings, MCP connections, computer state and push keys. Copying the SQLite file does not back up conversation history.

**A Dot turn.** `dot-agent.ts` assembles the system prompt, tools (pages, MCP connections, Composio, computer, research, learned skills) and runs the model through TanStack AI's `openaiCompatibleText`. Every provider is reached through an OpenAI-compatible Chat Completions endpoint: `model-provider.ts` turns `MODEL_PROVIDER` presets (or legacy `OPENAI_*` variables, recognizing a preset from the base URL) into base URL, key, model and per-provider quirks. All model HTTP goes through `modelFetch` (`model-limits.ts`), which applies quirks (Groq rejects strict tool schemas with an empty `required`; see `compatible-fetch.ts`), records the provider's `x-ratelimit-*` headers for `/api/state`, and rewrites a 429 into a fixed message that the client recognizes and translates (`client/model-limit.ts`).

**Background work.** `runner.ts` claims due tasks from `Store` with leases; scheduled tasks run as headless turns in their original conversation (`headless.ts` talks to the runtime over HTTP like a browser would). Interrupted runs wait for an explicit retry. `Runner`'s `onSettled` and `ConnectionService.onApprovalRequested` feed `push.ts`, which sends Web Push notifications (VAPID keys generated once and stored in SQLite; text composed server-side in the language each device subscribed with).

**Approvals.** MCP tools that are not read-only never execute inside the agent: `connection-tools.ts` stores the exact call and returns `approval_required`; only the owner's approval route runs it. Page drafts use a CopilotKit human-in-the-loop card (`PageReviewCard`) instead.

**Client.** `App.tsx` holds navigation and polls `/api/state` and `/api/workspace`. Keep the `headers` object passed to `CopilotKitProvider` referentially stable: the provider reconnects the runtime whenever it changes. `public/sw.js` is the service worker for install and push; it intentionally caches nothing.

## Conventions

- **UI text goes through `t()`** (`src/client/i18n.ts`), keyed by the English text, with Portuguese in `src/client/locales/pt-BR.ts`. `tests/i18n.test.ts` scans the client for literal `t('...')` keys and fails on a missing translation or mismatched `{placeholder}`. Strings passed to `t()` through a variable (status maps, tool labels) are not caught by that test; add them to `pt-BR.ts` by hand. Server error messages shown in the UI pass through `t(message)`, so translate the stable ones too. Text sent to the model (system prompt, tool results, approval responses) stays in English.
- Outside a browser `t()` always returns English, so tests and server output never depend on the machine's language. Tests run in Node without a DOM; components render with `react-test-renderer`.
- Never log secrets, endpoints, conversation content or tool payloads; existing error paths log a status only.
- Keep `README.md` close to upstream (it only links to `README.pt-BR.md`) so upstream merges stay clean; fork-specific docs go in `README.pt-BR.md`, `docs/SETUP.md` sections and `TODO.md` (planned work, in Portuguese).
- Commits follow `feat:`/`fix:`/`docs:`/`ci:`/`chore:` with an explanatory body.
