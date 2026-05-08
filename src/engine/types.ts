export const PLAYER_STAT_KEYS = [
  'money',
  'skill_ai',
  'network',
  'energy',
  'curiosity',
  'chaos',
] as const;

export const WORLD_STAT_KEYS = ['ai_hype', 'economy'] as const;

export type StatKey = (typeof PLAYER_STAT_KEYS)[number];

export type WorldStatKey = (typeof WORLD_STAT_KEYS)[number];

export type PlayerState = {
  money: number;
  skill_ai: number;
  network: number;
  energy: number;
  curiosity: number;
  chaos: number;
};

export type WorldState = {
  ai_hype: number;
  economy: number;
  turn: number;
};

export type PlayerDelta = Partial<Record<StatKey, number>>;

export type WorldDelta = Partial<Record<WorldStatKey, number>>;

export type ActionType = 'safe' | 'risky' | 'absurd';

export type Action = {
  id: string;
  type: ActionType;
  label: string;
  flavor: string;
  playerDelta: PlayerDelta;
  worldDelta: WorldDelta;
};

export type Event = {
  id: string;
  title: string;
  description: string;
  actions: Action[];
};

// Structured history keeps future UI and ending logic easier to evolve.
export type HistoryEntry = {
  turn: number;
  eventId: string;
  eventTitle: string;
  actionId: string;
  actionLabel: string;
  resultText: string;
  missedPathsText: string[];
};

export type GameState = {
  player: PlayerState;
  world: WorldState;
  history: HistoryEntry[];
  seed: number;
  completed: boolean;
};

export type EndingId =
  | 'quiet_specialist'
  | 'stable_generalist'
  | 'chaotic_innovator'
  | 'connected_builder'
  | 'delightfully_strange_person'
  | 'ai_generated';

export type Ending = {
  id: EndingId;
  title: string;
  summary: string;
};

export type DisplayedTurn = {
  currentEvent: Event;
  isAIGenerated?: boolean;
};
