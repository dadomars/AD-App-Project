import type { NextApiRequest, NextApiResponse } from "next";
import getMongoClient from "../../../lib/db";

function normalizeRecovery(body: any) {
  const fields = body.fields || {};

  // alias/normalizzazioni principali
  if (fields.sleep_hours && !fields.sleep_duration) fields.sleep_duration = fields.sleep_hours;
  if (fields.muscle_soreness && !fields.doms) fields.doms = fields.muscle_soreness;
  if (fields.hrv && !fields.hrv_ms) fields.hrv_ms = fields.hrv;

  return {
    _id: body._id,
    athleteId: body.athleteId || null,
    date: body.date,                     // YYYY-MM-DD
    source: body.source || "manual",     // manual | garmin
    status: body.status || "saved",      // saved | pending
    screenshotUrl: body.screenshotUrl || null,
    fields,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const data = normalizeRecovery(req.body || {});
  if (!data.date) return res.status(400).json({ ok:false, error:"Missing date" });

  const client = await getMongoClient();
  const db = client.db();
  const col = db.collection("entries_recovery");
  const { ObjectId } = await import("mongodb");

  const now = new Date();
  let entry;

  if (data._id) {
    await col.updateOne(
      { _id: new ObjectId(data._id) },
      { $set: {
          athleteId: data.athleteId, date: data.date, source: data.source,
          status: data.status, screenshotUrl: data.screenshotUrl,
          fields: data.fields, updatedAt: now
      } }
    );
    entry = await col.findOne({ _id: new ObjectId(data._id) });
  } else {
    const { insertedId } = await col.insertOne({
      athleteId: data.athleteId, date: data.date, source: data.source,
      status: data.status, screenshotUrl: data.screenshotUrl,
      fields: data.fields, chosen: false, createdAt: now, updatedAt: now
    });
    entry = await col.findOne({ _id: insertedId });
  }

  return res.json({ ok:true, entry });
}
