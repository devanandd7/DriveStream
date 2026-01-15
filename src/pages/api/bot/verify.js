import { getDb, ensureIndexes } from "@/lib/mongo";

export default async function handler(req, res) {
  try {
    const { tg_id } = req.query || {};
    if (!tg_id) return res.status(400).json({ verified: false, error: "Missing tg_id" });

    await ensureIndexes();
    const db = await getDb();
    const col = db.collection("user_credentials");

    // Verified if:
    // - This tg_id is the owner's linked Telegram and owner is active, OR
    // - This tg_id is in owner's telegram.members as active, and owner is active
    const query = {
      $and: [
        { "telegram.active": true },
        {
          $or: [
            { "telegram.tgId": String(tg_id) },
            { "telegram.members": { $elemMatch: { tgId: String(tg_id), active: true } } },
          ],
        },
      ],
    };
    const doc = await col.findOne(query, { projection: { _id: 1 } });

    return res.status(200).json({ verified: !!doc });
  } catch (e) {
    return res.status(500).json({ verified: false, error: e.message || "Server error" });
  }
}
