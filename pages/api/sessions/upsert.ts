import type { NextApiRequest, NextApiResponse } from "next";
import getMongoClient from "../../../lib/db";

function normalizeSession(body: any) {
  const { date, type } = body;
  const blocks = Array.isArray(body.blocks) ? body.blocks : undefined;

  // per corsa: manteniamo tutte le metriche se presenti
  const run = body.runMetrics || {}; // opzionale: duration_min, distance_km, avg_pace_min_km, avg_hr_bpm, zones_hr ...

  return {
    _id: body._id,
    date, type, blocks, runMetrics: run,
    notes: body.notes || null,
    calories_equivalent: body.calories_equivalent ?? null,
    source: body.source || "manual",
    status: body.status || "saved",
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const data = normalizeSession(req.body || {});
  if (!data.date || !data.type) return res.status(400).json({ ok:false, error:"Missing date/type" });

  const client = await getMongoClient();
  const db = client.db();
  const col = db.collection("entries_session");
  const { ObjectId } = await import("mongodb");

  const now = new Date();
  let entry;

  if (data._id) {
    await col.updateOne(
      { _id: new ObjectId(data._id) },
      { $set: { ...data, updatedAt: now } }
    );
    entry = await col.findOne({ _id: new ObjectId(data._id) });
  } else {
    const { insertedId } = await col.insertOne({ ...data, createdAt: now, updatedAt: now });
    entry = await col.findOne({ _id: insertedId });
  }

  return res.json({ ok:true, entry });
}
