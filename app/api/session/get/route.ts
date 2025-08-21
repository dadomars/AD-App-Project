// pwa/app/api/session/get/route.ts
import { NextResponse } from "next/server";
import { getMongoClient } from "@/lib/db";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const date = searchParams.get("date");

    if (!id && !date) {
      return NextResponse.json(
        { ok: false, error: "id or date required" },
        { status: 400 }
      );
    }

    const client = await getMongoClient();
    const coll = client.db("adapp").collection("sessions");

    const filter = id ? { _id: new ObjectId(id) } : { date };
    const doc = await coll.findOne(filter);

    if (!doc) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: doc });
  } catch (e: any) {
    console.error("[api/session/get] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "error" },
      { status: 500 }
    );
  }
}
