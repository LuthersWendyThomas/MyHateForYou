import { banUser } from "../../utils/bans.js";
import { autobanEnabled, autodeleteEnabled } from "../../config/features.js";
import { sendAndTrack } from "../../helpers/messageUtils.js";
import { userSessions, userMessages, activeTimers } from "../../state/userState.js";
import { BOT } from "../../config/config.js";

const FINAL_CLEANUP_TIMEOUT_MS = 27 * 60 * 1000;

/**
 * 🚚 Starts delivery simulation
 */
export async function simulateDelivery(bot, id, method = "drop", userMsgs = {}) {
  const uid = String(id);
  if (!bot || !uid) return;

  try {
    const session = userSessions[uid] ||= { step: 9, createdAt: Date.now() };
    if (session.deliveryInProgress) {
      debug(`⚠️ [simulateDelivery] Already in progress for ${uid}`);
      return;
    }

    session.deliveryInProgress = true;
    session.step = 9;

    const courier = method.toLowerCase() === "courier";
    const steps = courier
      ? [
          ["✅ Order confirmed!\n⏳ Preparing the shipment for the courier...", 0],
          ["🚚 Courier has moved!\nEstimated arrival: ~20min.", 5 * 60 * 1000],
          ["✅ Courier near location!\n⚠️ Wait for precise instructions.", 10 * 60 * 1000],
          ["✅ Delivery almost complete.\nPrepare for pickup.", 18 * 60 * 1000],
          ["📬 *Package delivered successfully.*\nStay safe."]
        ]
      : [
          ["✅ Order confirmed!\n⏳ Drop point is being prepared...", 0],
          ["📦 Drop travels to the location!\nPlacement: ~20min.", 5 * 60 * 1000],
          ["✅ Drop almost on spot!\n⚠️ Wait for coordinates.", 14 * 60 * 1000],
          ["📍 Drop placed.\nFollow the instructions you receive.", 19 * 60 * 1000],
          ["📬 *Package delivered successfully.*\nStay safe."]
        ];

    for (let i = 0; i < steps.length; i++) {
      const [text, delay = i * 60000] = steps[i];
      const isFinal = i === steps.length - 1;
      isFinal
        ? scheduleFinalStep(bot, uid, text, delay, userMsgs)
        : scheduleStep(bot, uid, text, delay, userMsgs);
    }

    if (activeTimers[uid]) clearTimeout(activeTimers[uid]);
    activeTimers[uid] = setTimeout(() => {
      triggerFinalCleanup(bot, uid, userMsgs);
      delete activeTimers[uid];
    }, FINAL_CLEANUP_TIMEOUT_MS);

  } catch (err) {
    console.error("❌ [simulateDelivery error]:", err.message || err);
  }
}

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
        setTimeout(() => {
          bot.deleteMessage(id, msg.message_id).catch(() => {});
        }, 15000);
      }
    } catch (err) {
      console.error("❌ [scheduleStep error]:", err.message);
    }
  }, delayMs);
}

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
        setTimeout(() => {
          bot.deleteMessage(id, msg.message_id).catch(() => {});
        }, 15000);
      }

      setTimeout(() => triggerFinalCleanup(bot, id, userMsgs), 7000);
    } catch (err) {
      console.error("❌ [scheduleFinalStep error]:", err.message);
    }
  }, delayMs);
}

async function triggerFinalCleanup(bot, id, userMsgs = {}) {
  try {
    const uid = String(id);
    if (!bot || !uid) return;

    const session = userSessions[uid];
    if (session?.cleanupScheduled) {
      debug(`⚠️ [triggerFinalCleanup] Already triggered for ${uid}`);
      return;
    }

    userSessions[uid] = { ...session, cleanupScheduled: true };
    const isAdmin = BOT.ADMIN_ID && uid === String(BOT.ADMIN_ID);

    if (autodeleteEnabled?.status && !isAdmin && Array.isArray(userMsgs[uid])) {
      for (const msgId of userMsgs[uid]) {
        if (typeof msgId === "number") {
          await bot.deleteMessage(uid, msgId).catch(() => {});
        }
      }
      delete userMessages[uid];
    }

    if (autobanEnabled?.status && !isAdmin) {
      await sendAndTrack(
        bot,
        uid,
        "⏳ *Session closed.*\n⛔️ Access has been restricted for security reasons.",
        { parse_mode: "Markdown" },
        userMsgs
      );
      await banUser(uid);
      console.warn(`⛔️ AutoBan executed → ${uid}`);
    }

    if (activeTimers[uid]) {
      clearTimeout(activeTimers[uid]);
      delete activeTimers[uid];
    }

    delete userSessions[uid];
    debug(`🧼 Final delivery cleanup complete → ${uid}`);
  } catch (err) {
    console.error("❌ [triggerFinalCleanup error]:", err.message);
  }
}

function shouldAutoDelete(id) {
  const uid = String(id);
  const isAdmin = BOT.ADMIN_ID && uid === String(BOT.ADMIN_ID);
  return autodeleteEnabled?.status && !isAdmin;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function debug(...args) {
  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(...args);
  }
}
