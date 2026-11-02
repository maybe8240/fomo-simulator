# Codebase map

React 18 + TypeScript + Vite 8 render a browser game. A Node 24 HTTP server serves
the production build and owns Claude integration. Saves remain in localStorage;
there is no database. The same image serves frontend and API to avoid cross-origin
credential handling. Plain CSS and English/Chinese dictionaries remain in `src/`.

## Ownership

`package.json` overrides minimatch to 11.0.1 to address GHSA-g3hv-75wg-m249
throughout the development lint dependency tree. This crosses upstream major
ranges: the current ESLint CommonJS CLI uses the retained `Minimatch` API and
typescript-eslint uses the retained named `minimatch` API. `npm run lint` verifies
the repository's actual configuration. Reassess the override when upstream ranges
include a patched version; it does not imply compatibility with every upstream
entry point (older config-array ESM imports expect a default export).

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
| `server/claude.ts` | Server-only API key validation and Anthropic SDK client; shared with smoke test |
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

`EventCard` shuffles choice positions once when mounted for a run/turn/event.
Renders and language changes keep those positions while using the current event's
action objects. This display-only order does not mutate events or saved state;
reloading can reshuffle the choices.

1. `useGame` restores a save or creates a run. Static browser mode shows the first
   starter event; API mode requests an opening event.
2. `EventCard` forwards a choice. The updater rejects duplicate/stale selections,
   applies clamped deltas, appends history, and increments the turn.
3. An unfinished run sets its event to null. Persistence records this pending
   state and generation begins. Refresh resumes the pending event, not the action.
4. The frontend posts `{ state, locale }` to `/api/game/event` or `/api/game/ending`.
5. The server checks access, method, content type, origin, body size, bounded state,
   phase, and quota. It never forwards arbitrary client prompts/options upstream.
6. With server AI off, static generation is returned. With AI on, the shared SDK
   client authenticates using the server API key and calls Messages with
   server-owned prompts/model/token limits.
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
- SDK fetches use a fixed HTTPS destination, reject redirects, and have 30-second
  limits. HTTP generation wait is bounded separately (35 seconds by default),
  even when an injected service ignores cancellation. The API key is validated
  at startup when AI is enabled; static mode requires no provider credentials.
- No provider error bodies, credentials, or history are logged or returned.
  Browser requests have no provider key or upstream model/URL configuration.

## Existing game invariants

Stats start at 50 and are clamped to 0–100. The default five actions finish at
turn counter 6. Static ending precedence is curiosity/chaos, chaos, network,
AI skill with low chaos, then generalist. Static IDs link content, translations,
and saved history. Schema version remains 1; optional continuity fields extend it compatibly.

Opening and later events share a stable policy for grounded absurdity, meaningful
tradeoffs, and consequences. Both event and ending prompts receive the full
bounded history, including stored scene/selected-action excerpts, as JSON story
data. Run-relative instructions pace the final compromise using saved maxTurns.
Current `choices` numeric deltas and legacy `events` English stat hints remain
accepted. AI prose is generated directly in the selected language. Actual selected action types are saved; unknown
legacy AI types are left unclassified. Stats and debug status remain development-only. Choice buttons show only titles,
with no category badges or colored backgrounds.

## Verification

`npm run check` type-checks all code, lints, runs offline tests, builds React, and
checks client artifacts. `npm run audit` includes development dependencies. CI
also builds the image. Tests include engine replay/bounds, storage, React lifecycle,
same-origin client fallbacks, server HTTP access/limits/validation, generation
parsing, and HTTP → real SDK → mocked Claude requests. Unexpected global
fetches fail; Node HTTP tests use ephemeral local ports and fake upstreams.

`npm run test:integration:claude` alone performs a live billable API key check.
It requires a server-side `ANTHROPIC_API_KEY` and is never part of CI. Automated
tests do not establish live API key validity, model availability, deployed IAM
policy, or browser visual behavior. See README and deployment docs for operator checks.

## Streaming and prompt caching

