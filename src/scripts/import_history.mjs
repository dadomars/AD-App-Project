import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });  // <-- forza l’uso della tua .env.local

async function getMongoClient() {
  const { MongoClient } = await import("mongodb");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");
  const client = new MongoClient(uri, {});
  return client.connect();
}

function readJSON(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

(async () => {
  const client = await getMongoClient();
  const db = client.db();
  const dataDir = path.join(process.cwd(), "data");

  // Recovery
  const rec = readJSON(path.join(dataDir, "recovery_log.json"));
  if (Array.isArray(rec)) {
    const col = db.collection("entries_recovery");
    const docs = rec.map((r) => {
      const fields = r.fields || r;
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
        updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
      };
    });
    if (docs.length) await col.insertMany(docs, { ordered: false });
    console.log("Imported recovery:", docs.length);
  }

  // Sessions
  const ses = readJSON(path.join(dataDir, "session_log.json"));
  if (Array.isArray(ses)) {
    const col = db.collection("entries_session");
    const docs = ses.map((s) => ({
      date: s.date,
      type: s.type || "Corsa",
      runMetrics: s.runMetrics || undefined,
      blocks: s.blocks || undefined,
      notes: s.notes || null,
      source: s.source || "manual",
      status: s.status || "saved",
      calories_equivalent: s.calories_equivalent ?? null,
      createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
      updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
    }));
    if (docs.length) await col.insertMany(docs, { ordered: false });
    console.log("Imported sessions:", docs.length);
  }

  await client.close();
  console.log("Done.");
})();
