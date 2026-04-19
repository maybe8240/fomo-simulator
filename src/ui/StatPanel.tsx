import type { GameState } from '../engine/types';
import { translate } from '../i18n';
import type { Locale } from '../i18n';

type StatPanelProps = {
  gameState: GameState;
  locale: Locale;
};

const PLAYER_STAT_LABELS = [
  ['money', 'Money'],
  ['skill_ai', 'AI Skill'],
  ['network', 'Network'],
  ['energy', 'Energy'],
  ['curiosity', 'Curiosity'],
  ['chaos', 'Chaos'],
] as const;

const WORLD_STAT_LABELS = [
  ['ai_hype', 'AI Hype'],
  ['economy', 'Economy'],
  ['turn', 'Turn'],
] as const;

function StatPanel({ gameState, locale }: StatPanelProps) {
  const { player, world } = gameState;

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{translate(locale, 'current_stats')}</h2>
      </div>

      <div className="stats-grid">
        <div>
          <h3>{translate(locale, 'player')}</h3>
          <dl className="stat-list">
            {PLAYER_STAT_LABELS.map(([key, label]) => (
              <div className="stat-row" key={key}>
                <dt>{translate(locale, key) ?? label}</dt>
                <dd>{player[key]}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <h3>{translate(locale, 'world')}</h3>
          <dl className="stat-list">
            {WORLD_STAT_LABELS.map(([key, label]) => (
              <div className="stat-row" key={key}>
                <dt>{translate(locale, key) ?? label}</dt>
                <dd>{world[key]}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export default StatPanel;
