import type { NextApiRequest, NextApiResponse } from "next";
import { getMongoClient } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const { date, athleteId } = req.query;
  if (!date || Array.isArray(date)) return res.status(400).json({ ok:false, error:"Missing date" });

  const client = await getMongoClient();
  const db = client.db();
  const col = db.collection("entries_recovery");

  const q: any = { date };
  if (athleteId && !Array.isArray(athleteId)) q.athleteId = athleteId;

  const entries = await col.find(q).sort({ chosen:-1, updatedAt:-1 }).toArray();
  return res.json({ ok:true, entries });
}
