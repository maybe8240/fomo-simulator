import { STARTER_EVENTS } from './engine/events';
import type { ActionType, EndingId, HistoryEntry } from './engine/types';

export type Locale = 'en' | 'zh';

type LocalizedText = {
  en: string;
  zh: string;
};

type Dictionary = Record<string, LocalizedText>;

const UI_TEXT: Dictionary = {
  share_run: { en: 'Share Run', zh: '分享本次人生' },
  final_stats: { en: 'Final Stats', zh: '最终状态' },
  preparing_share: { en: 'Preparing your image...', zh: '正在生成分享图片……' },
  share_error: { en: 'Could not create or share the image. Try again.', zh: '无法生成或分享图片，请重试。' },
  share_downloaded: { en: 'Image downloaded. You can share it anywhere.', zh: '图片已下载，可以分享给朋友。' },
  app_title: { en: 'FOMO Simulator', zh: 'FOMO 模拟器' },
  app_subtitle: {
    en: 'Life in the AI Era',
    zh: 'AI 时代的人生',
  },
  current_stats: { en: 'Current Stats', zh: '当前状态' },
  player: { en: 'Player', zh: '玩家' },
  world: { en: 'World', zh: '世界' },
  money: { en: 'Money', zh: '金钱' },
  skill_ai: { en: 'AI Skill', zh: 'AI 技能' },
  network: { en: 'Network', zh: '人脉' },
  energy: { en: 'Energy', zh: '精力' },
  curiosity: { en: 'Curiosity', zh: '好奇心' },
  chaos: { en: 'Chaos', zh: '混乱值' },
  ai_hype: { en: 'AI Hype', zh: 'AI 热度' },
  economy: { en: 'Economy', zh: '经济' },
  turn: { en: 'Turn', zh: '回合' },
  current_event: { en: 'Current Event', zh: '当前事件' },
  ending: { en: 'Ending', zh: '结局' },
  restart_run: { en: 'Restart Run', zh: '重新开始' },
  turn_status: { en: 'Turn Status', zh: '回合状态' },
  resolving: { en: 'Resolving your choice...', zh: '正在结算你的选择……' },
  pick_action: {
    en: 'Pick one action to advance to the next turn.',
    zh: '选择一个行动来进入下一回合。',
  },
  generating_event: { en: 'Generating new event...', zh: '正在生成新事件……' },
  generating_ending: { en: 'Writing your ending...', zh: '正在书写你的结局……' },
  ai_generated: { en: 'AI Generated', zh: 'AI 生成' },
  static_event: { en: 'Random Event', zh: '随机事件' },
  ai_error: { en: 'AI failed, using random event', zh: 'AI 生成失败，使用随机事件' },
  history_log: { en: 'History Log', zh: '历史记录' },
  no_history: {
    en: 'No turns resolved yet. Pick an action to begin.',
    zh: '还没有任何已结算的回合。请选择一个行动开始。',
  },
  safe: { en: 'Safe', zh: '稳妥' },
  risky: { en: 'Risky', zh: '冒险' },
  absurd: { en: 'Absurd', zh: '荒诞' },
  language: { en: 'Language', zh: '语言' },
  english: { en: 'English', zh: '英文' },
  chinese: { en: 'Chinese', zh: '中文' },
};

