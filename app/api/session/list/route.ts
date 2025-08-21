// pwa/app/api/session/list/route.ts
import { NextResponse } from "next/server";
import { getMongoClient } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // NON usare req.nextUrl se la firma è Request
    const { searchParams } = new URL(req.url);

    const limit = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get("limit") || "10", 10))
    );
    const skip = Math.max(0, parseInt(searchParams.get("skip") || "0", 10));
    const date = searchParams.get("date") || undefined;
    const type = searchParams.get("type") || undefined;

    const client = await getMongoClient();
    const coll = client.db("adapp").collection("sessions");

    const filter: any = {};
    if (date) filter.date = date;
    if (type) filter.type = type;

    const cursor = coll
      .find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const data = await cursor.toArray();
    const total = await coll.countDocuments(filter);

    return NextResponse.json({ ok: true, data, total, limit, skip });
  } catch (e: any) {
    console.error("[api/session/list] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "error" },
      { status: 500 }
    );
  }
}
