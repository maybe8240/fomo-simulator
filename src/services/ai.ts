import type { Action, PlayerState, WorldState, HistoryEntry } from '../engine/types'
import { NARRATOR_SYSTEM_PROMPT } from '../prompts/narrator'

export interface AIConfig {
  apiKey: string
  baseURL: string
  model: string
}

export interface GenerateEventRequest {
  playerState: PlayerState
  worldState: WorldState
  recentHistory: HistoryEntry[]
}

export interface GenerateChoicesResponse {
  success: boolean
  eventTitle: string
  description: string
  actions: Action[]
  error?: string
}

interface MessageParam {
  type: string
  text: string
  cache_control?: { type: string }
}

const ACTION_TYPES = ['safe', 'risky', 'absurd'] as const

function clamp(value: number): number {
  return Math.min(Math.max(Math.round(value), -100), 100)
}

function buildCachedSystemPrompt(): MessageParam {
  return {
    type: "text",
    cache_control: { type: "ephemeral" },
    text: NARRATOR_SYSTEM_PROMPT,
  }
}

function buildUncachedSystemPrompt(): string {
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

function buildEventPrompt(req: GenerateEventRequest, isFirstTurn = false): string {
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

function parseAIResponse(text: string): GenerateChoicesResponse {
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

      if (!actions.every(a => ACTION_TYPES.includes(a.type))) {
        return { success: false, eventTitle: '', description: '', actions: [], error: 'Invalid action types' }
      }

      return {
        success: true,
        eventTitle: data.event_title || 'AI Generated Event',
        description: data.description || 'A new situation unfolds...',
        actions,
      }
    }

    if (data.choices && Array.isArray(data.choices) && data.choices.length === 3) {
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

      if (!actions.every(a => ACTION_TYPES.includes(a.type))) {
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
  } catch (e) {
    return { success: false, eventTitle: '', description: '', actions: [], error: String(e) }
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

export async function generateEventWithAI(
  config: AIConfig,
  req: GenerateEventRequest,
  isFirstTurn = false,
): Promise<GenerateChoicesResponse> {
  const baseURL = config.baseURL

  try {
    const targetURL = 'https://api.anthropic.com/v1/messages'
    const url = baseURL.includes('proxy')
      ? `${baseURL}${encodeURIComponent(targetURL)}`
      : `${baseURL}/v1/messages`

    const system = isFirstTurn
      ? [buildCachedSystemPrompt()]
      : buildUncachedSystemPrompt()

    const messageContent = buildEventPrompt(req, isFirstTurn)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: isFirstTurn ? 2048 : 1024,
        system,
        messages: [{ role: 'user', content: messageContent }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return { success: false, eventTitle: '', description: '', actions: [], error: `API error: ${response.status}` }
    }

    const data = await response.json() as { content: Array<{ type: string; text: string }> }
    const text = data.content?.[0]?.text || ''

    if (!text) {
      return { success: false, eventTitle: '', description: '', actions: [], error: 'Empty response' }
    }

    return parseAIResponse(text)
  } catch (e) {
    return { success: false, eventTitle: '', description: '', actions: [], error: String(e) }
  }
}

export interface GenerateEndingRequest {
  playerState: PlayerState
  worldState: WorldState
  history: HistoryEntry[]
}

export interface GenerateEndingResponse {
  success: boolean
  title: string
  summary: string
  error?: string
}

function buildEndingSystemPrompt(): string {
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

function buildEndingPrompt(req: GenerateEndingRequest): string {
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

function parseEndingResponse(text: string): GenerateEndingResponse {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const data = JSON.parse(cleaned)

    if (!data.title || !data.summary) {
      return { success: false, title: '', summary: '', error: 'Invalid response format' }
    }

    return {
      success: true,
      title: String(data.title),
      summary: String(data.summary),
    }
  } catch (e) {
    return { success: false, title: '', summary: '', error: String(e) }
  }
}

export async function generateEndingWithAI(
  config: AIConfig,
  req: GenerateEndingRequest,
): Promise<GenerateEndingResponse> {
  const baseURL = config.baseURL

  try {
    const targetURL = 'https://api.anthropic.com/v1/messages'
    const url = baseURL.includes('proxy')
      ? `${baseURL}${encodeURIComponent(targetURL)}`
      : `${baseURL}/v1/messages`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 256,
        system: buildEndingSystemPrompt(),
        messages: [{ role: 'user', content: buildEndingPrompt(req) }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return { success: false, title: '', summary: '', error: `API error: ${response.status}` }
    }

    const data = await response.json() as { content: Array<{ type: string; text: string }> }
    const text = data.content?.[0]?.text || ''

    if (!text) {
      return { success: false, title: '', summary: '', error: 'Empty response' }
    }

    return parseEndingResponse(text)
  } catch (e) {
    return { success: false, title: '', summary: '', error: String(e) }
  }
}

export function isAIEnabled(): boolean {
  return import.meta.env.VITE_AI_ENABLED === 'true'
}

export function getAIConfig(): AIConfig | null {
  const key = import.meta.env.VITE_CLAUDE_API_KEY
  if (!key) return null

  let baseURL = import.meta.env.VITE_CLAUDE_BASE_URL
  if (!baseURL) {
    baseURL = '/api/anthropic'
  }

  return {
    apiKey: key,
    baseURL,
    model: import.meta.env.VITE_CLAUDE_MODEL || 'claude-haiku-4-5',
  }
}