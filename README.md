# FOMO Simulator

A narrative life game set in the AI era: choose safe, risky, or absurd paths,
change player/world stats, and receive an ending. React + TypeScript + Vite 8
provide the UI; a Node 24 server serves the build and generates content through
Claude using a server-side Anthropic API key. Static English/Chinese content
works without credentials. AI content is generated directly in the selected language.

## Local startup

See [AI gameplay workflow](docs/AI_GAMEPLAY_WORKFLOW.md) for the player journey
from opening event through choices, ending, and downloading a recap.

Use Node 24.x and npm 11.x (`.nvmrc` selects Node 24):

```sh
npm ci
npm run dev
```

Open Vite's localhost URL. Static browser play needs no environment file. To
exercise the application API, open another terminal and run:

```sh
npm run dev:server
```

The backend listens on `127.0.0.1:3001`. Vite forwards `/api/game/*` to it. To
exercise that transport, copy `.env.example` to `.env`, set `VITE_AI_ENABLED=true`,
and restart Vite. The backend defaults to static generation until `AI_ENABLED`
is enabled on the server. For local AI, copy `.env.server.example` to
`.env.server`, set `AI_ENABLED=true` and `ANTHROPIC_API_KEY`, then restart the
backend. Keep the key in `.env.server`, never in the browser `.env` file.

Stop dev servers before reinstalling dependencies if Windows reports locked
native files. Use `npm.cmd` if PowerShell execution policy blocks `npm.ps1`.

## Configuration

Browser `.env` configuration (restart/rebuild Vite after changing it):

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_AI_ENABLED` | `false` | Request content from the application API; fall back to static content on failure |
| `VITE_TURNS` | `5` | Integer game length from 1 to 100; invalid values use 5; saved runs retain their length |

There is no browser API key, provider URL, or model setting. Remove old
`VITE_CLAUDE_*` settings. Rotate any old API key previously exposed in a build.

Server settings can be supplied by the environment or by copying
`.env.server.example` to `.env.server`. `npm start` and `dev:server` load that file;
the container reads its runtime environment directly. Never commit actual values.

| Variable | Default / requirement |
| --- | --- |
| `NODE_ENV` | `production` in the container; development otherwise |
| `PORT` | `3001`; container uses `8080` |
| `AI_ENABLED` | `false`; `true` enables Claude with an API key |
| `CLAUDE_MODEL` | `claude-haiku-4-5`; selected by the server |
| `APP_ORIGIN` | `http://localhost:5173` locally; explicit HTTPS origin required in production, with no trailing slash |
| `APP_ACCESS_USER` | Required in production; HTTP Basic username |
| `APP_ACCESS_PASSWORD` | Required in production, at least 16 characters; use Secret Manager |
| `ANTHROPIC_API_KEY` | Required when server AI is enabled; server-only secret |
| `MAX_AI_REQUESTS_PER_DAY` | `100`, per instance, UTC day |
| `MAX_AI_CONCURRENT` | `2`, per instance |
| `AI_REQUEST_INTERVAL_MS` | `3100`, minimum interval between generation starts |
| `GENERATION_TIMEOUT_MS` | `35000`, maximum HTTP generation wait |

Use the exact development origin you open in the browser: if using
`http://127.0.0.1:5173`, set `APP_ORIGIN` accordingly. To browse a local production
build at port 3001, set `APP_ORIGIN=http://127.0.0.1:3001` while keeping development
mode; a production-mode server expects HTTPS termination such as Cloud Run.

## API key and access controls

`server/claude.ts` creates the Anthropic SDK client using `ANTHROPIC_API_KEY`.
The API destination is fixed to Anthropic HTTPS; inherited bearer-token and
API-host overrides are disabled. The key stays on the server and raw SDK errors
are hidden. Use `.env.server` locally and Secret Manager in Cloud Run.

Production requires a password and HTTPS origin. HTTP Basic protects the HTML,
assets, and API; browsers provide a login prompt. Cloud Run terminates HTTPS and
sets `X-Forwarded-Proto`; do not expose the Node production port directly to the
internet. `/healthz` returns only `{ "ok": true }` without application login for
container probes. This intentionally simple shared login fits a private hobby
deployment; it is not a per-user account or revocable-session system.

API requests require POST and JSON, an allowed origin when present, no cross-site
fetch indication, a body under 32 KiB, and valid bounded game state. Clients may select en/zh output language, but cannot
select prompts, models, credentials, or upstream URLs. Unknown routes and files
outside the build are not served. Generation failures return a generic 502; the
browser falls back to static content. Origin checks complement authentication;
they do not authenticate non-browser clients.

Limits are global per process, including a 120-request/minute limit before login,
so spoofed forwarded IPs cannot bypass them. Generation quotas count attempted
calls, including failures and cancellations. In-memory counts reset after a
restart and are not shared across instances. Keep Cloud Run at one instance for
this setup and set Anthropic workspace spending limits; these counters and Google
billing alerts are not a durable spending cap. Client game stats remain editable
in this noncompetitive game, but are bounded before entering server prompts.

