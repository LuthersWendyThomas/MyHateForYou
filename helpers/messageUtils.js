// 📦 helpers/messageUtils.js | BalticPharma V2 — FINAL IMMORTAL v2.8 BULLETPROOF ULTRA POLISH

import { autobanEnabled, autodeleteEnabled } from "../config/features.js";
import { userSessions, userMessages } from "../state/userState.js";
import { banUser } from "../utils/bans.js";
import { BOT } from "../config/config.js";

const CLEANUP_TIMEOUT_MS = 27 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 4096;

/**
 * ✅ Sends a message with tracking and automatic cleanup/autoban
 */
export const sendAndTrack = async (bot, id, text, options = {}, messages = userMessages) => {
  if (!bot || !id || !text) return null;

  try {
    const chunks = splitMessage(text);
    let firstMsg = null;

    for (const chunk of chunks) {
      const msg = await bot.sendMessage(id, chunk, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
        ...options,
      }).catch(e => {
        console.warn("⚠️ [sendMessage error]:", e.message);
        return null;
      });

      if (msg?.message_id) {
        trackMessage(id, msg.message_id, messages);
        if (process.env.DEBUG_MESSAGES === "true") {
          console.log(`📬 Followed message: ${id} → ${msg.message_id}`);
        }
      }

      if (!firstMsg && msg) firstMsg = msg;
    }

    scheduleCleanup(bot, id, messages);
    return firstMsg;
  } catch (err) {
    console.error("❌ [sendAndTrack error]:", err.message);
    return null;
  }
};

/**
 * ✅ Sends photos with tracking and cleanup logic
 */
export const sendPhotoAndTrack = async (bot, id, photo, options = {}, messages = userMessages) => {
  if (!bot || !id || !photo) return null;

  try {
    const msg = await bot.sendPhoto(id, photo, {
      parse_mode: "Markdown",
      ...options,
    }).catch(e => {
      console.warn("⚠️ [sendPhoto error]:", e.message);
      return null;
    });

    if (msg?.message_id) {
      trackMessage(id, msg.message_id, messages);
      if (process.env.DEBUG_MESSAGES === "true") {
        console.log(`🖼️ Followed photo: ${id} → ${msg.message_id}`);
      }
    }

    scheduleCleanup(bot, id, messages);
    return msg;
  } catch (err) {
    console.error("❌ [sendPhotoAndTrack error]:", err.message);
    return null;
  }
};

/**
 * ✅ Sends a message with the keyboard (ReplyKeyboard)
 */
export const sendKeyboard = async (bot, id, text, keyboard, messages = userMessages) => {
  return await sendAndTrack(bot, id, text, {
    reply_markup: {
      keyboard,
      resize_keyboard: true,
      one_time_keyboard: false,
      selective: true
    }
  }, messages);
};

export const sendMessageWithTracking = sendKeyboard;

/**
 * ✅ Sends a simple message without additional options
 */
export const sendPlain = async (bot, id, text, messages = userMessages) => {
  if (!bot || !id || !text) return null;

  try {
    const chunks = splitMessage(text);
    let firstMsg = null;

    for (const chunk of chunks) {
      const msg = await bot.sendMessage(id, chunk).catch(e => {
        console.warn("⚠️ [sendPlain error]:", e.message);
        return null;
      });

      if (msg?.message_id) trackMessage(id, msg.message_id, messages);
      if (!firstMsg && msg) firstMsg = msg;
    }

    scheduleCleanup(bot, id, messages);
    return firstMsg;
  } catch (err) {
    console.error("❌ [sendPlain error]:", err.message);
    return null;
  }
};

/**
 * ✅ Records the message ID in the user context
 */
function trackMessage(id, messageId, messages = userMessages) {
  const uid = String(id).trim();
  if (!uid || !messageId) return;

  if (!Array.isArray(messages[uid])) messages[uid] = [];
  if (!messages[uid].includes(messageId)) messages[uid].push(messageId);
}

/**
 * ✅ Plans to delete messages and block the user
 */
function scheduleCleanup(bot, id, messages = userMessages) {
  if (!autodeleteEnabled.status && !autobanEnabled.status) return;

  const uid = String(id).trim();
  const session = userSessions[uid];
  if (!session || session.cleanupScheduled) return;

  const isAdmin = BOT.ADMIN_ID && uid === String(BOT.ADMIN_ID);
  if (isAdmin) return;

  session.cleanupScheduled = true;

  setTimeout(async () => {
    try {
      const msgIds = messages[uid] || [];

      for (const msgId of msgIds) {
        await bot.deleteMessage(uid, msgId).catch(e => {
          console.warn(`⚠️ Failed to delete msg ${msgId}:`, e.message);
        });
      }

      if (autobanEnabled.status) {
        await banUser(uid);
        console.log(`⛔️ AutoBan executed → ${uid}`);
      }
    } catch (err) {
      console.error("❌ [scheduleCleanup error]:", err.message);
    } finally {
      delete messages[uid];
      delete session.cleanupScheduled;
    }
  }, CLEANUP_TIMEOUT_MS);
}

/**
 * ✅ Divides long text into blocks of 4096 characters
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
