import { NextResponse } from "next/server";
import getMongoClient from "@/lib/db";

export async function GET() {
  try {
    const client = await getMongoClient();
    const db = client.db(); // usa "adapp"
    const col = db.collection("ping");
    const res = await col.insertOne({ ts: new Date() });
    return NextResponse.json({ ok: true, insertedId: String(res.insertedId) });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
