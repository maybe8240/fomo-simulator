# FOMO Simulator

A browser-based narrative life game set in the AI era. Choose among safe, risky,
and absurd paths, change six player stats and two world stats, and receive an
ending. Static English/Chinese content works offline; optional Anthropic calls
generate English events and endings.

## Local development

Use **Node 24.x and npm 11.x** (`.nvmrc` selects Node 24). Install the committed
dependency versions:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. No environment file or API key is needed for static
play. Stop an existing dev server before `npm ci`, especially on Windows: a loaded
native dependency can otherwise cause an `EPERM` file-lock failure. In PowerShell,
use `npm.cmd` if execution policy blocks `npm.ps1`.

## Configuration

For local overrides, copy `.env.example` to `.env` and restart Vite after changes.
`VITE_*` values are compiled into browser code; the API key is visible to browser
users. Use this direct-key mode only with a personal development key. A shared
deployment needs a backend that holds credentials server-side; this repository
does not implement one.

| Variable | Default | Meaning |
| --- | --- | --- |
| `VITE_AI_ENABLED` | `false` | Only literal `true` enables AI; a key is also required |
| `VITE_CLAUDE_API_KEY` | empty | Personal development Anthropic key |
| `VITE_CLAUDE_BASE_URL` | `/api/anthropic` | API base URL, without `/v1/messages` |
| `VITE_CLAUDE_MODEL` | `claude-haiku-4-5` | Model identifier sent to the API |
| `VITE_TURNS` | `5` | Positive safe integer; invalid values fall back to 5 |

Vite proxies `/api/anthropic/v1/messages` to Anthropic. A static production host
must supply an equivalent API route or an appropriate base URL; bundling does
not deploy the Vite server. There is also a legacy base-URL convention: a URL
containing `proxy` receives an appended URL-encoded Anthropic target instead of
`/v1/messages`.

Requests time out after 30 seconds and fall back to static content on HTTP,
network, or parsing failure. Restart and unmount cancel pending requests and
discard stale results. There is no automatic retry or API rate limiter.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite with hot reload and the development API proxy |
| `npm run typecheck` | Check application, tests, and TypeScript configuration files |
| `npm run lint` | ESLint, TypeScript, and React Hooks rules; warnings fail |
| `npm test` | Run the offline Vitest suite once |
| `npm run test:watch` | Watch tests while editing |
| `npm run build` | Type-check and produce `dist/` |
| `npm run preview` | Serve an existing production build locally |
| `npm run check` | Type-check, lint, test, and build; also used by CI |

Tests use jsdom, injected game services, and mocked HTTP responses. Unexpected
global `fetch` calls fail; tests require no credentials and make no live AI calls.
Both the dev server and production preview should be smoke-tested for UI changes:
stats, action-type styling, and debug status are development-only.

## Saves and game rules

One run is saved in this browser origin's localStorage under
`fomo-simulator-save`, using schema version 1. Restart clears the previous run and
keeps the current language. To reset manually, remove that key in browser devtools
or run `localStorage.removeItem('fomo-simulator-save')` in the browser console.
There is no account, remote database, or save synchronization.

Stats start at 50 and stay within 0–100. Turns start at 1; resolving the final
action increments the counter too, so a five-action completed run has a counter
of 6. Pending events are saved as `displayedTurn: null`; refreshing resumes
generation for the already-resolved state without applying the action again.
Invalid or incompatible saves are discarded; there is no migration system.

Static event selection is reproducible for the same seed and choice history.
AI generation is not reproducible. AI text stays English when the interface is
Chinese. The detailed narrator prompt is used for the opening turn and currently
describes a 20-turn arc; later requests use a shorter prompt and three recent
history entries. These prompt rules do not determine the configured game length.

See [docs/CODEBASE.md](docs/CODEBASE.md) for architecture and request flow, and
[AGENTS.md](AGENTS.md) for contributor verification guidance.
