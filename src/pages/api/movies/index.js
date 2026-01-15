import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
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
    await db.collection("user_credentials").updateOne({ _id: doc._id }, { $set: { ...updated, updatedAt: new Date() } });
    return updated;
  } catch (e) {
    return null;
  }
}

async function findMoviesFolder(accessToken) {
  const where = "mimeType = 'application/vnd.google-apps.folder' and trashed = false and (name = 'Movies' or name = 'movies')";
  const fields = encodeURIComponent("files(id,name,mimeType)");
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(where)}&fields=${fields}&pageSize=10&orderBy=name asc&includeItemsFromAllDrives=true&supportsAllDrives=true`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error || "Drive error");
  const exact = (json.files || []).filter(f => (f.name || "").toLowerCase() === "movies" && f.mimeType === "application/vnd.google-apps.folder");
  return exact.length ? exact[0].id : null;
}

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) return res.status(401).json({ ok: false, error: "Unauthorized" });

    await ensureIndexes();
    const db = await getDb();
    const col = db.collection("user_credentials");
    const doc = await col.findOne({ userId: session.user.email });
    if (!doc) return res.status(401).json({ ok: false, error: "Not linked" });

    let accessToken = doc.accessToken;
    if (!accessToken || (doc.accessTokenExpires && Date.now() >= doc.accessTokenExpires)) {
      const updated = await refreshAccessToken(doc);
      if (updated?.accessToken) accessToken = updated.accessToken;
    }
    if (!accessToken) return res.status(401).json({ ok: false, error: "No access token" });

    const folderId = await findMoviesFolder(accessToken);
    if (!folderId) return res.status(200).json({ ok: true, files: [], folderId: null });

    const pageSize = Math.max(1, Math.min(parseInt(req.query.pageSize || "30", 10), 100));
    const pageToken = req.query.pageToken ? String(req.query.pageToken) : "";
    const where = `('${folderId}' in parents) and trashed=false and (mimeType contains 'video/' or mimeType = 'application/vnd.google-apps.shortcut')`;
    const fields = encodeURIComponent("nextPageToken, files(id,name,mimeType,webViewLink,webContentLink,thumbnailLink,modifiedTime,size,shortcutDetails(targetMimeType,targetId))");
    const base = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(where)}&fields=${fields}&pageSize=${pageSize}&orderBy=modifiedTime desc&includeItemsFromAllDrives=true&supportsAllDrives=true`;
    const url = base + (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");

    const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const json = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ ok: false, error: json.error || "Drive error" });

    return res.status(200).json({ ok: true, files: json.files || [], nextPageToken: json.nextPageToken || null, folderId });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Server error" });
  }
}
