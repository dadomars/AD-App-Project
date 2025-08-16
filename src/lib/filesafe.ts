// src/lib/filesafe.ts

import { etagForContent } from "./manifest";
import fs from "fs";
import path from "path";

export function readJsonFileSafe(filePath: string) {
  if (!fs.existsSync(filePath)) return { obj: {}, etag: etagForContent("") };

  const buf = fs.readFileSync(filePath);
  const etag = etagForContent(buf);

  // Gestione BOM + spazi: se, tolti BOM/whitespace, è vuoto → {}.
  let text = buf.toString("utf-8");
  text = text.replace(/^\uFEFF/, ""); // rimuove BOM
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { obj: {}, etag };
  }

  try {
    const obj = JSON.parse(trimmed);
    return { obj, etag };
  } catch (e) {
    // In dev preferiamo non esplodere: consideriamo vuoto e lasciamo loggare l’errore
    console.warn(`[filesafe] JSON non valido in ${filePath}. Uso {} in fallback.`, (e as any)?.message);
    return { obj: {}, etag };
  }
}

// …eventuali altre funzioni qui sopra…

export async function atomicWriteJsonWithBackup(
  filePath: string,
  obj: any,
  opts?: string | { ifMatch?: string | null; versionsDir?: string }
): Promise<string> {
  let ifMatch: string | undefined;
  let versionsDir: string | undefined;

  // compat vecchia firma: 3° argomento era una stringa (ifMatch)
  if (typeof opts === "string") {
    ifMatch = opts || undefined;
  } else if (opts && typeof opts === "object") {
    ifMatch = (opts.ifMatch ?? undefined) || undefined;
    versionsDir = opts.versionsDir || undefined;
  }

  // scriviamo su file atomico
  const tmp = filePath + ".tmp";
  const payload = Buffer.from(JSON.stringify(obj, null, 2), "utf-8");

  fs.writeFileSync(tmp, payload);
  fs.renameSync(tmp, filePath);

  // crea versione (se richiesto)
  if (versionsDir) {
    try {
      if (!fs.existsSync(versionsDir)) {
        fs.mkdirSync(versionsDir, { recursive: true });
      }
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const base = path.basename(filePath);
      const backupPath = path.join(versionsDir, `${base}.${ts}.json`);
      fs.writeFileSync(backupPath, payload);
    } catch (e) {
      // non bloccare il flusso se il backup fallisce; logga e continua
      console.error("[filesafe] Backup error:", e);
    }
  }

  return etagForContent(payload);
}
