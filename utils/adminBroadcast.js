// 📦 utils/adminBroadcast.js | IMMORTAL FINAL v999999999.∞ — BULLETPROOF BROADCAST + PROMO + LOGGING SYNCED

import { BOT } from "../config/config.js";
import { userSessions, userMessages } from "../state/userState.js";
import { sendAndTrack } from "../helpers/messageUtils.js";

const MAX_BATCH_SIZE = 30;
const BATCH_DELAY_MS = 1000;
const PER_USER_DELAY_MS = 100;
const ADMIN_ID = String(BOT.ADMIN_ID || "");

let activeBroadcast = false;

/**
 * 📣 Starts a broadcast to all known users
 */
export async function startBroadcast(bot, id, text) {
  const uid = String(id || "");
  if (uid !== ADMIN_ID || !text?.trim()) return;

  if (activeBroadcast) {
    return sendAndTrack(bot, id, "⚠️ Broadcast already in progress. Please wait...", {
      parse_mode: "Markdown"
    });
  }

  const userIds = Object.keys(userSessions);
  if (!userIds.length) {
    return sendAndTrack(bot, id, "ℹ️ No users to broadcast to.", {
      parse_mode: "Markdown"
    });
  }

  activeBroadcast = true;
  let sent = 0, failed = 0;

  await sendAndTrack(bot, id, `📣 *Starting broadcast...*\n👥 Total users: *${userIds.length}*`, {
    parse_mode: "Markdown"
  });

  for (let i = 0; i < userIds.length; i += MAX_BATCH_SIZE) {
    const batch = userIds.slice(i, i + MAX_BATCH_SIZE);

    await Promise.all(batch.map(async uid => {
      try {
        await delay(PER_USER_DELAY_MS);
        const msg = await sendAndTrack(bot, uid, text, { parse_mode: "Markdown" }, userMessages);
        if (msg) sent++;
        else failed++;
      } catch (err) {
        failed++;
        console.warn(`⚠️ [Broadcast failed to ${uid}]:`, err.message);
      }
    }));

    await delay(BATCH_DELAY_MS);
  }

  activeBroadcast = false;

  return sendAndTrack(bot, id,
    `✅ *Broadcast complete!*\n\n📤 Sent: *${sent}*\n❌ Failed: *${failed}*`,
    { parse_mode: "Markdown" }
  );
}

/**
 * ⏱️ Async delay helper
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
