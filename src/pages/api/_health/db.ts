import type { NextApiRequest, NextApiResponse } from "next";
import getMongoClient from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await getMongoClient();
    const db = client.db();
    await db.command({ ping: 1 });
    res.status(200).json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
