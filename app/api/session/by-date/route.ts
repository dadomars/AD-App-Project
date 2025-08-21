// =============================================
// File: app/api/session/by-date/route.ts (GET)
// =============================================
import { NextRequest, NextResponse } from "next/server";
import { getMongoClient } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ ok: false, error: "Missing ?date=YYYY-MM-DD" }, { status: 400 });
  try {
    const client = await getMongoClient();
    const db = client.db("adapp");
    const docs = await db.collection("entries_session").find({ date }).sort({ _id: -1 }).toArray();
    return NextResponse.json({ ok: true, data: docs });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "DB error" }, { status: 500 });
  }
}
