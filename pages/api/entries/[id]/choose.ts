// pwa/pages/api/entries/[id]/choose.ts
import type { NextApiRequest, NextApiResponse } from "next";
import getMongoClient from "../../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { id } = req.query;
  const { ObjectId } = await import("mongodb");
  if (!id || Array.isArray(id)) return res.status(400).json({ ok:false, error:"Missing id" });

  const client = await getMongoClient();
  const db = client.db();
  const col = db.collection("entries");

  // prendo l'entry selezionata
  const chosen = await col.findOne({ _id: new ObjectId(id) });
  if (!chosen) return res.status(404).json({ ok:false, error:"Entry not found" });

  // 1) set chosen=true su quella selezionata
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { chosen: true, status: "saved", updatedAt: new Date() } });

  // 2) elimina tutte le "pending" della stessa giornata/atleta (tranne la scelta)
  await col.deleteMany({
    _id: { $ne: new ObjectId(id) },
    athleteId: chosen.athleteId,
    date: chosen.date,
    status: "pending"
  });

  // 3) opzionale: set chosen=false alle altre non-pending dello stesso giorno
  await col.updateMany(
    { _id: { $ne: new ObjectId(id) }, athleteId: chosen.athleteId, date: chosen.date, chosen: true },
    { $set: { chosen: false } }
  );

  const updated = await col.findOne({ _id: new ObjectId(id) });
  return res.json({ ok:true, entry: updated });
}
