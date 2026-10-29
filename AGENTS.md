# Working in this repository

## Project overview

- Read `README.md` for setup and product purpose, and `docs/CODEBASE.md` for the
  architecture and game flow.
- Follow the existing architecture and naming conventions.

## Development workflow

- Inspect the relevant code before making changes.
- Prefer focused changes over broad refactors.
- Preserve existing interfaces unless explicitly requested to change them.
- Reuse existing dependencies where practical.
- For complex changes, propose a plan first.

## Setup and verification

- Use Node 24.x and npm 11.x. Install with `npm ci`; stop the dev server first if
  Windows reports a locked native dependency. Do not replace the locked stack
  with a newer Vite major as part of unrelated work.
- Start locally with `npm run dev`. No `.env` or credentials are required.
- To exercise the local API, also run `npm run dev:server` in a second terminal.
  The Node server defaults to static generation; local AI needs a Google workload.
- Run `npm run check` before handing off code changes. During development use
  `npm test -- <test-file>` and `npm run typecheck` for focused feedback.
- For dependency changes, also run `npm run audit` and report its result. It
  requires network access and checks development dependencies too; CI runs it
  separately from the offline tests.
- Run relevant tests after editing, plus lint, type checks, and the build where
  available. Add regression tests for bug fixes.
- Report the commands executed and their results. Never claim success for checks
  that were not run; explicitly identify any checks that were skipped.
- Tests must stay offline. Inject `GameServices` or a mocked fetch function; never
  make real Anthropic requests or add credentials to tests or source control.
- For UI changes, check dev and production preview behavior. Stats and action
  type badges intentionally appear only in development.

## Safety

- Do not expose secrets or credentials in code, documentation, logs, or responses.
- Do not modify production infrastructure or data.
- Do not commit, push, or deploy without approval.
- Ask before destructive or irreversible operations.

## Boundaries and invariants

- `src/engine/` owns synchronous domain rules. Keep it independent of React,
  browser storage, HTTP, and `import.meta.env`.
- `src/services/config.ts` reads browser flags. `services/game.ts` provides static
  fallback and accepts an injected transport; `services/ai.ts` only calls the
  same-origin `/api/game/*` endpoints. Never add provider credentials to `VITE_*`.
- `server/` owns federation, prompts, model configuration, response validation,
  HTTP access controls, and request limits. Keep server imports out of `src/`.
  Shared engine imports use explicit `.ts` extensions for Node 24's native runner.
- `src/useGame.ts` coordinates a run. A null displayed event means generation is
  pending and must survive reload. Never persist an advanced state with its old
  playable event. Ignore stale responses after restart or unmount.
- `src/App.tsx` and `src/ui/` render state and forward actions.
- Update English and Chinese entries in `src/i18n.ts` when changing static text.
  Static event/action IDs also connect localization and saved history; preserve
  them unless intentionally changing compatibility.
- Stats are clamped to 0–100. The final action increments the turn counter before
  completion. Default length is five actions, not the narrator's 20-turn arc.
- Saves use version 1 under `fomo-simulator-save`. Validate untrusted saved data.
  Document any schema/version changes and decide how old saves should behave.

## Keep changes reviewable

- Prefer focused changes in the existing modules. Add regression tests for game
  rules, external-data handling, or async lifecycle changes.
- Keep `package-lock.json` in sync with dependency changes and use `npm ci` in CI.
- Update README configuration/commands and `docs/CODEBASE.md` when behavior or
  module boundaries change. Do not edit generated `dist/` or dependency files.
- Explain important architectural tradeoffs in the relevant documentation and
  handoff when introducing or changing them.
