import { PLAYER_STAT_KEYS, WORLD_STAT_KEYS } from '../engine/types';
import type { Ending, GameState } from '../engine/types';
import { getLocalizedEnding, getLocalizedHistoryEntry, translate } from '../i18n';
import type { Locale } from '../i18n';

// Draw a dedicated recap rather than capturing development-only controls or
// relying on the viewport height. All content stays on the player's device.
export async function createRunImage(state: GameState, ending: Ending, locale: Locale): Promise<File> {
  await document.fonts?.ready;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  const width = 1000;
  const padding = 56;
  const lines: { text: string; y: number; heading: boolean }[] = [];
  let y = padding;
  const font = (heading: boolean) => `${heading ? 'bold 30' : '24'}px system-ui, sans-serif`;
  function text(value: string, heading = false) {
    context!.font = font(heading);
    for (const paragraph of value.split('\n')) {
      let line = '';
      // Wrap at word boundaries, splitting long URLs/words and Chinese as needed.
      const words = paragraph.match(/\s+|[\p{Script=Han}]|[^\s\p{Script=Han}]+/gu) ?? [''];
      for (const word of words) {
        if (context!.measureText(line + word).width > width - padding * 2 && line.trim()) {
          lines.push({ text: line.trimEnd(), y, heading }); y += 38; line = '';
        }
        for (const character of word) {
          if (context!.measureText(line + character).width > width - padding * 2) {
            lines.push({ text: line, y, heading }); y += 38; line = '';
          }
          line += character;
        }
      }
      lines.push({ text: line.trimEnd(), y, heading }); y += 38;
    }
    y += heading ? 16 : 10;
  }
  const localized = getLocalizedEnding(locale, ending.id, ending.title, ending.summary, state);
  text(translate(locale, 'app_title'), true);
  text(translate(locale, 'app_subtitle'));
  text(translate(locale, 'ending'), true);
  text(localized.title, true);
  text(localized.summary);
  text(translate(locale, 'final_stats'), true);
  for (const key of PLAYER_STAT_KEYS) text(`${translate(locale, key)}: ${state.player[key]} / 100`);
  for (const key of WORLD_STAT_KEYS) text(`${translate(locale, key)}: ${state.world[key]} / 100`);
  text(translate(locale, 'history_log'), true);
  for (const entry of state.history) {
    const item = getLocalizedHistoryEntry(locale, entry);
    text(item.metaText, true);
    text(item.eventDescription);
    text(item.chosenText);
    y += 16;
  }
  // Keep unusually long saved runs within common canvas dimension limits.
  const scale = Math.min(1, 16000 / (y + padding));
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil((y + padding) * scale);
  context.scale(scale, scale);
  context.fillStyle = '#f8fafc';
  context.fillRect(0, 0, width, y + padding);
  context.textBaseline = 'top';
  for (const line of lines) {
    context.font = font(line.heading);
    context.fillStyle = line.heading ? '#1d4ed8' : '#1f2937';
    context.fillText(line.text, padding, line.y);
  }
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
    value => value ? resolve(value) : reject(new Error('Image creation failed')), 'image/png',
  ));
  return new File([blob], 'fomo-simulator-run.png', { type: 'image/png' });
}

export function downloadRunImage(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
