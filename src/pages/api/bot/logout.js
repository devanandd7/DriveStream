import { getDb, ensureIndexes } from "@/lib/mongo";

async function notifyTelegram(tgId, text) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken || !tgId) return;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: String(tgId), text }),
    });
  } catch (_) {}
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  try {
    const { owner_tg_id } = req.body || {};
    if (!owner_tg_id) return res.status(400).json({ ok: false, error: "Missing owner_tg_id" });

    await ensureIndexes();
    const db = await getDb();
    const col = db.collection("user_credentials");

    const doc = await col.findOne({ "telegram.tgId": String(owner_tg_id) });
    if (!doc) return res.status(404).json({ ok: false, error: "Owner not found" });

    await col.updateOne(
      { _id: doc._id },
      { $set: { "telegram.active": false, updatedAt: new Date() } }
    );

    // Notifications
    try {
      await notifyTelegram(owner_tg_id, "You have logged out via bot. Bot access is now disabled until you sign in again.");
      const members = Array.isArray(doc.telegram?.members) ? doc.telegram.members : [];
      for (const m of members) {
        if (m?.active && m?.tgId) {
          await notifyTelegram(m.tgId, "Owner logged out via bot. Your access to Drive via bot is temporarily disabled.");
        }
      }
    } catch (_) {}

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Server error" });
  }
}