## Commands and tests

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite UI with same-origin API proxy |
| `npm run dev:server` | Watch the Node server |
| `npm run build` | Type-check, build React, and check the bundle for server-only markers |
| `npm start` | Serve `dist/` and the API; build first |
| `npm run preview` | Vite's UI-only production preview; use `npm start` for full application testing |
| `npm run typecheck` | Check frontend, server, integration harness, and tests |
| `npm run lint` | ESLint/TypeScript/React Hooks rules |
| `npm test` | Offline jsdom and Node tests |
| `npm run test:watch` | Watch offline tests |
| `npm run check` | Type-check, lint, test, and production build |
| `npm run audit` | Network advisory check for all dependencies; low severity or higher fails |
| `npm run test:integration:claude` | Explicit live API key smoke test |

CI runs audit and check, then builds the Docker image. Automated tests block
unexpected network access; backend HTTP tests use a local server and inject
mocked Claude transports. No credentials are needed for CI. Vite 5's
JavaScript compilation targets are explicitly retained during the Vite 8 upgrade.

The separate integration runner makes a billable request with `claude-opus-5-5`,
1024 output tokens, and `Hello from Cloud Run`. It uses the same API key client
as the backend, prints only returned text, and is never run automatically. It
loads `.env.server` if present, or reads `ANTHROPIC_API_KEY` from the environment.

## Deployment and game state

Follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the Docker/Cloud Run setup.
Do not deploy a Vite dev/preview server as the production backend.

One run is stored in browser localStorage under `fomo-simulator-save`, version 1.
Restart retains language. To reset manually, remove that key in browser devtools.
There is no database, remote save, or cross-tab synchronization. Changing from
localhost to the deployed origin starts a separate browser save.

Stats start at 50 and stay within 0–100. A five-action run finishes with turn
counter 6. Pending events save as null; refresh requests a replacement event
without applying the action again. Invalid saves are discarded without migration.
Static events replay from seed and choice history; AI content is nondeterministic.
Narrative pacing follows the saved run length. Later scenes begin with the
consequence of the previous choice; endings resolve the final choice. Static content supports English/Chinese; AI content follows the selected language.

See [docs/CODEBASE.md](docs/CODEBASE.md) and [AGENTS.md](AGENTS.md) for development.

## Streaming and prompt caching

Selecting Chinese uses native Chinese prompts for original Chinese stories,
choices, and endings; there is no English-to-Chinese translation pass. Switching
language cancels pending generation and regenerates an unplayed AI event or AI
ending without advancing the run. Previously chosen history keeps its recorded
language. Restart the frontend/backend after updating to enable this behavior.

The browser requests newline-delimited JSON from the existing game endpoints.
Narrative text appears progressively for events and endings; choices appear only
after the complete response passes validation. Previews are temporary, plain text
and never saved. Restart/unmount cancels the stream and discards stale previews.
A failed, interrupted, or invalid stream falls back to static content. Clients
without the streaming Accept header still receive the original JSON response.
After streaming headers are sent, failures use a generic error frame instead of
an HTTP 502. Existing access checks, quotas, and generation deadlines still apply.

Stable system prompt blocks carry Anthropic ephemeral cache directives (default
five-minute TTL); player stats and history follow outside the cache breakpoint.
Opening and later turns share one stable event policy; endings reuse the same
voice and continuity policy with a separate ending instruction.
Cache hits require an identical prefix and the model-specific minimum token count.
Haiku 4.5 requires 4,096 tokens: the current short system prompts are below that
threshold, so this model will process them normally without cache hits. We do not
pad prompts or change models to force caching. Other eligible models/prompts can
reuse the prefix; cache writes cost extra and hits reduce input processing only.
See [Anthropic prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching).
Offline tests verify cache directives and streaming behavior; live cache-hit usage
and latency have not been measured.

## Share a completed run

After the ending is ready, Share Run creates a PNG recap with the localized
ending, full chronological history (including missed paths), and final player
and world stats. Clicking Share Run downloads the PNG directly; no native share sheet is opened.
Image generation happens locally; no image or saved run is uploaded by the app.
Final stats appear in the exported image even in production, while the in-game
stats panel remains development-only.

If generation returns 502, inspect the backend terminal for a safe failure category
(such as `output_limit`, `provider_rejected`, or `provider_connection`). Haiku 5.5
game requests disable adaptive thinking and reserve 2,048 output tokens per event
and 512 per ending to avoid truncated JSON. Restart the backend after updates.

Connection failures now include an allowlisted `network` code in backend logs;
provider timeouts use `provider_timeout`. Transient connection errors get one
retry before response headers arrive, within the same 30-second transport
deadline. Certificate errors, permanent DNS failures, HTTP errors and interrupted
response streams are not retried. Persistent network errors still use static
fallback; the safe code helps distinguish DNS, TLS, routing and socket failures.
