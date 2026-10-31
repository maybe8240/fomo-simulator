import type { Ending, GameState } from './types.ts';
import { getStatLimits } from './limits.ts';

const STATIC_ENDINGS: Ending[] = [
  {
    id: 'delightfully_strange_person',
    title: 'Delightfully Strange Person',
    summary: 'You followed the weird signal and built a life that fits no template.',
  },
  {
    id: 'chaotic_innovator',
    title: 'Chaotic Innovator',
    summary: 'You turned uncertainty into momentum and made the mess part of the method.',
  },
  {
    id: 'connected_builder',
    title: 'Connected Builder',
    summary: 'You kept showing up, stayed useful, and became the person others call first.',
  },
  {
    id: 'quiet_specialist',
    title: 'Quiet Specialist',
    summary: 'You learned deeply, moved carefully, and built durable value in the background.',
  },
  {
    id: 'stable_generalist',
    title: 'Stable Generalist',
    summary: 'You stayed adaptable, balanced, and hard to knock over in a noisy era.',
  },
];

export function getEnding(state: GameState): Ending {
  const limits = getStatLimits(state);
  if (limits.length) return {
    id: 'stat_limit', title: 'A Limit Reached',
    summary: `Your run ended when ${limits.map(limit => `${limit.key} reached ${limit.value}`).join(', ')}. The system has filed this under completed.`,
  };
  const {
    skill_ai: skillAi,
    network,
    curiosity,
    chaos,
  } = state.player;

  if (curiosity >= 70 && chaos >= 70) {
    return STATIC_ENDINGS[0];
  }

  if (chaos >= 75) {
    return STATIC_ENDINGS[1];
  }

  if (network >= 75) {
    return STATIC_ENDINGS[2];
  }

  if (skillAi >= 75 && chaos < 60) {
    return STATIC_ENDINGS[3];
  }

  return STATIC_ENDINGS[4];
}
