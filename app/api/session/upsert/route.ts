import { NextRequest, NextResponse } from "next/server";
import { upsert } from "@/scripts/upsert";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await upsert(body);
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
