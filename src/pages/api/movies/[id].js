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

    const { id } = req.query;
    if (!id) return res.status(400).json({ ok: false, error: "Missing id" });

    const fields = encodeURIComponent("id,name,mimeType,webViewLink,webContentLink,thumbnailLink,modifiedTime,size,shortcutDetails(targetMimeType,targetId)");
    const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=${fields}&supportsAllDrives=true`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const json = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ ok: false, error: json.error || "Drive error" });

    // Compose a normalized object and computed preview link
    const f = json || {};
    const targetId = f?.shortcutDetails?.targetId || f.id;
    const previewUrl = `https://drive.google.com/file/d/${targetId}/preview`;

    return res.status(200).json({ ok: true, file: { ...f, targetId, previewUrl } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Server error" });
  }
}
