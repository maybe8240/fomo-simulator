import type { Event } from './types';

export const STARTER_EVENTS: Event[] = [
  {
    id: 'frontier-lab-hiring-wave',
    title: 'Frontier Lab Hiring Wave',
    description:
      'A well-funded frontier AI lab opens a wave of hiring for tool builders, evaluators, and generalists who can survive ambiguity.',
    actions: [
      {
        id: 'frontier-lab-apply-immediately',
        type: 'safe',
        label: 'Apply immediately',
        flavor:
          'You polish your resume, message everyone you vaguely know, and jump into the swarm.',
        playerDelta: { money: 4, network: 6, energy: -5, curiosity: -1 },
        worldDelta: { ai_hype: 2, economy: 1 },
      },
      {
        id: 'frontier-lab-stay-independent',
        type: 'risky',
        label: 'Stay independent and study what they’re building',
        flavor:
          'You decide not to chase prestige directly. Instead, you reverse-engineer the trend.',
        playerDelta: { skill_ai: 5, curiosity: 3, money: -2, network: -1 },
        worldDelta: { ai_hype: 1 },
      },
      {
        id: 'frontier-lab-parody-newsletter',
        type: 'absurd',
        label: 'Start a parody anti-frontier lab newsletter',
        flavor:
          'Instead of applying, you launch a sharply written newsletter critiquing the whole scene.',
        playerDelta: { chaos: 5, network: 2, curiosity: 2, money: -1 },
        worldDelta: { ai_hype: 1 },
      },
    ],
  },
  {
    id: 'friends-risky-ai-startup-invite',
    title: 'Friend’s Risky AI Startup Invite',
    description:
      'A friend asks you to join an AI startup that claims it will replace most boring work by Q4.',
    actions: [
      {
        id: 'startup-invite-join-early-builder',
        type: 'safe',
        label: 'Join as an early builder',
        flavor:
          'You jump in before anyone can tell whether this is brilliant or cursed.',
        playerDelta: { money: 2, network: 4, skill_ai: 3, energy: -6, chaos: 1 },
        worldDelta: { ai_hype: 2, economy: 1 },
      },
      {
        id: 'startup-invite-decline-stay-close',
        type: 'risky',
        label: 'Decline, but stay close to the project',
        flavor: 'You keep the door open without setting your life on fire.',
        playerDelta: { network: 2, energy: 2, curiosity: 1 },
        worldDelta: { ai_hype: 1 },
      },
      {
        id: 'startup-invite-stranger-pivot',
        type: 'absurd',
        label: 'Pitch an even stranger pivot',
        flavor:
          'You suggest they abandon productivity and build AI tools for dream analysis instead.',
        playerDelta: { chaos: 6, curiosity: 3, network: 1, money: -2 },
        worldDelta: { ai_hype: 1, economy: -1 },
      },
    ],
  },
  {
    id: 'open-source-model-drops-overnight',
    title: 'Open-Source Model Drops Overnight',
    description:
      'A strong open-source model suddenly becomes cheap and accessible, and everyone is racing to repackage it.',
    actions: [
      {
        id: 'open-source-build-small-tool',
        type: 'safe',
        label: 'Build a small tool on top of it',
        flavor: 'You build first and ask philosophical questions later.',
        playerDelta: { skill_ai: 4, money: 2, curiosity: 2, energy: -3 },
        worldDelta: { ai_hype: 2, economy: 1 },
      },
      {
        id: 'open-source-write-practical-guide',
        type: 'risky',
        label: 'Write a practical guide and share it',
        flavor: 'You turn confusion into a public service.',
        playerDelta: { network: 4, skill_ai: 2, money: 1, energy: -2 },
        worldDelta: { ai_hype: 1 },
      },
      {
        id: 'open-source-pigeon-life-coach',
        type: 'absurd',
        label: 'Fine-tune it into an AI life coach for pigeons',
        flavor: 'Nobody asked for this, which may be why it feels important.',
        playerDelta: { chaos: 5, curiosity: 2, skill_ai: 1, money: -1 },
        worldDelta: { ai_hype: 1 },
      },
    ],
  },
  {
    id: 'family-asks-still-doing-ai-stuff',
    title: 'Family Asks If You’re “Still Doing AI Stuff”',
    description:
      'At a family gathering, someone asks whether any of your AI activities are actually turning into a normal life.',
    actions: [
      {
        id: 'family-reassure-pursue-stable-work',
        type: 'safe',
        label: 'Reassure everyone and pursue stable work',
        flavor:
          'You present a version of your life that sounds professionally acceptable.',
        playerDelta: { money: 3, energy: 3, curiosity: -2, chaos: -1 },
        worldDelta: { economy: 1, ai_hype: -1 },
      },
      {
        id: 'family-defend-long-term-vision',
        type: 'risky',
        label: 'Defend your long-term vision',
        flavor:
          'You explain that the future is messy and you are adapting on purpose.',
        playerDelta: { curiosity: 3, network: 1, energy: -2, chaos: 1 },
        worldDelta: { ai_hype: 1 },
      },
      {
        id: 'family-co-evolving-machine-age',
        type: 'absurd',
        label: 'Tell them you are co-evolving with the machine age',
        flavor:
          'This does not reduce concern, but it does increase commitment to the bit.',
        playerDelta: { chaos: 4, energy: -1, network: 1, curiosity: 2 },
        worldDelta: { ai_hype: 1 },
      },
    ],
  },
  {
    id: 'local-ai-meetup-explosion',
    title: 'Local AI Meetup Explosion',
    description:
      'A local AI meetup goes from 20 people to 400 in three weeks. Everyone is introducing themselves as a founder, advisor, or future systems person.',
    actions: [
      {
        id: 'meetup-network-aggressively',
        type: 'safe',
        label: 'Attend and network aggressively',
        flavor:
          'You spend the evening in a haze of intros, demos, and overheard ambition.',
        playerDelta: { network: 6, energy: -4, money: -1, chaos: 1 },
        worldDelta: { ai_hype: 2, economy: 1 },
      },
      {
        id: 'meetup-attend-quietly',
        type: 'risky',
        label: 'Attend quietly and learn',
        flavor: 'You avoid posturing and leave with more signal than noise.',
        playerDelta: { skill_ai: 2, curiosity: 3, network: 2, energy: -2 },
        worldDelta: { ai_hype: 1 },
      },
      {
        id: 'meetup-optimize-your-soul',
        type: 'absurd',
        label: 'Host a side session called How Not to Optimize Your Soul',
        flavor:
          'It is half critique, half support group, and somehow well attended.',
        playerDelta: { chaos: 4, network: 3, curiosity: 2, money: -1 },
        worldDelta: { ai_hype: 1 },
      },
    ],
  },
  {
    id: 'productivity-collapse-week',
    title: 'Productivity Collapse Week',
    description:
      'After weeks of trying to keep up with every new model, agent, benchmark, and discourse wave, your brain feels cooked.',
    actions: [
      {
        id: 'collapse-rest-completely',
        type: 'safe',
        label: 'Rest completely for a week',
        flavor: 'You log off hard enough to remember you are a mammal.',
        playerDelta: { energy: 7, curiosity: 1, money: -2, network: -2 },
        worldDelta: {},
      },
      {
        id: 'collapse-push-through',
        type: 'risky',
        label: 'Push through and keep shipping',
        flavor: 'You convert exhaustion into output and postpone the bill.',
        playerDelta: { money: 3, skill_ai: 2, energy: -7, chaos: 1 },
        worldDelta: { ai_hype: 1, economy: 1 },
      },
      {
        id: 'collapse-surreal-zine',
        type: 'absurd',
        label: 'Convert your burnout into a surreal zine',
        flavor: 'You turn psychic damage into aesthetics.',
        playerDelta: { chaos: 5, curiosity: 3, energy: 1, money: -1 },
        worldDelta: {},
      },
    ],
  },
  {
    id: 'ai-astrology-app-goes-viral',
    title: 'AI Astrology App Goes Viral',
    description:
      'An AI astrology app starts going viral by giving people model-aligned cosmic career advice.',
    actions: [
      {
        id: 'astrology-ignore-work-serious-things',
        type: 'safe',
        label: 'Ignore it and work on serious things',
        flavor:
          'You remain committed to reality, or at least your preferred version of it.',
        playerDelta: { skill_ai: 2, chaos: -1, curiosity: -1 },
        worldDelta: { ai_hype: 1, economy: 1 },
      },
      {
        id: 'astrology-analyze-why-it-works',
        type: 'risky',
        label: 'Analyze why it works',
        flavor:
          'You do not believe in it, which only makes it more interesting.',
        playerDelta: { curiosity: 4, skill_ai: 1, network: 1, energy: -1 },
        worldDelta: { ai_hype: 1 },
      },
      {
        id: 'astrology-launch-horoscope-engine',
        type: 'absurd',
        label: 'Launch Agent Horoscope Engine',
        flavor:
          'You decide that if nonsense has momentum, it deserves product design.',
        playerDelta: { money: 3, chaos: 6, network: 2, curiosity: 2, energy: -2 },
        worldDelta: { ai_hype: 2, economy: 1 },
      },
    ],
  },
  {
    id: 'corporate-ai-policy-clampdown',
    title: 'Corporate AI Policy Clampdown',
    description:
      'A wave of companies suddenly restricts internal AI tool use after legal and privacy concerns spike.',
    actions: [
      {
        id: 'policy-clampdown-adapt-compliant',
        type: 'safe',
        label: 'Adapt and learn compliant workflows',
        flavor:
          'You become the sort of person who can survive a compliance memo.',
        playerDelta: { skill_ai: 3, money: 2, energy: -2 },
        worldDelta: { ai_hype: -2, economy: -1 },
      },
      {
        id: 'policy-clampdown-shift-open-tooling',
        type: 'risky',
        label: 'Shift toward open/public tooling',
        flavor:
          'You move toward the edges where the rules are still negotiable.',
        playerDelta: { curiosity: 3, skill_ai: 2, money: -1, chaos: 1 },
        worldDelta: { ai_hype: 1 },
      },
      {
        id: 'policy-clampdown-shadow-prompt-society',
        type: 'absurd',
        label: 'Start a shadow prompt society',
        flavor:
          'The meetings are discreet, unserious, and increasingly influential.',
        playerDelta: { chaos: 5, network: 3, energy: -2, money: -1 },
        worldDelta: { ai_hype: 1, economy: -1 },
      },
    ],
  },
  {
    id: 'weird-niche-tool-actually-finds-users',
    title: 'Weird Niche Tool Actually Finds Users',
    description:
      'A bizarre tool built for a tiny audience suddenly finds devoted users. It does not dominate the market, but the people who love it really love it.',
    actions: [
      {
        id: 'niche-tool-double-down',
        type: 'safe',
        label: 'Double down on the niche',
        flavor:
          'You lean into specificity and discover that small audiences can feel real.',
        playerDelta: { money: 2, curiosity: 3, chaos: 2, network: 2, energy: -2 },
        worldDelta: { economy: 1 },
      },
      {
        id: 'niche-tool-generalize-mass-market',
        type: 'risky',
        label: 'Generalize it for the mass market',
        flavor: 'You smooth out the strange edges and gain broader traction.',
        playerDelta: { money: 4, skill_ai: 2, energy: -4, curiosity: -1 },
        worldDelta: { ai_hype: 1, economy: 1 },
      },
      {
        id: 'niche-tool-turn-into-art-project',
        type: 'absurd',
        label: 'Refuse scale and turn it into an art project',
        flavor:
          'You protect the soul of the thing, even if that makes growth awkward.',
        playerDelta: { chaos: 5, curiosity: 4, money: -2, energy: 1 },
        worldDelta: {},
      },
    ],
  },
  {
    id: 'model-starts-giving-unreasonably-good-advice',
    title: 'A Model Starts Giving You Unreasonably Good Advice',
    description:
      'A model you are testing starts producing strategic advice that is oddly specific, unusually helpful, and a little too confident about your future.',
    actions: [
      {
        id: 'model-advice-use-carefully',
        type: 'safe',
        label: 'Use it carefully as a brainstorming partner',
        flavor:
          'You treat it as a tool, while quietly wondering whether it knows more than it should.',
        playerDelta: { skill_ai: 3, curiosity: 2, energy: 1, chaos: 1 },
        worldDelta: { ai_hype: 2 },
      },
      {
        id: 'model-advice-trust-too-much',
        type: 'risky',
        label: 'Trust it too much and reorganize your life',
        flavor:
          'You let the confidence of the machine substitute for certainty of your own.',
        playerDelta: { money: 2, network: 2, chaos: 4, energy: -3 },
        worldDelta: { ai_hype: 2, economy: 1 },
      },
      {
        id: 'model-advice-performance-art-destiny',
        type: 'absurd',
        label: 'Ask it to design your destiny as performance art',
        flavor:
          'The line between planning and ritual dissolves completely.',
        playerDelta: { chaos: 7, curiosity: 3, network: 1, money: -1 },
        worldDelta: { ai_hype: 1 },
      },
    ],
  },
];
