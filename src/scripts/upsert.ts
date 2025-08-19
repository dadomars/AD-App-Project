// pwa/src/scripts/upsert.ts
import getMongoClient from "@/lib/db";

export async function upsert(body: any) {
  const { _id, date, type = "Corsa", runMetrics, blocks, notes, source = "manual", status = "saved", calories_equivalent } = body;
  if (!date || !type) throw new Error("Missing date/type");

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
    const { insertedId } = await col.insertOne({ date, type, runMetrics, blocks, notes, source, status, calories_equivalent, createdAt: now });
    entry = await col.findOne({ _id: insertedId });
  }

  return entry;
}
