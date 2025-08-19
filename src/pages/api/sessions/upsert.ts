// pwa/pages/api/session/upsert.ts
import type { NextApiRequest, NextApiResponse } from "next";
import getMongoClient from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const body = req.body || {};
  const { _id, date, type = "Corsa", runMetrics, blocks, notes, source = "manual", status = "saved", calories_equivalent } = body;
  if (!date || !type) return res.status(400).json({ ok: false, error: "Missing date/type" });

  const client = await getMongoClient();
  const db = client.db();
  const col = db.collection("entries_session");
  const { ObjectId } = await import("mongodb");

  const now = new Date();
  let entry;

  if (_id) {
    await col.updateOne(
      { _id: new ObjectId(_id) },
      { $set: { date, type, runMetrics, blocks, notes, source, status, calories_equivalent, updatedAt: now } }
    );
    entry = await col.findOne({ _id: new ObjectId(_id) });
  } else {
    const { insertedId } = await col.insertOne({ date, type, runMetrics, blocks, notes, source, status, calories_equivalent, createdAt: now, updatedAt: now });
    entry = await col.findOne({ _id: insertedId });
  }

  return res.json({ ok: true, entry });
}
