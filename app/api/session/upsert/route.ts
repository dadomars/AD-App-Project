// pwa/app/api/session/upsert/route.ts
import { NextResponse } from "next/server";
import { getMongoClient } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const entry = await req.json(); // body JSON

    if (!entry?.date) {
      return NextResponse.json(
        { ok: false, error: "date is required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    if (!entry.createdAt) entry.createdAt = now;
    entry.updatedAt = now;

    const client = await getMongoClient();
    const coll = client.db("adapp").collection("sessions");

    // upsert per chiave data+tipo (adatta alla tua logica)
    const res = await coll.findOneAndUpdate(
      { date: entry.date, type: entry.type },
      { $set: entry },
      { upsert: true, returnDocument: "after" }
    );

    return NextResponse.json({ ok: true, data: res.value ?? entry });
  } catch (e: any) {
    console.error("[api/session/upsert] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "error" },
      { status: 500 }
    );
  }
}