const EVENT_TEXT: Dictionary = {
  'frontier-lab-hiring-wave.title': {
    en: 'Frontier Lab Hiring Wave',
    zh: '前沿实验室招聘潮',
  },
  'frontier-lab-hiring-wave.description': {
    en: 'A well-funded frontier AI lab opens a wave of hiring for tool builders, evaluators, and generalists who can survive ambiguity.',
    zh: '一家资金充足的前沿 AI 实验室开启大规模招聘，寻找能在不确定中生存的工具开发者、评估人员和通才。',
  },
  'frontier-lab-apply-immediately.label': {
    en: 'Apply immediately',
    zh: '立刻投递申请',
  },
  'frontier-lab-apply-immediately.flavor': {
    en: 'You polish your resume, message everyone you vaguely know, and jump into the swarm.',
    zh: '你润色简历，联系所有稍微认识的人，然后一头扎进求职人潮。',
  },
  'frontier-lab-stay-independent.label': {
    en: 'Stay independent and study what they’re building',
    zh: '保持独立，研究他们到底在做什么',
  },
  'frontier-lab-stay-independent.flavor': {
    en: 'You decide not to chase prestige directly. Instead, you reverse-engineer the trend.',
    zh: '你决定不直接追逐名望，而是反向拆解这股趋势。',
  },
  'frontier-lab-parody-newsletter.label': {
    en: 'Start a parody anti-frontier lab newsletter',
    zh: '办一份讽刺前沿实验室的反潮流通讯',
  },
  'frontier-lab-parody-newsletter.flavor': {
    en: 'Instead of applying, you launch a sharply written newsletter critiquing the whole scene.',
    zh: '你没有去投简历，而是推出一份文风尖锐的通讯，讽刺整个圈子。',
  },

  'friends-risky-ai-startup-invite.title': {
    en: 'Friend’s Risky AI Startup Invite',
    zh: '朋友邀请你加入高风险 AI 创业公司',
  },
  'friends-risky-ai-startup-invite.description': {
    en: 'A friend asks you to join an AI startup that claims it will replace most boring work by Q4.',
    zh: '一位朋友邀请你加入一家 AI 创业公司，他们声称会在第四季度前取代大多数无聊的工作。',
  },
  'startup-invite-join-early-builder.label': {
    en: 'Join as an early builder',
    zh: '以早期建设者身份加入',
  },
  'startup-invite-join-early-builder.flavor': {
    en: 'You jump in before anyone can tell whether this is brilliant or cursed.',
    zh: '在所有人还分不清这是天才之举还是诅咒之前，你已经冲了进去。',
  },
  'startup-invite-decline-stay-close.label': {
    en: 'Decline, but stay close to the project',
    zh: '婉拒，但继续保持靠近',
  },
  'startup-invite-decline-stay-close.flavor': {
    en: 'You keep the door open without setting your life on fire.',
    zh: '你在不把生活烧掉的前提下，为自己留了一扇门。',
  },
  'startup-invite-stranger-pivot.label': {
    en: 'Pitch an even stranger pivot',
    zh: '提出一个更离奇的转型方向',
  },
  'startup-invite-stranger-pivot.flavor': {
    en: 'You suggest they abandon productivity and build AI tools for dream analysis instead.',
    zh: '你建议他们放弃效率工具，转而做 AI 梦境分析产品。',
  },

  'open-source-model-drops-overnight.title': {
    en: 'Open-Source Model Drops Overnight',
    zh: '开源模型一夜之间横空出世',
  },
  'open-source-model-drops-overnight.description': {
    en: 'A strong open-source model suddenly becomes cheap and accessible, and everyone is racing to repackage it.',
    zh: '一个强大的开源模型突然变得廉价且易得，所有人都在争相重新包装它。',
  },
  'open-source-build-small-tool.label': {
    en: 'Build a small tool on top of it',
    zh: '基于它做一个小工具',
  },
  'open-source-build-small-tool.flavor': {
    en: 'You build first and ask philosophical questions later.',
    zh: '你先把东西做出来，再去考虑哲学问题。',
  },
  'open-source-write-practical-guide.label': {
    en: 'Write a practical guide and share it',
    zh: '写一份实用指南并分享出去',
  },
  'open-source-write-practical-guide.flavor': {
    en: 'You turn confusion into a public service.',
    zh: '你把普遍的困惑转化成了公共服务。',
  },
  'open-source-pigeon-life-coach.label': {
    en: 'Fine-tune it into an AI life coach for pigeons',
    zh: '把它微调成一款给鸽子的人生教练 AI',
  },
  'open-source-pigeon-life-coach.flavor': {
    en: 'Nobody asked for this, which may be why it feels important.',
    zh: '没有人要求你这么做，也许正因如此它显得格外重要。',
  },

  'family-asks-still-doing-ai-stuff.title': {
    en: 'Family Asks If You’re “Still Doing AI Stuff”',
    zh: '家人问你是不是“还在搞 AI 那套”',
  },
  'family-asks-still-doing-ai-stuff.description': {
    en: 'At a family gathering, someone asks whether any of your AI activities are actually turning into a normal life.',
    zh: '在一次家庭聚会上，有人问你这些 AI 活动到底有没有变成一种“正常生活”。',
  },
  'family-reassure-pursue-stable-work.label': {
    en: 'Reassure everyone and pursue stable work',
    zh: '安抚大家，并去追求稳定工作',
  },
  'family-reassure-pursue-stable-work.flavor': {
    en: 'You present a version of your life that sounds professionally acceptable.',
    zh: '你展示了一个听起来更职业、也更让人安心的人生版本。',
  },
  'family-defend-long-term-vision.label': {
    en: 'Defend your long-term vision',
    zh: '为自己的长期愿景辩护',
  },
  'family-defend-long-term-vision.flavor': {
    en: 'You explain that the future is messy and you are adapting on purpose.',
    zh: '你解释说未来本来就混乱，而你是在有意识地适应它。',
  },
  'family-co-evolving-machine-age.label': {
    en: 'Tell them you are co-evolving with the machine age',
    zh: '告诉他们你正在与机器时代共同进化',
  },
  'family-co-evolving-machine-age.flavor': {
    en: 'This does not reduce concern, but it does increase commitment to the bit.',
    zh: '这并没有减少他们的担忧，但确实让你更坚定地把戏演下去了。',
  },

  'local-ai-meetup-explosion.title': {
    en: 'Local AI Meetup Explosion',
    zh: '本地 AI 聚会人数爆炸式增长',
  },
  'local-ai-meetup-explosion.description': {
    en: 'A local AI meetup goes from 20 people to 400 in three weeks. Everyone is introducing themselves as a founder, advisor, or future systems person.',
    zh: '一个本地 AI 聚会在三周内从 20 人涨到 400 人。每个人都把自己介绍成创始人、顾问，或者未来系统人物。',
  },
  'meetup-network-aggressively.label': {
    en: 'Attend and network aggressively',
    zh: '参加并积极拓展人脉',
  },
  'meetup-network-aggressively.flavor': {
    en: 'You spend the evening in a haze of intros, demos, and overheard ambition.',
    zh: '整个晚上你都淹没在自我介绍、演示和旁听到的宏大野心里。',
  },
  'meetup-attend-quietly.label': {
    en: 'Attend quietly and learn',
    zh: '低调参加，专心学习',
  },
  'meetup-attend-quietly.flavor': {
    en: 'You avoid posturing and leave with more signal than noise.',
    zh: '你避开了表演式社交，带着更多有效信息离场。',
  },
  'meetup-optimize-your-soul.label': {
    en: 'Host a side session called How Not to Optimize Your Soul',
    zh: '主持一场题为“如何不把灵魂优化掉”的分会',
  },
  'meetup-optimize-your-soul.flavor': {
    en: 'It is half critique, half support group, and somehow well attended.',
    zh: '这活动一半像批判讨论，一半像互助小组，却意外地很受欢迎。',
  },

  'productivity-collapse-week.title': {
    en: 'Productivity Collapse Week',
    zh: '生产力崩塌周',
  },
  'productivity-collapse-week.description': {
    en: 'After weeks of trying to keep up with every new model, agent, benchmark, and discourse wave, your brain feels cooked.',
    zh: '连续几周试图追上每个新模型、Agent、基准测试和舆论浪潮后，你的大脑彻底被烤糊了。',
  },
  'collapse-rest-completely.label': {
    en: 'Rest completely for a week',
    zh: '彻底休息一周',
  },
  'collapse-rest-completely.flavor': {
    en: 'You log off hard enough to remember you are a mammal.',
    zh: '你断网断得足够彻底，终于想起自己其实是哺乳动物。',
  },
  'collapse-push-through.label': {
    en: 'Push through and keep shipping',
    zh: '硬撑下去，继续交付',
  },
  'collapse-push-through.flavor': {
    en: 'You convert exhaustion into output and postpone the bill.',
    zh: '你把疲惫强行转化成产出，把代价留到以后再付。',
  },
  'collapse-surreal-zine.label': {
    en: 'Convert your burnout into a surreal zine',
    zh: '把倦怠感做成一本超现实小志',
  },
  'collapse-surreal-zine.flavor': {
    en: 'You turn psychic damage into aesthetics.',
    zh: '你把精神损耗转化成了审美风格。',
  },

  'ai-astrology-app-goes-viral.title': {
    en: 'AI Astrology App Goes Viral',
    zh: 'AI 占星应用爆红',
  },
  'ai-astrology-app-goes-viral.description': {
    en: 'An AI astrology app starts going viral by giving people model-aligned cosmic career advice.',
    zh: '一款 AI 占星应用凭借“与模型对齐的宇宙职业建议”开始爆红。',
  },
  'astrology-ignore-work-serious-things.label': {
    en: 'Ignore it and work on serious things',
    zh: '无视它，继续做严肃的事',
  },
  'astrology-ignore-work-serious-things.flavor': {
    en: 'You remain committed to reality, or at least your preferred version of it.',
    zh: '你依然忠于现实，至少是你偏爱的那个现实版本。',
  },
  'astrology-analyze-why-it-works.label': {
    en: 'Analyze why it works',
    zh: '分析它为什么会奏效',
  },
  'astrology-analyze-why-it-works.flavor': {
    en: 'You do not believe in it, which only makes it more interesting.',
    zh: '你并不相信它，这反而让它更值得研究。',
  },
  'astrology-launch-horoscope-engine.label': {
    en: 'Launch Agent Horoscope Engine',
    zh: '推出 Agent 星座运势引擎',
  },
  'astrology-launch-horoscope-engine.flavor': {
    en: 'You decide that if nonsense has momentum, it deserves product design.',
    zh: '你决定，既然胡说八道已经有了势能，那它就值得被认真产品化。',
  },

  'corporate-ai-policy-clampdown.title': {
    en: 'Corporate AI Policy Clampdown',
    zh: '企业 AI 政策全面收紧',
  },
  'corporate-ai-policy-clampdown.description': {
    en: 'A wave of companies suddenly restricts internal AI tool use after legal and privacy concerns spike.',
    zh: '在法律和隐私风险骤然上升后，一波公司突然限制内部 AI 工具的使用。',
  },
  'policy-clampdown-adapt-compliant.label': {
    en: 'Adapt and learn compliant workflows',
    zh: '适应并学习合规工作流',
  },
  'policy-clampdown-adapt-compliant.flavor': {
    en: 'You become the sort of person who can survive a compliance memo.',
    zh: '你逐渐变成那种能在合规备忘录中活下来的人。',
  },
  'policy-clampdown-shift-open-tooling.label': {
    en: 'Shift toward open/public tooling',
    zh: '转向开放/公共工具链',
  },
  'policy-clampdown-shift-open-tooling.flavor': {
    en: 'You move toward the edges where the rules are still negotiable.',
    zh: '你转向那些规则仍有谈判空间的边缘地带。',
  },
  'policy-clampdown-shadow-prompt-society.label': {
    en: 'Start a shadow prompt society',
    zh: '成立一个地下提示词社团',
  },
  'policy-clampdown-shadow-prompt-society.flavor': {
    en: 'The meetings are discreet, unserious, and increasingly influential.',
    zh: '这些聚会低调、嬉笑，却越来越有影响力。',
  },

  'weird-niche-tool-actually-finds-users.title': {
    en: 'Weird Niche Tool Actually Finds Users',
    zh: '奇怪的小众工具居然真的找到用户',
  },
  'weird-niche-tool-actually-finds-users.description': {
    en: 'A bizarre tool built for a tiny audience suddenly finds devoted users. It does not dominate the market, but the people who love it really love it.',
    zh: '一个为极小众人群打造的古怪工具突然找到了忠实用户。它没有统治市场，但喜欢它的人真的非常喜欢。',
  },
  'niche-tool-double-down.label': {
    en: 'Double down on the niche',
    zh: '继续深耕这个小众方向',
  },
  'niche-tool-double-down.flavor': {
    en: 'You lean into specificity and discover that small audiences can feel real.',
    zh: '你更加专注于具体人群，并发现小型受众也可以非常真实而有力量。',
  },
  'niche-tool-generalize-mass-market.label': {
    en: 'Generalize it for the mass market',
    zh: '把它泛化成大众市场产品',
  },
  'niche-tool-generalize-mass-market.flavor': {
    en: 'You smooth out the strange edges and gain broader traction.',
    zh: '你磨平了那些古怪的棱角，也因此获得了更广泛的增长。',
  },
  'niche-tool-turn-into-art-project.label': {
    en: 'Refuse scale and turn it into an art project',
    zh: '拒绝规模化，把它变成艺术项目',
  },
  'niche-tool-turn-into-art-project.flavor': {
    en: 'You protect the soul of the thing, even if that makes growth awkward.',
    zh: '你守住了这个东西的灵魂，即使那会让增长变得尴尬。',
  },

  'model-starts-giving-unreasonably-good-advice.title': {
    en: 'A Model Starts Giving You Unreasonably Good Advice',
    zh: '一个模型开始给你离谱地靠谱的建议',
  },
  'model-starts-giving-unreasonably-good-advice.description': {
    en: 'A model you are testing starts producing strategic advice that is oddly specific, unusually helpful, and a little too confident about your future.',
    zh: '你正在测试的一个模型开始给出异常具体、异常有用，而且对你未来过度自信的战略建议。',
  },
  'model-advice-use-carefully.label': {
    en: 'Use it carefully as a brainstorming partner',
    zh: '谨慎地把它当作头脑风暴伙伴',
  },
  'model-advice-use-carefully.flavor': {
    en: 'You treat it as a tool, while quietly wondering whether it knows more than it should.',
    zh: '你把它当作工具使用，同时暗自怀疑它是不是知道得太多了。',
  },
  'model-advice-trust-too-much.label': {
    en: 'Trust it too much and reorganize your life',
    zh: '过度相信它，并据此重组人生',
  },
  'model-advice-trust-too-much.flavor': {
    en: 'You let the confidence of the machine substitute for certainty of your own.',
    zh: '你让机器的自信，替代了你自己的确定感。',
  },
  'model-advice-performance-art-destiny.label': {
    en: 'Ask it to design your destiny as performance art',
    zh: '让它把你的人生设计成一场行为艺术',
  },
  'model-advice-performance-art-destiny.flavor': {
    en: 'The line between planning and ritual dissolves completely.',
    zh: '规划与仪式之间的界线彻底消失了。',
  },
};

