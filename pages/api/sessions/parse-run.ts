// pwa/pages/api/session/parse-run.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Busboy from "busboy";
import { parseTcx, parseGarminCsv } from "../../../lib/runParsers";

export const config = { api: { bodyParser: false } };
const MAX_BYTES = 20 * 1024 * 1024;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const busboy = Busboy({ headers: req.headers, limits: { fileSize: MAX_BYTES, files: 1 } });
  let fileBufs: Buffer[] = [];
  let original = "";

  busboy.on("file", (_field, file, info) => {
    original = (info.filename || `file_${Date.now()}`).replace(/[^\w.\-]/g, "_");
    file.on("data", (d: Buffer) => fileBufs.push(d));
    file.on("limit", () => res.status(413).json({ ok: false, error: "File too large (max 20MB)" }));
  });

  busboy.on("close", () => {
    if (!fileBufs.length) return res.status(400).json({ ok: false, error: "No file received" });

    const buffer = Buffer.concat(fileBufs as Uint8Array[]);
    const lc = original.toLowerCase();

    try {
      const runMetrics =
        lc.endsWith(".tcx") || buffer.slice(0, 200).toString("utf8").includes("<TrainingCenterDatabase")
          ? parseTcx(buffer)
          : lc.endsWith(".csv")
          ? parseGarminCsv(buffer)
          : null;

      if (!runMetrics) return res.status(400).json({ ok: false, error: "Unsupported file (TCX/CSV only)" });
      return res.json({ ok: true, runMetrics, original });
    } catch (e: unknown) {
      const msg = (e && typeof e === "object" && "message" in e) ? String((e as any).message) : String(e);
      return res.status(500).json({ ok: false, error: msg });
    }
  });

  busboy.on("error", (err: unknown) => {
    const msg = (err && typeof err === "object" && "message" in err) ? String((err as any).message) : String(err);
    return res.status(500).json({ ok: false, error: msg });
  });

  req.pipe(busboy);
}
