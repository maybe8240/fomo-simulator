import type { Ending, GameState } from './types';

export function getEnding(state: GameState): Ending {
  const {
    skill_ai: skillAi,
    network,
    curiosity,
    chaos,
  } = state.player;

  if (curiosity >= 70 && chaos >= 70) {
    return {
      id: 'delightfully_strange_person',
      title: 'Delightfully Strange Person',
      summary: 'You followed the weird signal and built a life that fits no template.',
    };
  }

  if (chaos >= 75) {
    return {
      id: 'chaotic_innovator',
      title: 'Chaotic Innovator',
      summary: 'You turned uncertainty into momentum and made the mess part of the method.',
    };
  }

  if (network >= 75) {
    return {
      id: 'connected_builder',
      title: 'Connected Builder',
      summary: 'You kept showing up, stayed useful, and became the person others call first.',
    };
  }

  if (skillAi >= 75 && chaos < 60) {
    return {
      id: 'quiet_specialist',
      title: 'Quiet Specialist',
      summary: 'You learned deeply, moved carefully, and built durable value in the background.',
    };
  }

  return {
    id: 'stable_generalist',
    title: 'Stable Generalist',
    summary: 'You stayed adaptable, balanced, and hard to knock over in a noisy era.',
  };
}
