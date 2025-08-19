// pwa/pages/api/upload/screenshot.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Busboy from "busboy";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { pipeline } from "node:stream/promises";

export const config = { api: { bodyParser: false } }; // <-- IMPORTANTISSIMO
const MAX_BYTES = 20 * 1024 * 1024; // 20MB

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("ctype:", req.headers["content-type"]);

  if (req.method !== "POST") return res.status(405).end();

  await new Promise<void>((resolve) => {
    const bb = Busboy({
      headers: req.headers as any,
      limits: { files: 1, fileSize: MAX_BYTES },
    });

    const tasks: Promise<void>[] = [];
    let savedUrl = "";
    let aborted = false;

    req.on("aborted", () => {
      aborted = true;
      try { bb.destroy(); } catch {}
      resolve();
    });

    bb.on("file", (_field, file, info) => {
      const mime = (info as any).mimeType || (info as any).mimetype || "";
      if (!mime.startsWith("image/")) { file.resume(); return; }

      const now = new Date();
      const year = String(now.getFullYear());
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const dir = path.join(process.cwd(), "public", "uploads", year, month);

      const base = (info.filename || `file_${Date.now()}`).replace(/[^\w.\-]/g, "_");
      const outName = `${Date.now()}_${base}`;
      const outPath = path.join(dir, outName);

      // Setto l’URL SUBITO per evitare la race col "finish"
      savedUrl = `/uploads/${year}/${month}/${outName}`;

      tasks.push(
        (async () => {
          await fsp.mkdir(dir, { recursive: true });
          const write = fs.createWriteStream(outPath);
          await pipeline(file, write); // attende il flush su disco
        })()
      );

      file.on("limit", () => {
        if (!aborted) res.status(413).json({ ok: false, error: "File too large (max 20MB)" });
        aborted = true;
      });
    });

    bb.on("error", (err: unknown) => {
      if (!aborted) res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
      resolve();
    });

    bb.on("finish", async () => {
      if (aborted) return resolve();
      try {
        await Promise.all(tasks); // assicura che il file sia scritto
        if (!savedUrl) res.status(400).json({ ok: false, error: "No file received" });
        else res.status(200).json({ ok: true, url: savedUrl });
      } catch (e) {
        res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
      }
      resolve();
    });

    req.pipe(bb);
  });
}
