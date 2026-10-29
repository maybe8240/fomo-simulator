import type { Action, PlayerState, WorldState, HistoryEntry } from '../src/engine/types.ts';
export interface GenerateEventRequest { playerState: PlayerState; worldState: WorldState; recentHistory: HistoryEntry[] }
export interface GenerateEndingRequest { playerState: PlayerState; worldState: WorldState; history: HistoryEntry[] }
export interface GenerateChoicesResponse { success: boolean; eventTitle: string; description: string; actions: Action[]; error?: string }
export interface GenerateEndingResponse { success: boolean; title: string; summary: string; error?: string }
const ACTION_TYPES = ['safe', 'risky', 'absurd'] as const;
function clamp(value: number): number {
 if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid delta');
 return Math.min(Math.max(Math.round(value), -100), 100);
}
export function buildUncachedSystemPrompt(): string {
  return `You are a game that simulates life in the AI era (2026). Present a realistic event and generate exactly 3 choices: one safe/conventional, one risky/opportunity, one absurd/playful.

IMPORTANT:
- ALL text must be in English
- Each choice must have stat impacts (can be 0)
- Stat values are 0-100

Format required:
{
  "event_title": "title",
  "description": "description",
  "choices": [
    {"type": "safe", "label": "label", "flavor": "flavor text", "player_delta": {"money": 0, "skill_ai": 0, "network": 0, "energy": 0, "curiosity": 0, "chaos": 0}, "world_delta": {"ai_hype": 0, "economy": 0}},
    {"type": "risky", ...},
    {"type": "absurd", ...}
  ]
}`
}

export function buildEventPrompt(req: GenerateEventRequest, isFirstTurn = false): string {
  const p = req.playerState
  const w = req.worldState
  const hist = req.recentHistory.slice(-3)

  let historyText = ''
  if (hist.length > 0) {
    historyText = '\nRecent events:\n'
    for (const h of hist) {
      historyText += `- Turn ${h.turn}: ${h.eventTitle} → ${h.actionLabel}\n`
    }
  }

  const firstTurnHint = isFirstTurn
    ? '\n\nIMPORTANT: This is the FIRST turn of the game. Generate an opening situation that feels personal, relatable, and grounded — something an ordinary person in 2026 might genuinely encounter. Avoid dramatic or exotic scenarios. Focus on everyday AI-era life that hooks the player immediately.'
    : ''

  return `Current turn: ${w.turn}
Player stats: money=${p.money}, skill_ai=${p.skill_ai}, network=${p.network}, energy=${p.energy}, curiosity=${p.curiosity}, chaos=${p.chaos}
World: ai_hype=${w.ai_hype}, economy=${w.economy}${historyText}${firstTurnHint}

Generate a new event with 3 choices. Return ONLY valid JSON, no other text.`
}

