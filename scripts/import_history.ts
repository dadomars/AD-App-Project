// ts-node non necessario: compila on-the-fly con NodeNext usando tsconfig corrente
import { config } from "dotenv";
config({ path: ".env.local" });
import * as fs from "node:fs";
import * as path from "node:path";
import "dotenv/config";
import getMongoClient from "../lib/db";

async function run() {
  const client = await getMongoClient();
  const db = client.db();

  const dataDir = path.join(process.cwd(), "data");

  const recPath = path.join(dataDir, "recovery_log.json");
  const sesPath = path.join(dataDir, "session_log.json");

  if (fs.existsSync(recPath)) {
    const recovery = JSON.parse(fs.readFileSync(recPath, "utf8"));
    if (Array.isArray(recovery)) {
      const col = db.collection("entries_recovery");
      // normalizzazione minima alias
      const docs = recovery.map((r:any) => {
        const fields = r.fields || r; // se il formato storico è piatto
        if (fields.sleep_hours && !fields.sleep_duration) fields.sleep_duration = fields.sleep_hours;
        if (fields.muscle_soreness && !fields.doms) fields.doms = fields.muscle_soreness;
        if (fields.hrv && !fields.hrv_ms) fields.hrv_ms = fields.hrv;
        return {
          athleteId: r.athleteId || null,
          date: r.date,
          source: r.source || "manual",
          status: r.status || "saved",
          screenshotUrl: r.screenshotUrl || null,
          fields,
          chosen: !!r.chosen,
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
          updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date()
        };
      });
      await col.insertMany(docs, { ordered: false });
      console.log(`Imported recovery: ${docs.length}`);
    }
  }

  if (fs.existsSync(sesPath)) {
    const sessions = JSON.parse(fs.readFileSync(sesPath, "utf8"));
    if (Array.isArray(sessions)) {
      const col = db.collection("entries_session");
      const docs = sessions.map((s:any) => ({
        date: s.date,
        type: s.type || "Corsa",
        runMetrics: s.runMetrics || undefined,
        blocks: s.blocks || undefined,
        notes: s.notes || null,
        source: s.source || "manual",
        status: s.status || "saved",
        calories_equivalent: s.calories_equivalent ?? null,
        createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
        updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date()
      }));
      await col.insertMany(docs, { ordered: false });
      console.log(`Imported sessions: ${docs.length}`);
    }
  }

  console.log("Done.");
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