const ENDING_TEXT: Record<EndingId, LocalizedText & { summaryEn: string; summaryZh: string }> = {
  quiet_specialist: {
    en: 'Quiet Specialist',
    zh: '安静的专家',
    summaryEn:
      'You learned deeply, moved carefully, and built durable value in the background.',
    summaryZh: '你深入学习，谨慎行动，并在幕后建立了持久的价值。',
  },
  stable_generalist: {
    en: 'Stable Generalist',
    zh: '稳定的通才',
    summaryEn:
      'You stayed adaptable, balanced, and hard to knock over in a noisy era.',
    summaryZh: '你在喧闹的时代里保持了适应性、平衡感和稳定性。',
  },
  chaotic_innovator: {
    en: 'Chaotic Innovator',
    zh: '混乱创新者',
    summaryEn:
      'You turned uncertainty into momentum and made the mess part of the method.',
    summaryZh: '你把不确定性变成了动能，让混乱本身成为方法的一部分。',
  },
  connected_builder: {
    en: 'Connected Builder',
    zh: '连接型建设者',
    summaryEn:
      'You kept showing up, stayed useful, and became the person others call first.',
    summaryZh: '你持续出现、持续有用，并最终成为别人第一个想到的人。',
  },
  delightfully_strange_person: {
    en: 'Delightfully Strange Person',
    zh: '可爱又古怪的人',
    summaryEn:
      'You followed the weird signal and built a life that fits no template.',
    summaryZh: '你追随那些奇怪的信号，活成了一种不属于任何模板的人生。',
  },
  ai_generated: {
    en: 'AI Ending',
    zh: 'AI 结局',
    summaryEn: 'Generated by AI.',
    summaryZh: '由 AI 生成。',
  },
};

