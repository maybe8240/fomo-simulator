// Read only the narrative string in the documented JSON prefix. Never expose raw
// JSON, choices, or partial escapes; final gameplay data is validated separately.
export function narrativePreview(snapshot: string): string {
  const match = snapshot.match(/^\s*(?:```json\s*)?\{\s*"(?:event_title|title)"\s*:\s*"(?:[^"\\]|\\.)*"\s*,\s*"(?:description|summary)"\s*:\s*"((?:[^"\\]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*)/);
  if (!match) return '';
  try {
    return (JSON.parse('"' + match[1] + '"') as string).slice(0, 8000).replace(/[\uD800-\uDBFF]$/, '');
  } catch { return ''; }
}
