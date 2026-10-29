# Codebase map

React 18 + TypeScript + Vite 8 render a browser game. A Node 24 HTTP server serves
the production build and owns Claude integration. Saves remain in localStorage;
there is no database. The same image serves frontend and API to avoid cross-origin
credential handling. Plain CSS and English/Chinese dictionaries remain in `src/`.

## Ownership

| Path | Responsibility |
| --- | --- |
| `index.html` → `src/main.tsx` → `src/App.tsx` | React Strict Mode, UI, controls, endings |
| `src/useGame.ts` | Save/load, accept choices, cancel stale generation, restart |
| `src/engine/` | Types, initial state, ten static events, seeded RNG, immutable resolution, endings, bounded API validators |
| `src/services/config.ts` | Browser flags and turn count |
| `src/services/ai.ts` | Credential-free, same-origin `/api/game/*` POST requests, cancellation and timeout |
| `src/services/game.ts` | Validate API output and fall back to static generation |
| `src/services/storage.ts` | Validate and persist version-1 saves |
| `src/ui/`, `src/i18n.ts`, `src/index.css` | Rendering, localization, styling |
| `server/index.ts` | Configuration, listen on `PORT`, graceful shutdown |
| `server/app.ts` | HTTP routes, authentication, origin/body/state validation, limits, static allowlist, security headers |
| `server/config.ts` | Validate server-only environment, require production access controls |
| `server/federation.ts` | Google metadata JWT → Anthropic SDK token provider; shared with smoke test |
| `server/generation.ts` | Server model/token budgets, SDK Messages calls, validate normalized output |
| `server/prompts.ts`, `server/narrator.ts` | Prompt construction and legacy/current AI response normalization |
| `integration/` | Standalone live smoke-test class/runner and offline SDK transport tests |
| `Dockerfile`, `deploy/cloudrun.yaml` | Non-root production image and private-by-default Cloud Run configuration |

Node 24 natively strips erasable TypeScript. Server/engine runtime imports use
explicit `.ts` extensions, allowing one engine implementation in both runtimes
without a second compilation pipeline or another server framework. Server code
is never imported into the frontend. Build verification rejects server-only
integration markers in the browser artifact.

## End-to-end choice

1. `useGame` restores a save or creates a run. Static browser mode shows the first
   starter event; API mode requests an opening event.
2. `EventCard` forwards a choice. The updater rejects duplicate/stale selections,
   applies clamped deltas, appends history, and increments the turn.
3. An unfinished run sets its event to null. Persistence records this pending
   state and generation begins. Refresh resumes the pending event, not the action.
4. The frontend posts only `{ state }` to `/api/game/event` or `/api/game/ending`.
5. The server checks access, method, content type, origin, body size, bounded state,
   phase, and quota. It never forwards arbitrary client prompts/options upstream.
6. With server AI off, static generation is returned. With AI on, the shared SDK
   client obtains metadata identity, federates to the configured Claude account,
   and calls Messages with server-owned prompts/model/token limits.
7. Server parsing enforces three distinct action types, finite rounded/clamped
   deltas, and bounded strings. Invalid output/failures become generic 502s. The
   frontend also validates output and uses static content on failure.
8. Effect cleanup aborts work and identity checks discard old results after restart
   or unmount. Completed endings are persisted and reused on reload.

## Security and operational tradeoffs

- Production starts only with an HTTPS `APP_ORIGIN`, username, and >=16-character
  password. Shared HTTP Basic credentials suit private play; no per-user accounts
  or login-session store is implemented. Cloud Run IAM provides an additional
  private deployment boundary. See deployment instructions for both layers.
- HTTPS is terminated by Cloud Run; the server requires its forwarded HTTPS
  indication in production. Local development binds loopback and can omit login.
- Only health, entry HTML, and allowlisted built asset paths are served; resolved
  files must remain inside `dist`, including after symlink resolution.
- Global process limits avoid trusting client-supplied forwarded IPs. They bound
  ingress, concurrent generation, minimum intervals, and attempted calls/day.
  Restarts reset them; a multi-instance/public product needs durable/shared quotas.
  Set provider-side spending limits for an actual account-wide cost boundary.
- Input is limited to 32 KiB, 100 history entries, bounded strings, and 0–100
  stats. Client state is not an authoritative competitive game record. Prompt
  history is untrusted narrative data; Claude has no tools or secret prompt data.
- Metadata/SDK fetches use fixed destinations, reject redirects, and have 30-second
  limits. HTTP generation wait is bounded separately (35 seconds by default),
  even when an injected service ignores cancellation. A credential exchange
  already running inside the SDK can continue until its transport timeout.
- No provider error bodies, credentials, or history are logged or returned.
  Browser requests have no provider key or upstream model/URL configuration.

## Existing game invariants

Stats start at 50 and are clamped to 0–100. The default five actions finish at
turn counter 6. Static ending precedence is curiosity/chaos, chaos, network,
AI skill with low chaos, then generalist. Static IDs link content, translations,
and saved history. Schema version remains 1; there are no migrations.

The detailed narrator is used for the opening and describes a 20-turn arc;
subsequent turns use a shorter prompt and three recent history entries. Endings
use full bounded choice history. Current `choices` numeric deltas and legacy
`events` English stat hints remain accepted. AI text stays English. AI history
types still default to safe because stored history lacks action types. Stats,
action badges/colors, and debug status remain development-only.

## Verification

`npm run check` type-checks all code, lints, runs offline tests, builds React, and
checks client artifacts. `npm run audit` includes development dependencies. CI
also builds the image. Tests include engine replay/bounds, storage, React lifecycle,
same-origin client fallbacks, server HTTP access/limits/validation, generation
parsing, and HTTP → real SDK → mocked Google/Claude requests. Unexpected global
fetches fail; Node HTTP tests use ephemeral local ports and fake upstreams.

`npm run test:integration:claude` alone performs a live billable federation check.
It requires an actual Google workload identity and is never part of CI. Automated
tests do not establish live federation, model availability, deployed IAM policy,
or browser visual behavior. See README and deployment docs for operator checks.