export function translate(locale: Locale, key: string): string {
  const value = UI_TEXT[key] ?? EVENT_TEXT[key];

  if (!value) {
    return key;
  }

  return value[locale];
}

export function getLocalizedEventText(
  locale: Locale,
  eventId: string,
  field: 'title' | 'description',
  fallback: string,
): string {
  return EVENT_TEXT[`${eventId}.${field}`]?.[locale] ?? fallback;
}

export function getLocalizedActionText(
  locale: Locale,
  actionId: string,
  field: 'label' | 'flavor',
  fallback: string,
): string {
  return EVENT_TEXT[`${actionId}.${field}`]?.[locale] ?? fallback;
}

export function getLocalizedActionType(locale: Locale, type: ActionType): string {
  return translate(locale, type);
}

export function getLocalizedEnding(
  locale: Locale,
  endingId: EndingId,
  fallbackTitle: string,
  fallbackSummary: string,
): { title: string; summary: string } {
  if (endingId === 'ai_generated') {
    return { title: fallbackTitle, summary: fallbackSummary };
  }

  const entry = ENDING_TEXT[endingId];

  if (!entry) {
    return { title: fallbackTitle, summary: fallbackSummary };
  }

  return {
    title: entry[locale],
    summary: locale === 'zh' ? entry.summaryZh : entry.summaryEn,
  };
}

