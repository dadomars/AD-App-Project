// src/lib/manifest.ts
import crypto from "node:crypto";
import { MANIFEST_PATH, STORAGE_ROOT } from "./config";
import fs from "node:fs";
import path from "node:path";

export type ManifestFile = {
  name: string;
  path: string;
  write_policy?: "patch_only_with_approval" | "read_only" | "draft_direct";
  write_via?: string;
};

export type ProjectManifest = {
  project: { root: string };
  files: ManifestFile[];
  backups?: {
    file_versions?: { enabled?: boolean; dir?: string; keep_last?: number };
    snapshots?: { enabled?: boolean; dir?: string; schedule_local?: string; retention_days?: number };
  };
};

function canonicalFromManifestPath(p: string) {
  // Se il file non esiste ancora, canonizziamo la CARTELLA e poi aggiungiamo il basename.
  const resolved = path.resolve(p);
  const dir = path.dirname(resolved);
  const base = path.basename(resolved);
  let dirCanon = dir;
  try {
    // native su Win gestisce meglio i casi particolari; fallback per altri ambienti
    dirCanon = (fs.realpathSync.native ?? fs.realpathSync)(dir);
  } catch {
    // se la cartella non esiste ancora, usiamo il resolved così com’è
  }
  return path.join(dirCanon, base);
}

export function resolveFromManifest(manifest: ProjectManifest, filename: string) {
  const entry = getFileEntry(manifest, filename);
  if (!entry?.path) throw new Error("File non autorizzato o non presente nel manifest");
  return canonicalFromManifestPath(entry.path);
}

export function resolveOnStorage_STRICT(p: string) {
  const full = canonicalFromManifestPath(p);
  const root = canonicalFromManifestPath(STORAGE_ROOT);


const norm = (s: string) => path.win32.normalize(s).replace(/\\+$/,"").toLowerCase();
  const f = norm(full);
  const r = norm(root);
  const inside = f === r || f.startsWith(r + "\\");
  if (!inside) throw new Error(`Path fuori dallo STORAGE_ROOT: ${full} !~ ${root}`);
  return full;
}

export function readManifest(): ProjectManifest {
  const raw = fs.readFileSync(MANIFEST_PATH, "utf-8");
  const m = JSON.parse(raw);
  return m;
}

export function getFileEntry(manifest: ProjectManifest, filename: string): ManifestFile | undefined {
  return manifest.files.find(f => f.name === filename);
}

export function resolveOnStorage(p: string) {
  // Risolvi assoluti e normalizza (Windows-safe)
  const pathWin = require("node:path").win32 as typeof import("node:path");
  const norm = (s: string) => pathWin.normalize(s).replace(/\\+$/g, "").toLowerCase();

  const full = norm(require("node:path").resolve(p));
  const root = norm(require("node:path").resolve(STORAGE_ROOT));

  // Consenti root stessa o file/sottocartelle nella root (separatore '\')
  const isInside = full === root || full.startsWith(root + "\\");
  if (!isInside) {
    throw new Error(`Path fuori dallo STORAGE_ROOT: ${full} !~ ${root}`);
  }
  return require("node:path").resolve(p);
}


export function etagForContent(buf: Buffer | string) {
  const h = crypto.createHash("sha256").update(buf).digest("hex");
  return `"${h}"`;
}
