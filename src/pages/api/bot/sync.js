import { getDb, ensureIndexes } from "@/lib/mongo";

async function refreshAccessToken(doc) {
  try {
    if (!doc?.refreshToken) return null;
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: doc.refreshToken,
    });
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "refresh failed");

    const updated = {
      accessToken: data.access_token,
      accessTokenExpires: Date.now() + (data.expires_in || 0) * 1000,
      refreshToken: data.refresh_token || doc.refreshToken,
    };

    const db = await getDb();
    await db.collection("user_credentials").updateOne(
      { _id: doc._id },
      { $set: { ...updated, updatedAt: new Date() } }
    );

    return updated;
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  try {
    await ensureIndexes();
    const db = await getDb();

    const { tg_id, force } = req.query || {};
    if (!tg_id) return res.status(400).json({ ok: false, error: "Missing tg_id" });

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

    // Limit sync frequency to every 3 hours unless forced
    const now = Date.now();
    const lastSync = userDoc.telegram?.driveSyncAt ? new Date(userDoc.telegram.driveSyncAt).getTime() : 0;
    const threeHours = 3 * 60 * 60 * 1000;
    if (!force && lastSync && now - lastSync < threeHours) {
      return res.status(200).json({ ok: true, skipped: true, lastSync: userDoc.telegram.driveSyncAt });
    }

    let accessToken = userDoc.accessToken;
    if (userDoc.accessTokenExpires && Date.now() >= userDoc.accessTokenExpires) {
      const updated = await refreshAccessToken(userDoc);
      if (updated?.accessToken) accessToken = updated.accessToken;
    }

    if (!accessToken) return res.status(401).json({ ok: false, error: "No access token" });

    const fields = encodeURIComponent(
      "nextPageToken, files(id,name,mimeType,parents,webViewLink,webContentLink,modifiedTime)"
    );
    // Only index: images, pdfs, videos, and docs
    const DOC_TYPES = [
      "application/vnd.google-apps.document",
      "application/vnd.google-apps.spreadsheet",
      "application/vnd.google-apps.presentation",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "application/rtf",
      "application/vnd.oasis.opendocument.text",
    ];
    const docOr = DOC_TYPES.map(t => `mimeType = '${t}'`).join(" or ");
    const where = `trashed = false and (mimeType contains 'image/' or mimeType = 'application/pdf' or mimeType contains 'video/' or (${docOr}))`;
    const base = `https://www.googleapis.com/drive/v3/files?fields=${fields}&pageSize=1000&includeItemsFromAllDrives=true&supportsAllDrives=true&q=${encodeURIComponent(where)}`;

    const colFiles = db.collection("drive_files");
    let pageToken = undefined;
    let total = 0;
    do {
      const url = base + (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      const json = await resp.json();
      if (!resp.ok) return res.status(resp.status).json({ ok: false, error: json.error || "Drive error" });

      const files = Array.isArray(json.files) ? json.files : [];
      // Server-side guard: skip any non-target mime types
      const wanted = files.filter(f => {
        const m = f.mimeType || "";
        return (
          m.startsWith("image/") ||
          m === "application/pdf" ||
          m.startsWith("video/") ||
          DOC_TYPES.includes(m)
        );
      });
      for (const f of wanted) {
        // Tokenize file_name for fast local search (ignore extension in tokens)
        const rawName = f.name || "";
        const lower = rawName.toLowerCase();
        const parts = lower.split(/[^a-z0-9]+/g).filter(Boolean);
        // drop terminal extension token if matches file extension
        let tokens = parts;
        if (tokens.length > 0) {
          const ext = (rawName.split('.').pop() || '').toLowerCase();
          if (ext && tokens[tokens.length - 1] === ext) {
            tokens = tokens.slice(0, -1);
          }
        }
        const record = {
          ownerUserId: userDoc.userId,
          file_id: f.id,
          file_name: f.name || null,
          file_type: f.mimeType || null,
          parent_folder: Array.isArray(f.parents) && f.parents.length > 0 ? f.parents[0] : null,
          web_view_link: f.webViewLink || null,
          drive_download_link: f.webContentLink || null,
          last_modified: f.modifiedTime ? new Date(f.modifiedTime) : null,
          tokens,
          updatedAt: new Date(),
        };
        await colFiles.updateOne(
          { ownerUserId: userDoc.userId, file_id: f.id },
          { $set: record, $setOnInsert: { createdAt: new Date() } },
          { upsert: true }
        );
      }
      total += wanted.length;
      pageToken = json.nextPageToken || undefined;
    } while (pageToken);

    await colUsers.updateOne(
      { _id: userDoc._id },
      { $set: { "telegram.driveSyncAt": new Date() } }
    );

    return res.status(200).json({ ok: true, total });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Server error" });
  }
}
