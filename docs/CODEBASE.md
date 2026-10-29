# Codebase map

FOMO Simulator is a React 18 + TypeScript browser application built with Vite 5.
It has no router, application server, remote database, or authentication. Plain
CSS lives in `src/index.css`; English/Chinese dictionaries live in `src/i18n.ts`.

## Entry points and ownership

| Path | Responsibility |
| --- | --- |
| `index.html` → `src/main.tsx` | Mount `App` under React Strict Mode |
| `src/App.tsx` | Render the run, language controls, pending status, and ending; accepts injected `GameServices` |
| `src/useGame.ts` | Load/save a run, accept choices, restart, and coordinate cancellable async work |
| `src/engine/types.ts` | Player/world stats, events, actions, history, and ending contracts |
| `src/engine/state.ts` | Initial stats at 50, turn 1, optional explicit seed |
| `src/engine/events.ts` | Ten static events with safe/risky/absurd choices |
| `src/engine/generator.ts`, `rng.ts` | Synchronous seeded event selection based on seed and history; excludes the previous event |
| `src/engine/resolver.ts`, `utils.ts` | Immutable stat updates, 0–100 clamping, history, and completion |
| `src/engine/endings.ts` | Synchronous stat-based ending with explicit precedence |
| `src/services/config.ts` | Validate configured turn count and select optional AI configuration |
| `src/services/game.ts` | Async event/ending interface, optional AI calls, static fallbacks, injectable fetch |
| `src/services/ai.ts` | Anthropic Messages HTTP, prompts, normalization, 30-second timeout, cancellation |
| `src/prompts/narrator.ts` | Detailed opening narrator system prompt |
| `src/services/storage.ts` | Validate and persist schema-version-1 saves in localStorage |
| `src/ui/` | Event choices, development stats, and newest-first history |

The engine has no React, environment, storage, or network dependencies. The
`GameServices` interface supplies `aiEnabled`, `maxTurns`, `generateTurn`, and
`generateEnding`; both async methods receive an `AbortSignal`. The production
adapter is created once from Vite configuration. Tests can inject controlled
promises or fake HTTP without changing engine behavior.

## A choice through the application

1. `useGame` loads a valid save. A fresh offline run shows the first static event;
   a fresh AI run starts with a null displayed event and requests its opening.
2. `EventCard` forwards the selected event/action to `useGame.selectAction`.
3. The updater rejects stale, duplicate, or completed-run submissions, then calls
   `resolveAction` with the configured turn limit.
4. The resolver applies deltas, records the selected and missed paths, and advances
   the turn. It marks completion when the resolved turn reaches the limit.
5. For an unfinished run, the displayed event becomes null. The save effect stores
   this pending state, and the generation effect asks `GameServices` for an event.
6. The adapter requests AI content if configured, otherwise chooses static content.
   HTTP/network/parsing failures and timeouts fall back to the static engine.
7. The result is applied only while the effect is active and the run's state still
   matches the requested state. Cleanup aborts on restart, state replacement, or
   unmount. A microtask deferral avoids issuing the discarded Strict Mode setup's
   request. Locale changes do not restart requests.
8. Completed runs request an ending instead. A saved completed ending is reused.

Restart replaces the run and retains language. Refresh during generation restores
the resolved stats/history and null event, then requests the pending event again.
An AI event regenerated after refresh may differ, but the action is not replayed.

## Rules and compatibility assumptions

- Player stats: money, AI skill, network, energy, curiosity, chaos. World stats:
  AI hype and economy. All stay within 0–100; turn is a separate counter.
- Default length is five actions. `VITE_TURNS` accepts a positive safe integer.
  Completion advances the counter, so five actions finish with `turn === 6`.
- Static ending precedence is: curiosity ≥70 and chaos ≥70; otherwise chaos ≥75;
  otherwise network ≥75; otherwise AI skill ≥75 and chaos <60; otherwise generalist.
- Static IDs connect game content, translations, and history reconstruction.
  AI action IDs contain timestamps; AI event IDs contain the turn number.
- The save stores game state, nullable displayed event, locale, and nullable ending
  under `fomo-simulator-save`. Numeric stats, history structure, actions, locale,
  and version are validated. Invalid data is removed; there are no migrations.
- Current AI responses use `choices` with numeric deltas. A legacy `events` format
  with English `stat_hints` is also accepted. Both require three distinct action
  types. Numeric deltas must be finite and are rounded/clamped to −100…100.
- The detailed opening prompt describes a 20-turn arc independent of the actual
  turn limit. Subsequent event requests use a generic prompt and the last three
  history entries; ending requests include the full choice history.
- AI text is English. Static localization falls back to supplied text for unknown
  IDs. History reconstructs static actions; AI action types currently fall back
  to `safe` because history does not store an action type.
- Stats, action-type colors/badges, and debug turn status are development-only.
  Pending generation and ending status are visible in production too.

## Integrations and deployment

The implementation uses `fetch`, not the declared `@anthropic-ai/sdk` package.
Requests send the configured model, an API key header, Anthropic API version,
and the direct-browser-access header to `/v1/messages`. The development proxy
in `vite.config.ts` rewrites `/api/anthropic` to `https://api.anthropic.com`.
The proxy forwards a browser-provided credential; it does not hold a server secret.

Production hosting, server-held credentials, request rate limiting, retries,
analytics, and remote saves are not implemented. See README for environment
variables and the legacy encoded-target proxy convention. `.env*` files are
ignored except `.env.example`; never place real keys in tracked files.

## Verification

`npm run check` runs application/config/test type checking, ESLint including React
Hooks rules, Vitest, and a production build. The GitHub Actions workflow runs it
on Node 24 after `npm ci`. Compiler configuration uses bundler module resolution;
type checking does not emit Vite configuration JavaScript.

Tests are colocated with their subjects:

- `src/engine/engine.test.ts`: exact stat effects, bounds, configured completion,
  ending precedence, configuration validation, deterministic replay.
- `src/services/storage.test.ts`: ready/pending saves, invalid versions and nested
  data, malformed JSON, disabled browser storage.
- `src/services/ai.test.ts`: request payload, parsing, HTTP/network failures,
  offline mode, malformed endings, cancellation, and timeout fallback.
- `src/useGame.test.tsx`: Strict Mode, restart during event/ending requests,
  duplicate submissions, pending-turn refresh, saved ending reuse, unmount.
- `src/App.test.tsx`: rendered offline play, ending/restart, language preservation,
  and pending-state interaction.

`src/test/setup.ts` clears storage and stubs network access to fail by default.
Tests use jsdom rather than a real browser. They do not verify actual Anthropic
availability, model quality, deployed proxy behavior, browser rendering, or
cross-tab save coordination. Smoke-test dev and production preview for UI work.
