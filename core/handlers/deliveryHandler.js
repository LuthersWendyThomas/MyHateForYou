// 📦 core/handlers/deliveryHandler.js | IMMORTAL FINAL v9999999999.∞+DIAMONDLOCK
// AUTO-STAGED DELIVERY • FSM CLEANUP • AUTO-BAN • AUTO-DELETE • 24/7 BULLETPROOF

import { banUser } from "../../utils/bans.js";
import { autobanEnabled, autodeleteEnabled } from "../../config/features.js";
import { sendAndTrack } from "../../helpers/messageUtils.js";
import { userSessions, userMessages, activeTimers } from "../../state/userState.js";
import { BOT } from "../../config/config.js";

const FINAL_CLEANUP_TIMEOUT_MS = 27 * 60 * 1000;

const DELIVERY_STEPS = {
  courier: [
    ["✅ Order confirmed!\n⏳ Preparing shipment...", 0],
    ["🚚 Courier en route!\nETA ~20min.", 5 * 60 * 1000],
    ["📍 Courier nearby!\n⚠️ Await exact location...", 10 * 60 * 1000],
    ["📬 Delivery in progress...\nStand by.", 18 * 60 * 1000],
    ["✅ *Package delivered successfully.*\nStay safe."]
  ],
  drop: [
    ["✅ Order confirmed!\n⏳ Drop point is being prepared...", 0],
    ["📦 Drop en route!\nETA ~20min.", 5 * 60 * 1000],
    ["📍 Drop almost placed!\n⚠️ Await coordinates.", 14 * 60 * 1000],
    ["📬 Drop placed!\nFollow instructions.", 19 * 60 * 1000],
    ["✅ *Package delivered successfully.*\nStay safe."]
  ]
};

export async function simulateDelivery(bot, id, method = "drop", userMsgs = {}) {
  const uid = String(id || "").trim();
  if (!bot || !uid) return;

  try {
    const session = userSessions[uid] ||= { step: 9, createdAt: Date.now() };

    if (session.deliveryInProgress) {
      logDebug(`⚠️ Delivery already in progress → ${uid}`);
      return;
    }

    session.deliveryInProgress = true;
    session.step = 9;

    const steps = DELIVERY_STEPS[method.toLowerCase()] || DELIVERY_STEPS.drop;

    steps.forEach(([text, delay], index) => {
      const isFinal = index === steps.length - 1;
      const fn = isFinal ? scheduleFinalStep : scheduleStep;
      fn(bot, uid, text, delay, userMsgs);
    });

    if (activeTimers[uid]) clearTimeout(activeTimers[uid]);

    activeTimers[uid] = setTimeout(() => {
      triggerFinalCleanup(bot, uid, userMsgs);
      delete activeTimers[uid];
    }, FINAL_CLEANUP_TIMEOUT_MS);
  } catch (err) {
    console.error("❌ [simulateDelivery error]:", err.message || err);
  }
}

function scheduleStep(bot, id, text, delay = 0, userMsgs = {}) {
  setTimeout(() => safeSendStep(bot, id, text, true, userMsgs), delay);
}

function scheduleFinalStep(bot, id, text, delay = 0, userMsgs = {}) {
  setTimeout(() => {
    safeSendStep(bot, id, text, false, userMsgs).then(() => {
      setTimeout(() => triggerFinalCleanup(bot, id, userMsgs), 7000);
    });
  }, delay);
}

async function safeSendStep(bot, id, text, silent = true, userMsgs = {}) {
  try {
    await bot.sendChatAction(id, "typing").catch(() => {});
    await wait(500);

    const msg = await sendAndTrack(bot, id, text, {
      parse_mode: "Markdown",
      disable_notification: silent
    }, userMsgs);

    if (shouldAutoDelete(id) && msg?.message_id) {
      setTimeout(() => bot.deleteMessage(id, msg.message_id).catch(() => {}), 15000);
    }
  } catch (err) {
    console.error("❌ [safeSendStep error]:", err.message || err);
  }
}

async function triggerFinalCleanup(bot, id, userMsgs = {}) {
  const uid = String(id || "").trim();
  try {
    const session = userSessions[uid];
    if (session?.cleanupScheduled) {
      logDebug(`⚠️ Cleanup already triggered → ${uid}`);
      return;
    }

    userSessions[uid] = { ...(session || {}), cleanupScheduled: true };
    const isAdmin = BOT.ADMIN_ID && uid === String(BOT.ADMIN_ID);

    // Delete all tracked messages (if not admin)
    if (autodeleteEnabled.status && !isAdmin && Array.isArray(userMsgs[uid])) {
      for (const msgId of userMsgs[uid]) {
        if (typeof msgId === "number") {
          try {
            await bot.deleteMessage(uid, msgId).catch(() => {});
          } catch (_) {}
        }
      }
      delete userMessages[uid];
    }

    // Auto-ban if enabled and not admin
    if (autobanEnabled.status && !isAdmin) {
      await sendAndTrack(bot, uid,
        "⏳ *Session closed.*\n⛔️ Access has been restricted for security reasons.",
        { parse_mode: "Markdown" },
        userMsgs
      );
      await banUser(uid);
      console.warn(`⛔️ AutoBan → ${uid}`);
    }

    await cleanupDeliverySession(uid);
    logDebug(`🧼 Cleanup complete → ${uid}`);
  } catch (err) {
    console.error("❌ [triggerFinalCleanup error]:", err.message || err);
  }
}

async function cleanupDeliverySession(uid) {
  try {
    if (activeTimers[uid]) {
      clearTimeout(activeTimers[uid]);
      delete activeTimers[uid];
    }
    delete userSessions[uid];
  } catch (err) {
    console.error("❌ [cleanupDeliverySession error]:", err.message || err);
  }
}

function shouldAutoDelete(id) {
  const uid = String(id || "").trim();
  return autodeleteEnabled.status && uid !== String(BOT.ADMIN_ID);
}

function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function logDebug(...args) {
  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(...args);
  }
}