function findEventById(eventId: string) {
  return STARTER_EVENTS.find((event) => event.id === eventId);
}

export function getLocalizedHistoryEntry(
  locale: Locale,
  entry: HistoryEntry,
): {
  eventTitle: string;
  actionLabel: string;
  resultText: string;
  missedPathsText: string[];
  metaText: string;
} {
  const event = findEventById(entry.eventId);
  const action = event?.actions.find((candidate) => candidate.id === entry.actionId);
  const eventTitle = event
    ? getLocalizedEventText(locale, event.id, 'title', entry.eventTitle)
    : entry.eventTitle;
  const actionLabel = action
    ? getLocalizedActionText(locale, action.id, 'label', entry.actionLabel)
    : entry.actionLabel;
  const actionType = action?.type ?? 'safe';

  const resultText =
    locale === 'zh'
      ? `你在“${eventTitle}”中选择了${getLocalizedActionType(locale, actionType)}选项“${actionLabel}”。`
      : `You chose the ${getLocalizedActionType(locale, actionType).toLowerCase()} option "${actionLabel}" from "${eventTitle}".`;

  const missedPathsText =
    event?.actions
      .filter((candidate) => candidate.id !== entry.actionId)
      .map((candidate) => {
        const label = getLocalizedActionText(locale, candidate.id, 'label', candidate.label);
        const typeLabel = getLocalizedActionType(locale, candidate.type);

        return locale === 'zh'
          ? `你没有选择${typeLabel}选项“${label}”。`
          : `You did not choose the ${typeLabel.toLowerCase()} option "${label}".`;
      }) ?? entry.missedPathsText;

  const metaText =
    locale === 'zh'
      ? `第 ${entry.turn} 回合 • ${eventTitle} • ${actionLabel}`
      : `Turn ${entry.turn} • ${eventTitle} • ${actionLabel}`;

  return {
    eventTitle,
    actionLabel,
    resultText,
    missedPathsText,
    metaText,
  };
}