The browser requests newline-delimited JSON from the existing game endpoints.
Narrative text appears progressively for events and endings; choices appear only
after the complete response passes validation. Previews are temporary, plain text
and never saved. Restart/unmount cancels the stream and discards stale previews.
A failed, interrupted, or invalid stream falls back to static content. Clients
without the streaming Accept header still receive the original JSON response.
Ending validation failures are an exception: `server/generation.ts` makes at most
two repair calls with the original system/run context and the preceding raw
response as an assistant message, followed by localized repair instructions. It
does not log that response. Repair calls retain the original visible preview
until a validated result arrives, share the HTTP deadline/abort signal, and can
add provider charges (including the existing transport-level retry behavior).
They count as one logical application generation request, not three quota units.
On exhausted repairs or stream failure, `services/game.ts` keeps received ending
prose as a bounded, display-only `ai_generated` ending with a localized generic
title; ordinary version-1 save, language-cache, and export behavior applies.
Static ending fallback remains when no usable narrative arrived. Partial event
choices are never promoted to playable content. No save schema changes are needed.
After streaming headers are sent, failures use a generic error frame instead of
an HTTP 502. Existing access checks, quotas, and generation deadlines still apply.

Stable system prompt blocks carry Anthropic ephemeral cache directives (default
five-minute TTL); player stats and history follow outside the cache breakpoint.
Opening and later turns share a stable event policy; endings share its voice
and continuity rules with their own output instruction.
Cache hits require an identical prefix and the model-specific minimum token count.
Haiku 4.5 requires 4,096 tokens: the current short system prompts are below that
threshold, so this model will process them normally without cache hits. We do not
pad prompts or change models to force caching. Other eligible models/prompts can
reuse the prefix; cache writes cost extra and hits reduce input processing only.
See [Anthropic prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching).
Offline tests verify cache directives and streaming behavior; live cache-hit usage
and latency have not been measured.

The ending panel appears as soon as the run completes, including while ending
generation is pending or streaming. It keeps the same heading and styling
throughout; Share Run and the panel's Restart Run button appear together once
the ending is ready.

Completed-run sharing is owned by `src/ui/ShareRun.tsx` and
`src/services/share.ts`. A canvas-rendered PNG recap is prepared after the ending
arrives and downloaded directly when the player clicks Share Run.
The image includes localized ending/history and all final player/world stats,
independently of viewport size and development-only panels. The download uses a local blob URL and does not call the Web Share API. No server
endpoint, new dependency, or save-schema change is required.

## Continuity and save compatibility

Version-1 saves now optionally store `gameState.maxTurns` (1-100), and history
fields `actionType`, `eventDescription` (first 1,600 characters), and `actionFlavor`
(first 400 characters). Full playable events and downloaded history remain intact;
excerpts are bounded context, not an AI-generated summary. New scenes can preserve
previous consequences when their choices are selected. Event and ending prompts
receive all recorded history rather than just the last three titles. Missing old
scene details cannot be recovered; prompts treat them as unknown. The 32 KiB HTTP
body limit remains in effect, so unusually long runs/content can still fall back
to static generation instead of sending an oversized request.

Existing version-1 saves remain readable. Missing action types are recovered from
the static event catalog when possible; unknown AI choices omit the classification.
On loading an old unfinished run, its length is set to the greater of the current
configuration and its current turn (within the 100-turn API bound). An old completed
run uses its actual choice count. New runs persist the configured length, which
subsequent configuration changes do not alter. Optional fields are validated at
both save and HTTP boundaries. Legacy runs beyond the API bound remain readable
for offline play. No separate outcome screen or additional AI call was introduced:
consequences lead the next narrative, and the final action resolves in the ending.

Generation output budgets are 2,048 tokens per event and 1,024 for endings.
For `claude-haiku-5-5` (including pinned versions), thinking is explicitly disabled
so its default adaptive reasoning cannot consume the budget needed for game JSON.
Responses stopped by `max_tokens` are rejected as `output_limit`. Server failure
logs contain only a fixed reason category and, where available, an HTTP status;
provider messages, response bodies, prompts, and credentials remain suppressed.

## Generation language

The game endpoints accept an optional `locale` limited to `en`/`zh` (English by
default for older callers). `server/chinese.ts` supplies native Chinese voice,
consequence, choice and ending instructions; the per-turn user prompts are also
Chinese. JSON keys and action type enums remain English. There is no translation
request. Each language has its own stable cache prefix. Language changes abort
pending generation and replace unplayed AI scenes or AI endings without applying
action effects again. Chosen history is preserved, including its original prose.
Completed old-language scenes are hidden while viewing another language.

