import { NextRequest, NextResponse } from "next/server";
import { getMongoClient } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date"); // recupero per data
    if (!date) return NextResponse.json({ ok: false, error: "Missing ?date=YYYY-MM-DD" }, { status: 400 });

    const client = await getMongoClient();
    const db = client.db("adapp");
    const doc = await db.collection("entries_recovery").findOne({ date });

    if (!doc) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data: doc });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
