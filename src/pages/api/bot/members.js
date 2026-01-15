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
  try {
    await ensureIndexes();
    const db = await getDb();
    const col = db.collection("user_credentials");

    if (req.method === "GET") {
      const { owner_tg_id } = req.query || {};
      if (!owner_tg_id) return res.status(400).json({ ok: false, error: "Missing owner_tg_id" });
      const owner = await col.findOne(
        { "telegram.tgId": String(owner_tg_id) },
        { projection: { _id: 1, "telegram.members": 1 } }
      );
      if (!owner) return res.status(404).json({ ok: false, error: "Owner not found" });
      return res.status(200).json({ ok: true, members: owner.telegram?.members || [] });
    }

    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

    const { action, owner_tg_id, member_tg_id } = req.body || {};
    if (!action || !owner_tg_id) return res.status(400).json({ ok: false, error: "Missing action or owner_tg_id" });

    const owner = await col.findOne({ "telegram.tgId": String(owner_tg_id) });
    if (!owner) return res.status(404).json({ ok: false, error: "Owner not found" });

    const members = Array.isArray(owner.telegram?.members) ? owner.telegram.members : [];

    if (action === "add") {
      if (!member_tg_id) return res.status(400).json({ ok: false, error: "Missing member_tg_id" });

      const activeCount = members.filter((m) => m.active).length;
      const existsIdx = members.findIndex((m) => m.tgId === String(member_tg_id));
      const alreadyActive = existsIdx >= 0 && members[existsIdx].active;

      if (!alreadyActive && activeCount >= 3) {
        return res.status(400).json({ ok: false, error: "Max 3 active members reached" });
      }

      let update;
      if (existsIdx >= 0) {
        update = {
          $set: {
            [`telegram.members.${existsIdx}.active`]: true,
            [`telegram.members.${existsIdx}.addedAt`]: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        };
      } else {
        update = {
          $push: {
            "telegram.members": { tgId: String(member_tg_id), active: true, addedAt: new Date() },
          },
          $setOnInsert: { createdAt: new Date() },
        };
      }

      await col.updateOne({ _id: owner._id }, update);

      await Promise.all([
        notifyTelegram(member_tg_id, `You have been added as a family member by ${owner.userId || owner.email || "owner"}.`),
        notifyTelegram(owner.telegram?.tgId, `Member ${member_tg_id} added.`),
      ]);

      return res.status(200).json({ ok: true, action: "add" });
    }

    if (action === "remove") {
      if (!member_tg_id) return res.status(400).json({ ok: false, error: "Missing member_tg_id" });
      const existsIdx = members.findIndex((m) => m.tgId === String(member_tg_id));
      if (existsIdx < 0) return res.status(404).json({ ok: false, error: "Member not found" });

      await col.updateOne(
        { _id: owner._id },
        { $set: { [`telegram.members.${existsIdx}.active`]: false, updatedAt: new Date() } }
      );

      await Promise.all([
        notifyTelegram(member_tg_id, `Your access has been removed by ${owner.userId || owner.email || "owner"}.`),
        notifyTelegram(owner.telegram?.tgId, `Member ${member_tg_id} removed.`),
      ]);

      return res.status(200).json({ ok: true, action: "remove" });
    }

    return res.status(400).json({ ok: false, error: "Unsupported action" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Server error" });
  }
}
