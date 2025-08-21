import { NextResponse } from "next/server";
import { getMongoClient } from "@/lib/db";

export async function GET() {
  try {
    const client = await getMongoClient();
    const ping = await client.db("adapp").command({ ping: 1 });
    return NextResponse.json({ ok: true, ping });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
