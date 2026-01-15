import { getDb, ensureIndexes } from "@/lib/mongo";

export default async function handler(req, res) {
  try {
    const { tg_id } = req.query || {};
    if (!tg_id) return res.status(400).json({ ok: false, error: "Missing tg_id" });

    await ensureIndexes();
    const db = await getDb();
    const colUsers = db.collection("user_credentials");

    const userDoc = await colUsers.findOne({
      $and: [
        { "telegram.active": true },
        {
          $or: [
            { "telegram.tgId": String(tg_id) },
            { "telegram.members": { $elemMatch: { tgId: String(tg_id), active: true } } },
          ],
        },
      ],
    });
    if (!userDoc) return res.status(401).json({ ok: false, error: "Not linked" });

    const colFiles = db.collection("drive_files");
    const files = await colFiles
      .find({ ownerUserId: userDoc.userId }, {
        projection: {
          _id: 0,
          file_id: 1,
          file_name: 1,
          file_type: 1,
          parent_folder: 1,
          web_view_link: 1,
          drive_download_link: 1,
          last_modified: 1,
          tokens: 1,
        },
      })
      .toArray();

    return res.status(200).json({ ok: true, files });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Server error" });
  }
}
