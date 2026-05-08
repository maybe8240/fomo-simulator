# FOMO Simulator - Codebase Documentation

## Project Overview

A narrative life simulation game set in 2026 during the AI era. Players make choices across 20 turns, each choice affecting stats (money, AI skill, network, energy, curiosity, chaos) and world state (AI hype, economy). The game emphasizes exploration over optimization—no wrong choices, just different life paths.

## Directory Structure

```
src/
├── engine/           # Core game logic
│   ├── types.ts      # All TypeScript interfaces/types
│   ├── state.ts     # Initial state factory
│   ├── events.ts   # Static event definitions (10 events)
│   ├── generator.ts # Turn event selection
│   ├── resolver.ts # Action resolution + stat updates
│   ├── endings.ts  # Ending determination logic
│   ├── rng.ts      # Seeded random number generator
│   └── utils.ts    # Stat clamping, delta application
├── ui/             # React components
│   ├── StatPanel.tsx    # Player + world stats display
│   ├── EventCard.tsx    # Current event + 3 action buttons
│   └── HistoryLog.tsx  # Past turns display
├── services/
│   └── storage.ts  # LocalStorage persistence
├── i18n.ts        # Translations (en/zh) + event text
├── App.tsx        # Main game component
└── main.tsx       # React entry point
```

## Core Types (`src/engine/types.ts`)

| Type | Purpose |
|------|---------|
| `PlayerState` | `{ money, skill_ai, network, energy, curiosity, chaos }` all 0-100 |
| `WorldState` | `{ ai_hype, economy, turn }` all 0-100, turn starts at 1 |
| `Action` | `{ id, type, label, flavor, playerDelta, worldDelta }` |
| `Event` | `{ id, title, description, actions[] }` |
| `HistoryEntry` | `{ turn, eventId, eventTitle, actionId, actionLabel, resultText, missedPathsText[] }` |
| `GameState` | `{ player, world, history, seed, completed }` |
| `Ending` | `{ id, title, summary }` - determined at turn 20 |

### Action Types

- `safe` - Conventional, lower-risk choice
- `risky` - Higher risk/reward, opportunity-focused
- `absurd` - Non-traditional, unexpected, or playful option

### Ending IDs

- `quiet_specialist` - High skill_ai, low chaos
- `stable_generalist` - Balanced stats
- `chaotic_innovator` - High chaos
- `connected_builder` - High network
- `delightfully_strange_person` - High curiosity + high chaos

## Engine Components

### `state.ts` - Initial State

```typescript
createInitialPlayerState() → PlayerState
// All stats start at 50 (money, skill_ai, network, energy, curiosity, chaos)

createInitialWorldState() → WorldState
// ai_hype: 50, economy: 50, turn: 1

createInitialState(seed?) → GameState
// Combines player, world, empty history, seed, completed: false
```

### `events.ts` - Static Events

10 hardcoded events, each with 3 actions (safe/risky/absurd):

1. `frontier-lab-hiring-wave` - AI lab job opportunities
2. `friends-risky-ai-startup-invite` - Friend's startup offer
3. `open-source-model-drops-overnight` - Open source model release
4. `family-asks-still-doing-ai-stuff` - Family questioning your path
5. `local-ai-meetup-explosion` - Meetup growth
6. `productivity-collapse-week` - Burnout scenario
7. `ai-astrology-app-goes-viral` - Weird AI trend
8. `corporate-ai-policy-clampdown` - Corporate restrictions
9. `weird-niche-tool-actually-finds-users` - Niche success
10. `model-starts-giving-unreasonably-good-advice` - AI giving life advice

### `generator.ts` - Event Selection

```typescript
generateTurnEvents(state) → DisplayedTurn
```
- Creates seeded PRNG from game seed + history hash
- Excludes last picked event to avoid immediate repeats
- Returns `{ currentEvent: Event }`

### `resolver.ts` - Action Resolution

```typescript
resolveAction(state, event, action, displayedTurn) → GameState
```
- Applies `action.playerDelta` (clamped 0-100)
- Applies `action.worldDelta` (clamped 0-100)
- Creates `HistoryEntry` with result text and missed paths
- Increments turn, checks turn >= 20 → sets `completed: true`

### `endings.ts` - Ending Logic

```typescript
getEnding(state) → Ending
```
Checks final stat profile (at turn 20):
- `curiosity >= 70 && chaos >= 70` → Delightfully Strange Person
- `chaos >= 75` → Chaotic Innovator
- `network >= 75` → Connected Builder
- `skill_ai >= 75 && chaos < 60` → Quiet Specialist
- Otherwise → Stable Generalist

### `rng.ts` - Random Number Generator

```typescript
createRng(seed) → () => number
// Seeded PRNG for deterministic replay

randomInt(rng, min, max) → number
// Generate random integer in range
```

### `utils.ts` - Utilities

```typescript
clamp(value, min, max) → number
clampStat(value) → number  // Clamp to 0-100

applyPlayerDelta(state, delta) → PlayerState
applyWorldDelta(state, delta) → WorldState
```

## UI Components

### `App.tsx` - Main Component

- Manages game state and locale
- Handles action selection flow
- Saves/loads game from LocalStorage
- Renders stats, current event, ending, and history

### `StatPanel.tsx` - Stats Display

- Player stats: Money, AI Skill, Network, Energy, Curiosity, Chaos
- World stats: AI Hype, Economy, Turn

### `EventCard.tsx` - Event Rendering

- Shows event title and description
- Renders 3 action buttons (styled by type: safe/risky/absurd)
- Each button shows label, flavor text, and action type badge

### `HistoryLog.tsx` - History Display

- Shows past turns in reverse chronological order
- Displays chosen action and missed paths
- Localized metadata (turn number, event, action)

## Services

### `storage.ts` - Persistence

```typescript
loadSavedGame() → PersistedGame | null
saveGame(data) → void
clearSavedGame() → void
```
- Saves to LocalStorage with version validation
- Auto-saves on every turn change
- Loads previous game on startup (game continues on refresh)

## Internationalization (`i18n.ts`)

- UI text: en/zh translations
- Event text: Localized titles, descriptions, action labels, flavors
- Ending text: Localized titles and summaries
- `getLocalizedHistoryEntry()` for localized history display

## Game Flow

```
1. Load saved game OR create new game (turn 1)
2. Display current event (from generator)
3. Player clicks action
4. Resolve action:
   - Apply stat deltas
   - Create history entry
   - Increment turn
   - Check if completed (turn >= 20)
5. Save game state
6. If not complete, generate next event
7. If complete, show ending
8. Repeat from step 2
```

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build tool**: Vite
- **Styling**: CSS (see `src/index.css`)
- **Persistence**: LocalStorage with JSON serialization
- **i18n**: Custom en/zh localization

## AI Integration Points

For integrating AI to generate dynamic events/narratives:

### Data Types to Add

- Create `AIEvent` interface extending `Event` with `generated: boolean` flag
- Add `generatedEventCache` to `GameState` for AI-generated events

### Service Layer

Create `src/services/ai.ts`:
- Configuration: API key (environment variable), model selection
- Functions: `generateEvent(context)`, `generateActions(eventContext)`, `narrateResult(choiceContext)`

### Generator Updates

- `generateTurnEvents()` can optionally call AI instead of picking static event
- Fall back to static events if AI fails

### Resolver Updates

- Add AI narration for results in `resolveAction()`

### Prompt Considerations

- System prompt: Define anti-FOMO tone, non-judgmental exploration
- Event context: Include current stats, world state, recent history
- Action generation: Ensure safe/risky/absurd variety with stat implications
- Result narration: Unique description fitting choice and context