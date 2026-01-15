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
    const { tg_id, limit, pageToken, q: rawQ } = req.query || {};
    if (!tg_id) return res.status(400).json({ error: "Missing tg_id" });

    await ensureIndexes();
    const db = await getDb();
    const col = db.collection("user_credentials");
    const doc = await col.findOne({
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
    if (!doc?.accessToken) return res.status(401).json({ error: "Not linked" });

    let accessToken = doc.accessToken;
    if (doc.accessTokenExpires && Date.now() >= doc.accessTokenExpires) {
      const updated = await refreshAccessToken(doc);
      if (updated?.accessToken) accessToken = updated.accessToken;
    }

    const q = encodeURIComponent(rawQ ? String(rawQ) : "trashed=false");
    const fields = encodeURIComponent(
      "nextPageToken, files(id,name,mimeType,webViewLink,webContentLink,thumbnailLink,iconLink,hasThumbnail,modifiedTime,size,shortcutDetails(targetMimeType,targetId))"
    );
    const pageSize = Math.max(1, Math.min(parseInt(limit || "10", 10), 100));
    const base = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=${pageSize}&orderBy=modifiedTime desc&includeItemsFromAllDrives=true&supportsAllDrives=true`;
    const url = base + (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ error: json.error || "Drive error" });

    return res.status(200).json({ files: json.files || [], nextPageToken: json.nextPageToken || null });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
