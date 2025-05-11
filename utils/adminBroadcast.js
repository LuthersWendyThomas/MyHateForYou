// 📦 utils/adminBroadcast.js | FINAL IMMORTAL BROADCASTLOCK v999999999.∞ — GODMODE SYNC + BULLETPROOF + LOGGING + RATE-SAFE

import { BOT } from "../config/config.js";
import { userSessions, userMessages } from "../state/userState.js";
import { sendAndTrack } from "../helpers/messageUtils.js";

const ADMIN_ID = String(BOT.ADMIN_ID || "");
const MAX_BATCH = 30;
const DELAY_PER_USER = 80;
const DELAY_PER_BATCH = 1000;

let isBroadcasting = false;

/**
 * 📣 Initiates mass broadcast to all users
 */
export async function startBroadcast(bot, id, text) {
  const uid = String(id || "");
  if (uid !== ADMIN_ID || !text?.trim()) return;

  if (isBroadcasting) {
    return sendAndTrack(bot, id, "⚠️ *Broadcast already in progress. Please wait...*", {
      parse_mode: "Markdown"
    });
  }

  const userIds = Object.keys(userSessions || {});
  if (!userIds.length) {
    return sendAndTrack(bot, id, "ℹ️ *No users to broadcast to.*", {
      parse_mode: "Markdown"
    });
  }

  isBroadcasting = true;
  let sent = 0;
  let failed = 0;

  await sendAndTrack(bot, id, `📣 *Starting broadcast...*\n👥 Users: *${userIds.length}*`, {
    parse_mode: "Markdown"
  });

  for (let i = 0; i < userIds.length; i += MAX_BATCH) {
    const batch = userIds.slice(i, i + MAX_BATCH);

    await Promise.all(batch.map(async userId => {
      try {
        await sleep(DELAY_PER_USER);
        const res = await sendAndTrack(bot, userId, text, { parse_mode: "Markdown" }, userMessages);
        if (res?.message_id) sent++;
        else failed++;
      } catch (err) {
        failed++;
        console.warn(`⚠️ [Broadcast error → ${userId}]: ${err.message}`);
      }
    }));

    await sleep(DELAY_PER_BATCH);
  }

  isBroadcasting = false;

  return sendAndTrack(bot, id,
    `✅ *Broadcast complete!*\n\n📤 Sent: *${sent}*\n❌ Failed: *${failed}*`,
    { parse_mode: "Markdown" }
  );
}

/**
 * 🕒 Async delay helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
