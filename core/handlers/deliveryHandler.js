// 📦 core/handlers/deliveryHandler.js | IMMORTAL FINAL v999999999999.∞
// AUTO-BAN • AUTO-DELETE • FINAL CLEANUP • FULL LOCKED

import { banUser } from "../../utils/bans.js";
import { autobanEnabled, autodeleteEnabled } from "../../config/features.js";
import { sendAndTrack } from "../../helpers/messageUtils.js";
import { userSessions, userMessages, activeTimers } from "../../state/userState.js";
import { BOT } from "../../config/config.js";

const FINAL_CLEANUP_TIMEOUT_MS = 27 * 60 * 1000;

/**
 * 🚚 Start full delivery flow (drop or courier)
 */
export async function simulateDelivery(bot, id, method = "drop", userMsgs = {}) {
  const uid = String(id);
  if (!bot || !uid) return;

  try {
    const session = userSessions[uid] ||= { step: 9, createdAt: Date.now() };
    if (session.deliveryInProgress) {
      debug(`⚠️ Delivery already running → ${uid}`);
      return;
    }

    session.deliveryInProgress = true;
    session.step = 9;

    const courier = method.toLowerCase() === "courier";
    const steps = courier
      ? [
          ["✅ Order confirmed!\n⏳ Preparing shipment...", 0],
          ["🚚 Courier en route!\nETA ~20min.", 5 * 60 * 1000],
          ["📍 Courier nearby!\n⚠️ Await exact location...", 10 * 60 * 1000],
          ["📬 Delivery in progress...\nStand by.", 18 * 60 * 1000],
          ["✅ *Package delivered successfully.*\nStay safe."]
        ]
      : [
          ["✅ Order confirmed!\n⏳ Drop point is being prepared...", 0],
          ["📦 Drop en route!\nETA ~20min.", 5 * 60 * 1000],
          ["📍 Drop almost placed!\n⚠️ Await coordinates.", 14 * 60 * 1000],
          ["📬 Drop placed!\nFollow instructions.", 19 * 60 * 1000],
          ["✅ *Package delivered successfully.*\nStay safe."]
        ];

    steps.forEach(([text, delay], index) => {
      const isFinal = index === steps.length - 1;
      isFinal
        ? scheduleFinalStep(bot, uid, text, delay, userMsgs)
        : scheduleStep(bot, uid, text, delay, userMsgs);
    });

    if (activeTimers[uid]) clearTimeout(activeTimers[uid]);

    activeTimers[uid] = setTimeout(() => {
      triggerFinalCleanup(bot, uid, userMsgs);
      delete activeTimers[uid];
    }, FINAL_CLEANUP_TIMEOUT_MS);

  } catch (err) {
    console.error("❌ [simulateDelivery error]:", err.message);
  }
}

/**
 * ⏱️ Intermediate step with optional auto-delete
 */
function scheduleStep(bot, id, text, delayMs = 0, userMsgs = {}) {
  setTimeout(async () => {
    try {
      await bot.sendChatAction(id, "typing").catch(() => {});
      await wait(600);
      const msg = await sendAndTrack(bot, id, text, {
        parse_mode: "Markdown",
        disable_notification: true
      }, userMsgs);

      if (shouldAutoDelete(id) && msg?.message_id) {
        setTimeout(() => bot.deleteMessage(id, msg.message_id).catch(() => {}), 15000);
      }
    } catch (err) {
      console.error("❌ [scheduleStep error]:", err.message);
    }
  }, delayMs);
}

/**
 * ✅ Final step → triggers full cleanup + ban
 */
function scheduleFinalStep(bot, id, text, delayMs = 0, userMsgs = {}) {
  setTimeout(async () => {
    try {
      await bot.sendChatAction(id, "typing").catch(() => {});
      await wait(600);
      const msg = await sendAndTrack(bot, id, text, {
        parse_mode: "Markdown",
        disable_notification: false
      }, userMsgs);

      if (shouldAutoDelete(id) && msg?.message_id) {
        setTimeout(() => bot.deleteMessage(id, msg.message_id).catch(() => {}), 15000);
      }

      setTimeout(() => triggerFinalCleanup(bot, id, userMsgs), 7000);
    } catch (err) {
      console.error("❌ [scheduleFinalStep error]:", err.message);
    }
  }, delayMs);
}

/**
 * 🧼 Destroys session, deletes all messages, bans user if needed
 */
async function triggerFinalCleanup(bot, id, userMsgs = {}) {
  const uid = String(id);
  try {
    const session = userSessions[uid];
    if (session?.cleanupScheduled) {
      debug(`⚠️ Cleanup already triggered → ${uid}`);
      return;
    }

    userSessions[uid] = { ...session, cleanupScheduled: true };
    const isAdmin = BOT.ADMIN_ID && uid === String(BOT.ADMIN_ID);

    // 💬 Delete all previous messages
    if (autodeleteEnabled?.status && !isAdmin && Array.isArray(userMsgs[uid])) {
      for (const msgId of userMsgs[uid]) {
        if (typeof msgId === "number") {
          try {
            await bot.deleteMessage(uid, msgId).catch(() => {});
          } catch (_) {}
        }
      }
      delete userMessages[uid];
    }

    // 🔒 Auto-ban
    if (autobanEnabled?.status && !isAdmin) {
      await sendAndTrack(bot, uid,
        "⏳ *Session closed.*\n⛔️ Access has been restricted for security reasons.",
        { parse_mode: "Markdown" },
        userMsgs
      );
      await banUser(uid);
      console.warn(`⛔️ AutoBan → ${uid}`);
    }

    // 🧯 Final session cleanup
    if (activeTimers[uid]) {
      clearTimeout(activeTimers[uid]);
      delete activeTimers[uid];
    }

    delete userSessions[uid];
    debug(`🧼 Cleanup complete → ${uid}`);
  } catch (err) {
    console.error("❌ [triggerFinalCleanup error]:", err.message);
  }
}

/**
 * ⚠️ Should messages be auto-deleted?
 */
function shouldAutoDelete(id) {
  const uid = String(id);
  const isAdmin = BOT.ADMIN_ID && uid === String(BOT.ADMIN_ID);
  return autodeleteEnabled?.status && !isAdmin;
}

/**
 * ⏱️ Wait helper
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 🐛 Debug logging
 */
function debug(...args) {
  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(...args);
  }
}