export function parseAIResponse(text: string): GenerateChoicesResponse {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const data = JSON.parse(cleaned)

    if (data.events && Array.isArray(data.events) && data.events.length === 3) {
      const actions: Action[] = data.events.map((e: Record<string, unknown>, i: number) => {
        const statHints = (e.stat_hints as Record<string, string>) || {}
        return {
          id: `ai-${Date.now()}-${i}`,
          type: e.type as Action['type'],
          label: String(e.choice || e.label || ''),
          flavor: String(e.situation || e.flavor || ''),
          playerDelta: {
            money: clamp(statToDelta(statHints.money)),
            skill_ai: clamp(statToDelta(statHints.skills)),
            network: clamp(statToDelta(statHints.connections)),
            energy: clamp(statToDelta(statHints.energy)),
            curiosity: clamp(statToDelta(statHints.curiosity)),
            chaos: clamp(statToDelta(statHints.chaos)),
          },
          worldDelta: {
            ai_hype: 0,
            economy: 0,
          },
        }
      })

      if (!actions.every(a => ACTION_TYPES.includes(a.type)) || new Set(actions.map(a => a.type)).size !== 3) {
        return { success: false, eventTitle: '', description: '', actions: [], error: 'Invalid action types' }
      }

      return {
        success: true,
        eventTitle: String(data.event_title || 'AI Generated Event'),
        description: String(data.description || 'A new situation unfolds...'),
        actions,
      }
    }

    if (data.choices && Array.isArray(data.choices) && data.choices.length === 3) {
      if (typeof data.event_title !== 'string' || !data.event_title.trim()
        || typeof data.description !== 'string' || !data.description.trim()) {
        throw new Error('Event title and description are required')
      }
      const actions: Action[] = data.choices.map((c: Record<string, unknown>, i: number) => {
        const pd = (c.player_delta as Record<string, number>) || {}
        const wd = (c.world_delta as Record<string, number>) || {}
        return {
          id: `ai-${Date.now()}-${i}`,
          type: c.type as Action['type'],
          label: String(c.label || ''),
          flavor: String(c.flavor || ''),
          playerDelta: {
            money: clamp(pd.money ?? 0),
            skill_ai: clamp(pd.skill_ai ?? 0),
            network: clamp(pd.network ?? 0),
            energy: clamp(pd.energy ?? 0),
            curiosity: clamp(pd.curiosity ?? 0),
            chaos: clamp(pd.chaos ?? 0),
          },
          worldDelta: {
            ai_hype: clamp(wd.ai_hype ?? 0),
            economy: clamp(wd.economy ?? 0),
          },
        }
      })

      if (!actions.every(a => ACTION_TYPES.includes(a.type)) || new Set(actions.map(a => a.type)).size !== 3) {
        return { success: false, eventTitle: '', description: '', actions: [], error: 'Invalid action types' }
      }

      return {
        success: true,
        eventTitle: data.event_title || '',
        description: data.description || '',
        actions,
      }
    }

    return { success: false, eventTitle: '', description: '', actions: [], error: 'Invalid response format' }
  } catch {
    return { success: false, eventTitle: '', description: '', actions: [], error: 'Invalid AI response' }
  }
}

function statToDelta(hint: string | undefined): number {
  if (!hint) return 0
  const lower = hint.toLowerCase()
  if (lower.includes('increase') || lower.includes('gain') || lower.includes('build') || lower.includes('boost')) return 10
  if (lower.includes('decrease') || lower.includes('drain') || lower.includes('loss') || lower.includes('drop')) return -10
  if (lower.includes('volatile') || lower.includes('unpredictable') || lower.includes('instable')) return 15
  if (lower.includes('stable') || lower.includes('quiet')) return -5
  return 0
}


export function buildEndingSystemPrompt(): string {
  return `You are a storytelling engine for a narrative game about life in the AI era (2026). Based on the player's journey, generate a unique ending title and summary.

IMPORTANT:
- ALL text must be in English
- Be creative and specific to the player's actual choices
- Title: 3-6 words, memorable
- Summary: 1-2 sentences, reflecting what happened
- Match tone to the player's stat profile

Format required:
{
  "title": "ending title",
  "summary": "ending summary text"
}`
}

export function buildEndingPrompt(req: GenerateEndingRequest): string {
  const p = req.playerState
  const w = req.worldState
  const hist = req.history

  let historyText = '\nPlayer journey:\n'
  for (const h of hist) {
    historyText += `- Turn ${h.turn}: ${h.eventTitle} → ${h.actionLabel}\n`
  }

  return `Final stats: money=${p.money}, skill_ai=${p.skill_ai}, network=${p.network}, energy=${p.energy}, curiosity=${p.curiosity}, chaos=${p.chaos}
World: ai_hype=${w.ai_hype}, economy=${w.economy}, turn=${w.turn}${historyText}

Generate a unique ending title and summary. Return ONLY valid JSON, no other text.`
}

export function parseEndingResponse(text: string): GenerateEndingResponse {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const data = JSON.parse(cleaned)

    if (typeof data.title !== 'string' || !data.title.trim()
      || typeof data.summary !== 'string' || !data.summary.trim()) {
      return { success: false, title: '', summary: '', error: 'Invalid response format' }
    }

    return {
      success: true,
      title: String(data.title),
      summary: String(data.summary),
    }
  } catch {
    return { success: false, title: '', summary: '', error: 'Invalid AI response' }
  }
}
