// pwa/src/app/api/session/parse-run/route.ts

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET() {
  return NextResponse.json({ ok: true, method: "GET", route: "parse-run" });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "No file received" }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "File too large (max 20MB)" }, { status: 413 });
    }
    // ... parsing ...
    return NextResponse.json({ ok: true /*, runMetrics*/ });
  } catch (err: unknown) {
    const msg = err && typeof err === "object" && "message" in err ? (err as any).message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
