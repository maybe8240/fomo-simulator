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
  // Optional for version-1 saves made before narrative continuity was recorded.
  actionType?: ActionType;
  eventDescription?: string;
  actionFlavor?: string;
  turn: number;
  eventId: string;
  eventTitle: string;
  actionId: string;
  actionLabel: string;
  resultText: string;
  missedPathsText: string[];
};

export type GameState = {
  maxTurns?: number;
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
  generatedLocale?: 'en' | 'zh';
  id: EndingId;
  title: string;
  summary: string;
};

export type DisplayedTurn = {
  generatedLocale?: 'en' | 'zh';
  currentEvent: Event;
  isAIGenerated?: boolean;
};