Optional `generatedLocale` on saved AI events/endings remains compatible with
version-1 saves and is validated. Legacy unplayed AI content without a known
language is regenerated in the saved interface language when AI is enabled.
Static content continues to use built-in localization.

`server/network.ts` extracts only allowlisted network codes (including nested and
aggregate causes); raw transport messages are never logged. The Claude transport
retries transient connection failures once before any response is returned, with
the original shared timeout and caller cancellation. SDK retries remain disabled.
Response-body failures, HTTP statuses, certificate errors and permanent DNS errors
are not retried. A response lost after acceptance may already have incurred a
provider charge; the bounded retry can incur another. Application quotas count
logical generation requests, not individual transport attempts.

AI pacing targets: event descriptions use two tense sentences (35-60 English
words or about 60-100 Chinese characters), keeping the prior consequence and a
concrete dilemma. Endings expand to 5-7 sentences (120-180 English words or about
220-350 Chinese characters) with callbacks, daily-life details and specific costs.
These are prompt targets rather than text truncation rules; the ending output
budget is 1,024 tokens. Static fallback prose is unchanged.

Endings explicitly use the post-final-choice player/world status as well as
choice history. Prompts in both languages ask for at least two salient status
aspects in concrete daily-life details, reflecting strengths and constraints
when supported, without listing scores or inventing extremes from average stats.

## Status-limit completion

After each action, the game clamps and checks all six player stats plus world
AI hype and economy. Any value at 0 or 100 completes the run immediately, even
when planned choices remain; the turn counter itself is excluded. The triggering
action is recorded and the counter increments once before ending generation.
Simultaneous limits are all supplied to the ending prompt as the central cause,
in both English and Chinese. Static fallback endings identify each limiting stat
and value, including in exported images. High values are not automatically wins.

Version-1 saves remain readable. Early completion is valid before maxTurns only
when a stat is at a boundary. Old unfinished saves already at a boundary after a
recorded choice now resume at the ending, retaining that choice and clearing any
old ending. Existing completed saves keep their saved ending. No extra choice is
applied on refresh. Ordinary runs still finish at their configured turn limit.

History entries optionally store `missedActions` (up to two validated type/label
pairs). This lets AI unchosen-option sentences follow the interface language
in both the history log and PNG recap. Legacy version-1 English wrappers are
recognized and rebuilt locally in the selected language; generated labels are
preserved, with no AI translation call. Selected-action and turn wrappers also
continue to use the current interface language.

Current-turn `turnVariants` and completed `endingVariants` optionally persist up
to one validated en/zh result each in version-1 saves. First visits to an uncached
language generate natively; subsequent toggles restore the exact version, including
choice IDs/effects, without another request. Incomplete generation is cancelled
and stale results ignored. Advancing clears event variants for the next turn;
restart clears all variants. Old saves seed the cache from a language-tagged
displayed result. Cache fields never enter backend generation requests.

History display and PNG recaps now show the turn/event title, event description,
and a second-person choice sentence (You chose to …. / 你选择了…。). Unchosen-option
sections are hidden; old missed-path data remains readable for save compatibility.
New history stores the full validated description (up to 6,000 characters), while
server prompts still use at most the first 1,600 characters per scene. Static
legacy entries recover descriptions from the catalog. Legacy AI entries without
a saved description show a localized unavailable message; missing prose is not
reconstructed or invented.

Timeout reporting: backend warnings distinguish `generation_timeout`,
`provider_timeout`, and ordinary cancellation. Timeout warnings include only
elapsed milliseconds, event/ending kind, and existing allowlisted diagnostics.
A safe `GENERATION_TIMEOUT` code is sent in JSON errors or streaming error frames.
The browser also classifies its own 40-second deadline and gateway HTTP 504 as
timeouts. A localized on-page status explains that built-in content is being used.
The notice is transient, clears with the next state/language/restart, and is not
saved. Cancellation during navigation, language switching or restart does not
produce a timeout notice. Provider messages and response bodies remain private.
