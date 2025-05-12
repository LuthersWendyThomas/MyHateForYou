// 📦 helpers/messageUtils.js | FINAL IMMORTAL v99999999999.∞+3 — TITANLOCK GODMODE SYNCED + ULTRA BULLETPROOF

import { autobanEnabled, autodeleteEnabled } from "../config/features.js";
import { userSessions, userMessages } from "../state/userState.js";
import { banUser } from "../utils/bans.js";
import { BOT } from "../config/config.js";

const CLEANUP_TIMEOUT_MS = 27 * 60 * 1000; // Default cleanup timeout (27 minutes)
const MAX_MESSAGE_LENGTH = 4096; // Telegram message size limit

/**
 * ✅ Core message sender with tracking (Markdown, silent, chunked)
 */
export async function sendAndTrack(bot, id, text, options = {}, messages = userMessages) {
  if (!bot || !id || !text?.trim()) {
    logError("❌ [sendAndTrack]", "Invalid bot, user ID, or text input", id);
    return null;
  }

  const chunks = splitMessage(text);
  let firstMsg = null;

  for (const chunk of chunks) {
    const msg = await safeSend(bot, id, chunk, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      ...options,
    });

    if (msg?.message_id) {
      trackMessage(id, msg.message_id, messages);
      logAction("📬 [sendAndTrack]", `Tracked message → ${id}`, msg.message_id);
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
  if (!bot || !id || !text?.trim()) {
    logError("❌ [sendPlain]", "Invalid bot, user ID, or text input", id);
    return null;
  }

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
 * 💎 GODMODE sendKeyboard — guarantees all buttons are displayed
 */
export async function sendKeyboard(bot, id, text, keyboard, messages = userMessages, options = {}) {
  if (!bot || !id || !text || !keyboard) {
    logError("❌ [sendKeyboard]", "Invalid bot, user ID, text, or keyboard input", id);
    return null;
  }

  try {
    const normalizedKeyboard = normalizeKeyboard(keyboard);
    logAction("✅ [sendKeyboard Debug]", JSON.stringify(normalizedKeyboard, null, 2)); // Debugging output

    const replyMarkup = {
      keyboard: normalizedKeyboard,
      resize_keyboard: true,
      one_time_keyboard: false,
      selective: false,
    };

    return await sendAndTrack(bot, id, text, { reply_markup: replyMarkup, ...options }, messages);
  } catch (err) {
    logError("❌ [sendKeyboard error]", err, id);
    return await safeSend(bot, id, text).catch(() => null);
  }
}

/**
 * ✅ Photo sender with tracking
 */
export async function sendPhotoAndTrack(bot, id, photo, options = {}, messages = userMessages) {
  if (!bot || !id || !photo) {
    logError("❌ [sendPhotoAndTrack]", "Invalid bot, user ID, or photo input", id);
    return null;
  }

  try {
    const msg = await bot
      .sendPhoto(id, photo, {
        parse_mode: "Markdown",
        ...options,
      })
      .catch((e) => {
        logError("⚠️ [sendPhoto error]", e, id);
        return null;
      });

    if (msg?.message_id) {
      trackMessage(id, msg.message_id, messages);
      logAction("🖼️ [sendPhotoAndTrack]", `Tracked photo → ${id}`, msg.message_id);
    }

    scheduleCleanup(bot, id, messages);
    return msg;
  } catch (err) {
    logError("❌ [sendPhotoAndTrack error]", err, id);
    return null;
  }
}

/**
 * 🔔 Silent user notification
 */
export async function tryNotify(bot, id, text) {
  if (!bot || !id || !text) return;
  try {
    await bot.sendMessage(id, text, { disable_notification: true }).catch(() => {});
  } catch (err) {
    logError("⚠️ [tryNotify error]", err, id);
  }
}

/**
 * ✅ Safe alert message (Markdown)
 */
export async function safeAlert(bot, id, text) {
  try {
    return await bot.sendMessage(id, text, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (err) {
    logError("⚠️ [safeAlert failed]", err, id);
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
    logError("⚠️ [safeSend] Failed", err, id);
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
  logAction("🧹 [scheduleCleanup]", `Cleanup scheduled → ${uid}`);

  setTimeout(async () => {
    try {
      const msgIds = Array.isArray(messages[uid]) ? messages[uid] : [];
      for (const msgId of msgIds) {
        await bot.deleteMessage(uid, msgId).catch((e) => {
          logError(`⚠️ [Delete failed #${msgId}]`, e, uid);
        });
      }

      if (autobanEnabled.status) {
        await banUser(uid);
        logAction("⛔️ [scheduleCleanup]", `Auto-banned → ${uid}`);
      } else {
        logAction("✅ [scheduleCleanup]", `Cleanup complete → ${uid}`);
      }
    } catch (err) {
      logError("❌ [scheduleCleanup error]", err, uid);
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
  if (!Array.isArray(keyboard)) {
    logError("⚠️ [normalizeKeyboard]", new Error("Invalid keyboard structure"));
    return [];
  }

  return keyboard.map((row) => {
    if (Array.isArray(row)) {
      return row.map((button) => {
        if (!button?.text) {
          logError("⚠️ [normalizeKeyboard]", new Error("Button missing 'text' property"));
          return { text: "❌ Invalid Button" }; // Fallback for invalid buttons
        }
        return String(button.text).trim();
      });
    }
    return [String(row).trim()];
  });
}

/**
 * 📝 Logs successful actions
 */
function logAction(action, message, id = null) {
  console.log(`${new Date().toISOString()} ${action} → ${message}${id ? ` (ID: ${id})` : ""}`);
}

/**
 * ⚠️ Logs errors
 */
function logError(action, error, id = null) {
  console.error(`${new Date().toISOString()} ${action} → ${error.message || error}${id ? ` (ID: ${id})` : ""}`);
}
