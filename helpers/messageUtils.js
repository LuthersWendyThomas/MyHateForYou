// 📦 helpers/messageUtils.js | FINAL IMMORTAL v99999999999.∞.X — TITANLOCK GODMODE SYNC

import { autobanEnabled, autodeleteEnabled } from "../config/features.js";
import { userSessions, userMessages } from "../state/userState.js";
import { banUser } from "../utils/bans.js";
import { BOT } from "../config/config.js";

const CLEANUP_TIMEOUT_MS = 27 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 4096;

/**
 * ✅ Core message sender with tracking (Markdown, silent, chunked)
 */
export async function sendAndTrack(bot, id, text, options = {}, messages = userMessages) {
  if (!bot || !id || !text?.trim()) return null;
  const chunks = splitMessage(text);
  let firstMsg = null;

  for (const chunk of chunks) {
    const msg = await safeSend(bot, id, chunk, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      ...options
    });

    if (msg?.message_id) {
      trackMessage(id, msg.message_id, messages);
      if (process.env.DEBUG_MESSAGES === "true") {
        console.log(`📬 Tracked → ${id} :: ${msg.message_id}`);
      }
    }

    if (!firstMsg && msg) firstMsg = msg;
  }

  scheduleCleanup(bot, id, messages);
  return firstMsg;
}

/**
 * ✅ Plain text sender (no formatting)
 */
export async function sendPlain(bot, id, text, messages = userMessages) {
  if (!bot || !id || !text?.trim()) return null;
  const chunks = splitMessage(text);
  let firstMsg = null;

  for (const chunk of chunks) {
    const msg = await safeSend(bot, id, chunk);
    if (msg?.message_id) trackMessage(id, msg.message_id, messages);
    if (!firstMsg && msg) firstMsg = msg;
  }

  scheduleCleanup(bot, id, messages);
  return firstMsg;
}

/**
 * 💎 GODMODE sendKeyboard — garantuotai rodo visus mygtukus
 */
export async function sendKeyboard(bot, id, text, keyboard, messages = userMessages) {
  if (!bot || !id || !text || !keyboard) return null;

  try {
    const replyMarkup = {
      keyboard: normalizeKeyboard(keyboard),
      resize_keyboard: true,
      one_time_keyboard: false,
      selective: false
    };

    return await sendAndTrack(bot, id, text, { reply_markup: replyMarkup }, messages);
  } catch (err) {
    console.error("❌ [sendKeyboard error]:", err.message);
    return await safeSend(bot, id, text).catch(() => null);
  }
}

/**
 * ✅ Photo sender with tracking
 */
export async function sendPhotoAndTrack(bot, id, photo, options = {}, messages = userMessages) {
  if (!bot || !id || !photo) return null;

  try {
    const msg = await bot.sendPhoto(id, photo, {
      parse_mode: "Markdown",
      ...options
    }).catch(e => {
      console.warn("⚠️ [sendPhoto error]:", e.message);
      return null;
    });

    if (msg?.message_id) {
      trackMessage(id, msg.message_id, messages);
      if (process.env.DEBUG_MESSAGES === "true") {
        console.log(`🖼️ Tracked photo → ${id} :: ${msg.message_id}`);
      }
    }

    scheduleCleanup(bot, id, messages);
    return msg;
  } catch (err) {
    console.error("❌ [sendPhotoAndTrack error]:", err.message);
    return null;
  }
}

/**
 * 🔔 Silent user notification
 */
export async function tryNotify(bot, id, text) {
  try {
    if (!bot || !id || !text) return;
    await bot.sendMessage(id, text, { disable_notification: true }).catch(() => {});
  } catch {}
}

/**
 * ✅ Safe alert message (Markdown)
 */
export async function safeAlert(bot, id, text) {
  try {
    return await bot.sendMessage(id, text, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    });
  } catch (err) {
    console.warn("⚠️ [safeAlert failed]:", err.message);
    return null;
  }
}

/**
 * 🛡️ Safe universal fallback sender
 */
export async function safeSend(bot, id, text, options = {}) {
  try {
    return await bot.sendMessage(id, text, options);
  } catch (err) {
    console.warn(`⚠️ [safeSend] Failed → ${err.message}`);
    return null;
  }
}

/**
 * 🧠 Track messages per user for cleanup
 */
function trackMessage(id, msgId, messages = userMessages) {
  const uid = String(id || "").trim();
  if (!uid || !msgId) return;

  if (!messages[uid]) messages[uid] = [];
  if (!messages[uid].includes(msgId)) {
    messages[uid].push(msgId);
  }
}

/**
 * 🧼 Cleanup scheduler — autodelete + optional autoban
 */
function scheduleCleanup(bot, id, messages = userMessages) {
  if (!autodeleteEnabled.status && !autobanEnabled.status) return;

  const uid = String(id || "").trim();
  const session = userSessions[uid];
  if (!session || session.cleanupScheduled) return;
  if (BOT.ADMIN_ID && uid === String(BOT.ADMIN_ID)) return;

  session.cleanupScheduled = true;

  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(`🧹 Cleanup scheduled → ${uid}`);
  }

  setTimeout(async () => {
    try {
      const msgIds = Array.isArray(messages[uid]) ? messages[uid] : [];

      for (const msgId of msgIds) {
        await bot.deleteMessage(uid, msgId).catch(e => {
          console.warn(`⚠️ Delete failed #${msgId}:`, e.message);
        });
      }

      if (autobanEnabled.status) {
        await banUser(uid);
        console.log(`⛔️ Auto-banned → ${uid}`);
      } else {
        console.log(`✅ Cleanup complete → ${uid}`);
      }

      if (process.env.DEBUG_MESSAGES === "true") {
        console.log(`🗑️ ${msgIds.length} messages removed`);
      }
    } catch (err) {
      console.error("❌ [scheduleCleanup error]:", err.message);
    } finally {
      delete messages[uid];
      if (userSessions[uid]) delete userSessions[uid].cleanupScheduled;
    }
  }, CLEANUP_TIMEOUT_MS);
}

/**
 * ✂️ Message chunker (Telegram max 4096)
 */
function splitMessage(text) {
  if (!text || typeof text !== "string") return [""];
  const parts = [];
  let index = 0;

  while (index < text.length) {
    parts.push(text.slice(index, index + MAX_MESSAGE_LENGTH));
    index += MAX_MESSAGE_LENGTH;
  }

  return parts;
}

/**
 * 🧩 Normalize keyboard structure (prevents bugs)
 */
function normalizeKeyboard(keyboard) {
  if (!Array.isArray(keyboard)) return [];
  return keyboard.map(row => {
    if (Array.isArray(row)) return row.map(String);
    return [String(row)];
  });
}
