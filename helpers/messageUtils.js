// 📦 helpers/messageUtils.js | IMMORTAL FINAL v99999999999.∞+DIAMONDLOCK

import { autobanEnabled, autodeleteEnabled } from "../config/features.js";
import { userSessions, userMessages } from "../state/userState.js";
import { banUser } from "../utils/bans.js";
import { BOT } from "../config/config.js";

const CLEANUP_TIMEOUT_MS = 27 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 4096;

/**
 * ✅ Core tracked message sender (Markdown, chunked)
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
      logAction("📬 [sendAndTrack]", `→ ${id}`, msg.message_id);
    }

    if (!firstMsg && msg) firstMsg = msg;
  }

  scheduleCleanup(bot, id, messages);
  return firstMsg;
}

/**
 * ✅ Plain text sender (no Markdown)
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
 * 💎 GODMODE keyboard sender — 10000% reliable layout
 */
export async function sendKeyboard(bot, id, text, keyboard, messages = userMessages, options = {}) {
  if (!bot || !id || !text || !keyboard) return null;

  try {
    const normalized = normalizeKeyboard(keyboard);
    logAction("✅ [sendKeyboard]", `Keyboard sent to ${id}`);

    const markup = {
      keyboard: normalized,
      resize_keyboard: true,
      one_time_keyboard: false,
      selective: false
    };

    return await sendAndTrack(bot, id, text, { reply_markup: markup, ...options }, messages);
  } catch (err) {
    logError("❌ [sendKeyboard error]", err, id);
    return await safeSend(bot, id, text).catch(() => null);
  }
}

/**
 * ✅ Sends photo with tracking
 */
export async function sendPhotoAndTrack(bot, id, photo, options = {}, messages = userMessages) {
  if (!bot || !id || !photo) return null;

  try {
    const msg = await bot.sendPhoto(id, photo, { parse_mode: "Markdown", ...options }).catch((e) => {
      logError("⚠️ [sendPhoto error]", e, id);
      return null;
    });

    if (msg?.message_id) {
      trackMessage(id, msg.message_id, messages);
      logAction("🖼️ [sendPhotoAndTrack]", `→ ${id}`, msg.message_id);
    }

    scheduleCleanup(bot, id, messages);
    return msg;
  } catch (err) {
    logError("❌ [sendPhotoAndTrack error]", err, id);
    return null;
  }
}

/**
 * 🔕 Silent notifier
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
 * ✅ Markdown alert
 */
export async function safeAlert(bot, id, text) {
  try {
    return await bot.sendMessage(id, text, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    });
  } catch (err) {
    logError("⚠️ [safeAlert failed]", err, id);
    return null;
  }
}

/**
 * 🛡️ Fallback sender
 */
export async function safeSend(bot, id, text, options = {}) {
  try {
    return await bot.sendMessage(id, text, options);
  } catch (err) {
    logError("⚠️ [safeSend failed]", err, id);
    return null;
  }
}

/**
 * 🧠 Message tracker
 */
function trackMessage(id, msgId, messages = userMessages) {
  const uid = String(id || "").trim();
  if (!uid || !msgId) return;

  if (!messages[uid]) messages[uid] = [];
  if (!messages[uid].includes(msgId)) messages[uid].push(msgId);
}

/**
 * 🧼 Cleanup scheduler
 */
function scheduleCleanup(bot, id, messages = userMessages) {
  if (!autodeleteEnabled.status && !autobanEnabled.status) return;

  const uid = String(id || "").trim();
  const session = userSessions[uid];
  if (!session || session.cleanupScheduled) return;
  if (BOT.ADMIN_ID && uid === String(BOT.ADMIN_ID)) return;

  session.cleanupScheduled = true;
  logAction("🧹 [scheduleCleanup]", `→ ${uid}`);

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
        logAction("⛔️ [scheduleCleanup] Auto-banned →", uid);
      } else {
        logAction("✅ [scheduleCleanup] Cleanup complete →", uid);
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
 * ✂️ Message chunker (4096 max)
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
 * 🧩 Safe keyboard normalizer
 */
function normalizeKeyboard(keyboard) {
  if (!Array.isArray(keyboard)) {
    logError("⚠️ [normalizeKeyboard]", new Error("Invalid keyboard array"));
    return [];
  }

  return keyboard.map((row, rIdx) => {
    if (!Array.isArray(row)) {
      logError("⚠️ [normalizeKeyboard]", new Error(`Row ${rIdx} is not an array`));
      return [fallbackButton()];
    }

    return row.map((btn, bIdx) => {
      if (typeof btn === "string") return btn.trim();
      if (typeof btn?.text === "string") return btn.text.trim();

      logError("⚠️ [normalizeKeyboard]", new Error(`Invalid button @ row:${rIdx}, col:${bIdx}`));
      return fallbackButton();
    });
  });
}

function fallbackButton() {
  return "❌ Invalid";
}

/**
 * 📄 Logger
 */
function logAction(action, msg, id = null) {
  console.log(`${new Date().toISOString()} ${action} → ${msg}${id ? ` (ID: ${id})` : ""}`);
}

function logError(action, err, id = null) {
  console.error(`${new Date().toISOString()} ${action} → ${err.message || err}${id ? ` (ID: ${id})` : ""}`);
}
