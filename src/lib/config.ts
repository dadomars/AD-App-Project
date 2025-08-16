// src/lib/config.ts
export const STORAGE_ROOT = process.env.AD_STORAGE_ROOT!;
export const MANIFEST_PATH = process.env.AD_MANIFEST!;
if (!STORAGE_ROOT || !MANIFEST_PATH) {
  throw new Error("Config mancante: AD_STORAGE_ROOT o AD_MANIFEST non impostati in .env.local");
}
