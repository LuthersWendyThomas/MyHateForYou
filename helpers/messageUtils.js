// 📦 helpers/messageUtils.js | IMMORTAL FINAL v1.0.3•DIAMONDLOCK•SYNCED•QRREADY•BULLETPROOF

import { autobanEnabled, autodeleteEnabled } from "../config/features.js";
import { userSessions, userMessages } from "../state/userState.js";
import { banUser } from "../utils/bans.js";
import { BOT } from "../config/config.js";
import { getAmountFilename } from "../utils/fallbackPathUtils.js"; // ✅ fallback-based tracking

const CLEANUP_DELAY_MS = 27 * 60 * 1000;
const MAX_TELEGRAM_LENGTH = 4096;

// ——— PUBLIC SENDERS ———

export async function sendAndTrack(bot, id, text, options = {}, messages = userMessages) {
  const uid = sanitizeId(id);
  if (!bot || !uid || !text?.trim()) return null;

  let firstMsg = null;
  for (const chunk of splitText(text)) {
    const msg = await safeSend(bot, uid, chunk, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      ...options
    });
    if (msg?.message_id) {
      track(uid, msg.message_id, messages);
      logAction("📬 sendAndTrack", `→ ${uid}`, msg.message_id);
      firstMsg ||= msg;
    }
  }

  scheduleCleanup(bot, uid, messages);
  return firstMsg;
}

export async function sendPlain(bot, id, text, messages = userMessages) {
  const uid = sanitizeId(id);
  if (!bot || !uid || !text?.trim()) return null;

  let firstMsg = null;
  for (const chunk of splitText(text)) {
    const msg = await safeSend(bot, uid, chunk);
    if (msg?.message_id) {
      track(uid, msg.message_id, messages);
      firstMsg ||= msg;
    }
  }

  scheduleCleanup(bot, uid, messages);
  return firstMsg;
}

export async function sendKeyboard(bot, id, text, keyboard, messages = userMessages, options = {}) {
  const uid = sanitizeId(id);
  if (!bot || !uid || !text || !Array.isArray(keyboard)) return null;

  try {
    const markup = {
      keyboard: normalizeKeyboard(keyboard),
      resize_keyboard: true,
      one_time_keyboard: false,
      selective: false
    };
    logAction("✅ sendKeyboard", `Keyboard → ${uid}`);
    return await sendAndTrack(bot, uid, text, { reply_markup: markup, ...options }, messages);
  } catch (err) {
    logError("❌ sendKeyboard", err, uid);
    return await safeSend(bot, uid, text).catch(() => null);
  }
}

// 📦 helpers/messageUtils.js | IMMORTAL FINAL v1.0.3•DIAMONDLOCK•SYNCED•QRREADY•BULLETPROOF

export async function sendPhotoAndTrack(bot, id, photo, options = {}, messages = userMessages) {
  const uid = sanitizeId(id);
  if (!bot || !uid || !photo) return null;

  try {
    // Ensure the photo is sent as a file or buffer, not a URL to prevent URI size issues
    const source = isBuffer(photo) || isFile(photo) ? photo : { source: photo };

    const msg = await bot.sendPhoto(uid, source, {
      parse_mode: "Markdown",
      ...options
    }).catch(e => {
      logError("⚠️ sendPhoto", e, uid);
      return null;
    });

    if (msg?.message_id) {
      track(uid, msg.message_id, messages);
      logAction("🖼️ sendPhotoAndTrack", `→ ${uid}`, msg.message_id);
    }

    // Scheduling cleanup after the photo is sent successfully
    scheduleCleanup(bot, uid, messages);
    return msg;
  } catch (err) {
    logError("❌ sendPhotoAndTrack", err, uid);
    return null;
  }
}

// Helper function to determine if the source is a valid buffer or file
function isBuffer(source) {
  return Buffer.isBuffer(source);
}

function isFile(source) {
  return source && typeof source === 'object' && source.path;
}

