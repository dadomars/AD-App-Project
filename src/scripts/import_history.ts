// pwa/scripts/import_history.ts
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getMongoClient } from "@/lib/db";

type AnyObj = Record<string, any>;

async function run() {
  const client = await getMongoClient();
  const db = client.db();

  const dataDir = join(process.cwd(), "data");
  const recPath = join(dataDir, "recovery_log.json");
  const sesPath = join(dataDir, "session_log.json");

  const rec = JSON.parse(readFileSync(recPath, "utf8")) as AnyObj[] | AnyObj;
  const ses = JSON.parse(readFileSync(sesPath, "utf8")) as AnyObj[] | AnyObj;

  const recArr = Array.isArray(rec) ? rec : Object.values(rec);
  const sesArr = Array.isArray(ses) ? ses : Object.values(ses);

  if (recArr.length) {
    await db.collection("entries_recovery").insertMany(recArr, { ordered: false });
    console.log(`Imported recovery: ${recArr.length}`);
  }
  if (sesArr.length) {
    await db.collection("entries_session").insertMany(sesArr, { ordered: false });
    console.log(`Imported sessions: ${sesArr.length}`);
  }

  await client.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
