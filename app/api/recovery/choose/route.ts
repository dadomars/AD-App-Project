import { NextRequest, NextResponse } from "next/server";
import { getMongoClient } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { date } = await req.json();
    if (!date) return NextResponse.json({ ok:false, error:"Missing date" }, { status:400 });

    const db = (await getMongoClient()).db("adapp");
    const col = db.collection("entries_recovery");

    await col.updateMany({ date }, { $set: { status:"pending" } });
    const doc = await col.findOneAndUpdate(
      { date }, { $set: { status:"chosen", updatedAt: new Date() } }, { returnDocument:"after" }
    );
    return NextResponse.json({ ok:true, data: doc });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message||"Server error" }, { status:500 });
  }
}