export async function tryNotify(bot, id, text) {
  const uid = sanitizeId(id);
  if (!bot || !uid || !text) return;
  try {
    await bot.sendMessage(uid, text, { disable_notification: true }).catch(() => {});
  } catch (err) {
    logError("⚠️ tryNotify", err, uid);
  }
}

export async function safeAlert(bot, id, text) {
  const uid = sanitizeId(id);
  if (!bot || !uid || !text) return null;
  try {
    return await bot.sendMessage(uid, text, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    });
  } catch (err) {
    logError("⚠️ safeAlert", err, uid);
    return null;
  }
}

export async function safeSend(bot, id, text, options = {}) {
  const uid = sanitizeId(id);
  if (!bot || !uid || !text) return null;
  try {
    return await bot.sendMessage(uid, text, options);
  } catch (err) {
    logError("⚠️ safeSend", err, uid);
    return null;
  }
}

// ——— HELPERS ———

function track(uid, msgId, messages) {
  if (!messages[uid]) messages[uid] = [];
  if (!messages[uid].includes(msgId)) messages[uid].push(msgId);
}

function scheduleCleanup(bot, uid, messages) {
  if (!(autodeleteEnabled.status || autobanEnabled.status)) return;
  const session = userSessions[uid];
  if (!session || session.cleanupScheduled) return;
  if (BOT.ADMIN_ID && uid === String(BOT.ADMIN_ID)) return;

  session.cleanupScheduled = true;
  logAction("🧹 scheduleCleanup", `→ ${uid}`);

  setTimeout(async () => {
    try {
      const ids = Array.isArray(messages[uid]) ? messages[uid] : [];
      for (const msgId of ids) {
        await bot.deleteMessage(uid, msgId).catch(e => {
          logError("⚠️ deleteMessage", e, uid);
        });
      }

      // ✅ Saugus autoban tik jei pristatymas buvo pradėtas
      if (autobanEnabled.status && session?.deliveryInProgress) {
        await banUser(uid);
        logAction("⛔ scheduleCleanup", `Auto-banned → ${uid}`);
      } else {
        logAction("✅ scheduleCleanup", `Deleted ${ids.length} messages → ${uid}`);
      }
    } catch (err) {
      logError("❌ scheduleCleanup", err, uid);
    } finally {
      delete messages[uid];
      if (userSessions[uid]) delete userSessions[uid].cleanupScheduled;
    }
  }, CLEANUP_DELAY_MS);
}

function splitText(text) {
  if (typeof text !== "string" || !text.length) return [""];
  const chunks = [];
  for (let i = 0; i < text.length; i += MAX_TELEGRAM_LENGTH) {
    chunks.push(text.slice(i, i + MAX_TELEGRAM_LENGTH));
  }
  return chunks;
}

function normalizeKeyboard(keyboard) {
  return keyboard.map((row, rIdx) => {
    if (!Array.isArray(row)) {
      logError("⚠️ normalizeKeyboard", new Error(`Row ${rIdx} not array`));
      return [{ text: "❌ Invalid" }];
    }
    return row.map((btn, cIdx) => {
      if (typeof btn === "string") {
        return { text: btn.trim() };
      }
      if (btn && typeof btn.text === "string") {
        return {
          text: btn.text.trim(),
          ...(btn.callback_data ? { callback_data: String(btn.callback_data).trim() } : {})
        };
      }
      logError("⚠️ normalizeKeyboard", new Error(`Invalid button at [${rIdx},${cIdx}]`));
      return { text: "❌ Invalid" };
    });
  });
}

function sanitizeId(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

function logAction(action, msg, id = "") {
  console.log(`${new Date().toISOString()} ${action} → ${msg}${id ? ` (ID: ${id})` : ""}`);
}

function logError(action, err, id = "") {
  const m = err?.message || err;
  console.error(`${new Date().toISOString()} ${action} → ${m}${id ? ` (ID: ${id})` : ""}`);
}
