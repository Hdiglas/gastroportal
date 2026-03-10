/**
 * Helper to get translated text from template or step.
 * Falls back to base text if translation not found.
 */
export function getTranslatedName(
  translationsJson: string,
  baseName: string,
  lang: string
): string {
  if (!translationsJson) return baseName;
  try {
    const t = JSON.parse(translationsJson) as Record<string, { name?: string } | string>;
    const entry = t[lang];
    if (entry && typeof entry === "object" && entry.name) return entry.name;
    if (typeof entry === "string") return entry;
  } catch {
    /* ignore */
  }
  return baseName;
}

export function getTranslatedStepText(
  translationsJson: string,
  baseText: string,
  lang: string
): string {
  if (!translationsJson) return baseText;
  try {
    const t = JSON.parse(translationsJson) as Record<string, string>;
    const val = t[lang];
    if (typeof val === "string") return val;
  } catch {
    /* ignore */
  }
  return baseText;
}
