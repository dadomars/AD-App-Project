import { NextRequest, NextResponse } from "next/server";
import { getMongoClient } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const skip = parseInt(searchParams.get("skip") || "0", 10);

    const client = await getMongoClient();
    const db = client.db("adapp");
    const col = db.collection("entries_recovery");

    const cursor = col.find({}).sort({ date: -1, _id: -1 }).skip(skip).limit(limit);
    const data = await cursor.toArray();
    const total = await col.countDocuments();

    return NextResponse.json({ ok: true, data, total, limit, skip });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
