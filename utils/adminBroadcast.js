// 📦 utils/adminBroadcast.js | FINAL IMMORTAL v999999999.∞+SYNCLOCK
// ADMIN-SAFE • TEXT + PROMO BROADCAST • BULLETPROOF • FULLY SYNCED

import { BOT } from "../config/config.js";
import { userSessions, userMessages } from "../state/userState.js";
import { sendAndTrack } from "../helpers/messageUtils.js";
import { sendPromo } from "./sendPromo.js";

const ADMIN_ID = String(BOT.ADMIN_ID || "");
const MAX_BATCH = 30;
const DELAY_PER_USER = 80;
const DELAY_PER_BATCH = 1000;

let broadcastStatus = {
  isRunning: false,
  type: null // "text" | "promo"
};

/**
 * 📣 Markdown broadcast to all users
 */
export async function startBroadcast(bot, id, text) {
  const uid = String(id || "");
  if (uid !== ADMIN_ID || !text?.trim()) return;

  if (broadcastStatus.isRunning) {
    return sendAndTrack(bot, id, `⚠️ *Another broadcast (${broadcastStatus.type}) is in progress...*`, {
      parse_mode: "Markdown"
    }, {});
  }

  const userIds = Object.keys(userSessions || {});
  if (!userIds.length) {
    return sendAndTrack(bot, id, "ℹ️ *No users to broadcast to.*", {
      parse_mode: "Markdown"
    }, {});
  }

  broadcastStatus = { isRunning: true, type: "text" };
  let sent = 0, failed = 0;

  await sendAndTrack(bot, id, `📣 *Broadcast started!*\n👥 Users: *${userIds.length}*`, {
    parse_mode: "Markdown"
  }, {});

  for (let i = 0; i < userIds.length; i += MAX_BATCH) {
    const batch = userIds.slice(i, i + MAX_BATCH);

    await Promise.all(batch.map(async userId => {
      try {
        await sleep(DELAY_PER_USER);
        const msg = await sendAndTrack(bot, userId, text, {
          parse_mode: "Markdown"
        }, userMessages);
        msg?.message_id ? sent++ : failed++;
      } catch (err) {
        failed++;
        console.warn(`⚠️ [Broadcast → ${userId}]:`, err.message || err);
      }
    }));

    await sleep(DELAY_PER_BATCH);
  }

  broadcastStatus = { isRunning: false, type: null };

  return sendAndTrack(bot, id,
    `✅ *Broadcast complete!*\n📤 Sent: *${sent}*\n❌ Failed: *${failed}*`,
    { parse_mode: "Markdown" }, {});
}

/**
 * 🎁 PROMO-based mass broadcast
 */
export async function startPromoBroadcast(bot, id, promoCode = "") {
  const uid = String(id || "");
  if (uid !== ADMIN_ID || !promoCode?.trim()) return;

  if (broadcastStatus.isRunning) {
    return sendAndTrack(bot, id, `⚠️ *Another broadcast (${broadcastStatus.type}) is in progress...*`, {
      parse_mode: "Markdown"
    }, {});
  }

  const userIds = Object.keys(userSessions || {});
  if (!userIds.length) {
    return sendAndTrack(bot, id, "ℹ️ *No users to send promo to.*", {
      parse_mode: "Markdown"
    }, {});
  }

  broadcastStatus = { isRunning: true, type: "promo" };
  let sent = 0, failed = 0;

  await sendAndTrack(bot, id,
    `🎁 *Sending promo...*\n👥 Users: *${userIds.length}*`,
    { parse_mode: "Markdown" }, {});

  for (let i = 0; i < userIds.length; i += MAX_BATCH) {
    const batch = userIds.slice(i, i + MAX_BATCH);

    await Promise.all(batch.map(async userId => {
      try {
        await sleep(DELAY_PER_USER);
        const msg = await sendPromo(bot, userId, promoCode, userMessages);
        msg?.message_id ? sent++ : failed++;
      } catch (err) {
        failed++;
        console.warn(`⚠️ [Promo → ${userId}]:`, err.message || err);
      }
    }));

    await sleep(DELAY_PER_BATCH);
  }

  broadcastStatus = { isRunning: false, type: null };

  return sendAndTrack(bot, id,
    `✅ *Promo broadcast complete!*\n📤 Sent: *${sent}*\n❌ Failed: *${failed}*`,
    { parse_mode: "Markdown" }, {});
}

/**
 * ⏱️ Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
