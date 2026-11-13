export const MAX_NAME_LENGTH = 40;

/** Trim and collapse whitespace; keeps the display form of the name. */
export function cleanName(raw: string): string {
  return String(raw ?? "")
    .normalize("NFKC")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalised key used for duplicate detection: case-insensitive and
 * Arabic-aware (diacritics, tatweel, alef/yaa variants are unified).
 */
export function nameKey(raw: string): string {
  return cleanName(raw)
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}
