import type { NextApiRequest, NextApiResponse } from "next";
import getMongoClient from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { _id, date, athleteId } = req.body || {};
  if (!_id || !date) return res.status(400).json({ ok:false, error:"Missing _id/date" });

  const client = await getMongoClient();
  const db = client.db();
  const col = db.collection("entries_recovery");
  const { ObjectId } = await import("mongodb");

  const key = { date, ...(athleteId ? { athleteId } : {}) };
  const chosenId = new ObjectId(_id);

  // 1) set chosen=true su questa
  await col.updateOne({ _id: chosenId }, { $set: { chosen: true, status: "saved", updatedAt: new Date() } });

  // 2) purge pending della stessa data (alternative non scelte)
  await col.deleteMany({ _id: { $ne: chosenId }, ...key, status: "pending" });

  // 3) togli chosen da eventuali altre scelte della stessa data
  await col.updateMany({ _id: { $ne: chosenId }, ...key, chosen: true }, { $set: { chosen: false } });

  const entry = await col.findOne({ _id: chosenId });
  return res.json({ ok:true, entry });
}
