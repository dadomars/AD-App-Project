import { NextRequest, NextResponse } from "next/server";
import { getMongoClient } from "@/lib/db";
import { RecoveryPayloadSchema } from "@/schemas/recovery";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RecoveryPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    }
    const payload = parsed.data;

    const client = await getMongoClient();
    const db = client.db("adapp");
    const col = db.collection("entries_recovery");

    // upsert per (date) — una sola "chosen" per data
    if (payload.status === "chosen") {
      await col.updateMany({ date: payload.date, status: "chosen" }, { $set: { status: "pending" } });
    }

    const res = await col.findOneAndUpdate(
      { date: payload.date },                      // chiave naturale: date
      { $set: { ...payload, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, returnDocument: "after" }
    );

    return NextResponse.json({ ok: true, data: res });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
