import type { NextApiRequest, NextApiResponse } from "next";
import getMongoClient from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { _id, athleteId, date, source, fields = {}, status = "saved", screenshotUrl } = req.body || {};
  if (!athleteId || !date || !source) {
    return res.status(400).json({ ok:false, error:"Missing athleteId/date/source" });
  }

  const client = await getMongoClient();
  const db = client.db();
  const col = db.collection("entries");
  const { ObjectId } = await import("mongodb");

  const now = new Date();
  let entry: any;

  if (_id) {
    await col.updateOne(
      { _id: new ObjectId(_id) },
      { $set: { athleteId, date, source, fields, status, screenshotUrl, updatedAt: now } }
    );
    entry = await col.findOne({ _id: new ObjectId(_id) });
  } else {
    const { insertedId } = await col.insertOne({
      athleteId, date, source, fields, status,
      screenshotUrl: screenshotUrl || null,
      chosen: false, createdAt: now, updatedAt: now
    });
    entry = await col.findOne({ _id: insertedId });
  }

  return res.json({ ok:true, entry });
}
