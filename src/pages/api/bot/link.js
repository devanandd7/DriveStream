import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { getDb, ensureIndexes } from "@/lib/mongo";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) return res.status(401).json({ ok: false, error: "Unauthorized" });

    const { tgId } = req.body || {};
    if (!tgId) return res.status(400).json({ ok: false, error: "Missing tgId" });

    await ensureIndexes();
    const db = await getDb();
    const col = db.collection("user_credentials");

    // Fetch existing to deduplicate notifications
    const existing = await col.findOne({ userId: session.user.email });
    const alreadyLinked = existing?.telegram?.tgId === String(tgId);

    // Preserve existing telegram fields (e.g., members, notifySentAt) and only update core fields
    const nextTelegram = {
      ...(existing?.telegram || {}),
      tgId: String(tgId),
      linkedAt: new Date(),
      active: true,
    };

    const update = {
      $set: {
        telegram: nextTelegram,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    };

    // Link by user email
    const result = await col.updateOne(
      { userId: session.user.email },
      update,
      { upsert: true }
    );

    // Notify user on Telegram with a getting-started message (menu-only UX)
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        const welcome = [
          `✅ Verification complete for ${session.user.email}.`,
          ``,
          `Menu is enabled. Tap /start to open the bot menu.`,
          `From the menu you can: Browse Files, Search, Recent, and Settings.`,
          `If you don't see the menu, send /start again.`,
        ].join("\n");
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: String(tgId),
            text: welcome,
            reply_markup: {
              inline_keyboard: [
                [{ text: "Start", callback_data: "start|open" }]
              ],
            },
          }),
        });

        // mark notify time
        await col.updateOne(
          { userId: session.user.email },
          { $set: { "telegram.notifySentAt": new Date() } }
        );
      }
    } catch (_) {}

    return res.status(200).json({ ok: true, matched: result.matchedCount, modified: result.modifiedCount, alreadyLinked });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Server error" });
  }
}
