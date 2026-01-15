import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { getDb, ensureIndexes } from "@/lib/mongo";

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) return res.status(401).json({ ok: false, error: "Unauthorized" });

    await ensureIndexes();
    const db = await getDb();
    const colFiles = db.collection("drive_files");

    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.max(1, Math.min(parseInt(req.query.pageSize || "25", 10), 100));
    const skip = (page - 1) * pageSize;

    const cursor = colFiles
      .find({ ownerUserId: session.user.email })
      .project({
        _id: 0,
        file_id: 1,
        file_name: 1,
        file_type: 1,
        parent_folder: 1,
        web_view_link: 1,
        drive_download_link: 1,
        last_modified: 1,
        tokens: 1,
      })
      .sort({ last_modified: -1 })
      .skip(skip)
      .limit(pageSize);

    const files = await cursor.toArray();
    const total = await colFiles.countDocuments({ ownerUserId: session.user.email });

    return res.status(200).json({ ok: true, files, page, pageSize, total });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Server error" });
  }
}
