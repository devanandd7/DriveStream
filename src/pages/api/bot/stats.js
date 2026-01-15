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

function classify(mime) {
  if (!mime) return "other";
  if (mime === "application/vnd.google-apps.folder") return "folder";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  return "other";
}

export default async function handler(req, res) {
  try {
    const { tg_id, force } = req.query || {};
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

    // Check cache and whether Drive has newer content
    const cached = doc.telegram?.stats;
    let latestModified = null;
    try {
      // Fetch just the latest modifiedTime to detect changes cheaply
      const latestFields = encodeURIComponent("files(modifiedTime)");
      const latestUrl = `https://www.googleapis.com/drive/v3/files?fields=${latestFields}&pageSize=1&orderBy=modifiedTime desc&q=${encodeURIComponent("trashed=false")}&includeItemsFromAllDrives=true&supportsAllDrives=true`;
      const latestResp = await fetch(latestUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      const latestData = await latestResp.json();
      if (latestResp.ok && latestData.files && latestData.files[0]?.modifiedTime) {
        latestModified = latestData.files[0].modifiedTime;
      }
    } catch (_) {}

    const cacheTTLms = 10 * 60 * 1000; // 10 minutes safety TTL
    const cachedUpdatedAt = cached?.updatedAt ? new Date(cached.updatedAt).getTime() : 0;
    const hasSameHead = cached?.latestModifiedTime && latestModified && cached.latestModifiedTime === latestModified;
    const isFresh = Date.now() - cachedUpdatedAt < cacheTTLms;
    if (!force && cached?.counts && (hasSameHead || isFresh)) {
      return res.status(200).json({ ok: true, counts: cached.counts, updatedAt: cached.updatedAt });
    }

    let accessToken = doc.accessToken;
    if (doc.accessTokenExpires && Date.now() >= doc.accessTokenExpires) {
      const updated = await refreshAccessToken(doc);
      if (updated?.accessToken) accessToken = updated.accessToken;
    }

    const counts = { folder: 0, pdf: 0, image: 0, video: 0 };

    // Iterate pages and count
    let pageToken;
    const fields = encodeURIComponent("nextPageToken, files(id,mimeType)");
    const pageSize = 1000; // max for Drive v3
    do {
      const base = `https://www.googleapis.com/drive/v3/files?fields=${fields}&pageSize=${pageSize}&q=${encodeURIComponent("trashed=false")}&includeItemsFromAllDrives=true&supportsAllDrives=true`;
      const url = base + (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error?.message || "Drive list failed");
      const files = data.files || [];
      for (const f of files) {
        const t = classify(f.mimeType);
        if (counts[t] !== undefined) counts[t] += 1;
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    // Persist cache (store also the latestModifiedTime we observed to detect future changes)
    const updatedAt = new Date();
    await col.updateOne(
      { _id: doc._id },
      { $set: { "telegram.stats": { counts, updatedAt, latestModifiedTime: latestModified }, updatedAt } }
    );

    return res.status(200).json({ ok: true, counts, updatedAt });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Server error" });
  }
}
