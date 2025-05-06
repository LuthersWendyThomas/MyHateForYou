import { banUser } from "../../utils/bans.js";
import { autobanEnabled, autodeleteEnabled } from "../../config/features.js";
import { sendAndTrack } from "../../helpers/messageUtils.js";
import {
  userSessions,
  userMessages,
  activeTimers
} from "../../state/userState.js";
import { BOT } from "../../config/config.js";

const FINAL_CLEANUP_TIMEOUT_MS = 27 * 60 * 1000;

/**
 * Starts the delivery process with automated steps
 */
export async function simulateDelivery(bot, id, method = "drop", userMsgs = {}) {
  try {
    const uid = String(id);
    if (!bot || !uid) throw new Error("Missing bot or ID");

    const session = userSessions[uid] ||= {
      step: 9,
      createdAt: Date.now()
    };

    if (session.deliveryInProgress) return;
    session.deliveryInProgress = true;

    const isCourier = method.toLowerCase() === "courier";
    const steps = isCourier
      ? [
          ["✅ Order confirmed!\n⏳ Preparing the shipment for the courier...", 0],
          ["🚚 The courier has moved!\nEstimated arrival: ~20min.", 5 * 60 * 1000],
          ["✅ Courier near the location!\n⚠️ Wait for precise instructions.", 10 * 60 * 1000],
          ["✅ Delivery almost complete.\nPrepare for pickup.", 18 * 60 * 1000]
        ]
      : [
          ["✅ Order confirmed!\n⏳ Drop point is being prepared...", 0],
          ["📦 Drop travels to the location!\nEstimated placement: ~20min.", 5 * 60 * 1000],
          ["✅ Drop almost on the spot!\n⚠️ Wait for coordinates.", 14 * 60 * 1000],
          ["📍 Drop placed.\nFollow the instructions you receive.", 19 * 60 * 1000]
        ];

    for (const [text, delay] of steps) {
      scheduleStep(bot, uid, text, delay, userMsgs);
    }

    const cleanupTimer = setTimeout(() => {
      triggerFinalCleanup(bot, uid, userMsgs);
      delete activeTimers[uid];
    }, FINAL_CLEANUP_TIMEOUT_MS);

    activeTimers[uid] = cleanupTimer;

  } catch (err) {
    console.error("❌ [simulateDelivery error]:", err.message);
  }
}

/**
 * Vykdo pavėluotą žingsnio pranešimą su galimu delete
 */
function scheduleStep(bot, id, text, delayMs = 0, userMsgs = {}) {
  setTimeout(async () => {
    try {
      if (!bot || !id) return;

      await bot.sendChatAction(id, "typing").catch(() => {});
      await new Promise(res => setTimeout(res, 800));

      const msg = await sendAndTrack(
        bot,
        id,
        text,
        { parse_mode: "Markdown", disable_notification: true },
        userMsgs
      );

      const isAdmin = BOT.ADMIN_ID && String(id) === String(BOT.ADMIN_ID);
      if (autodeleteEnabled?.status && !isAdmin && msg?.message_id) {
        setTimeout(() => {
          bot.deleteMessage(id, msg.message_id).catch(() => {});
        }, 15000);
      }

    } catch (err) {
      console.error("❌ [scheduleStep error]:", err.message);
    }
  }, delayMs);
}

/**
 * Galutinis išvalymas po pristatymo: žinutės, ban, sesija
 */
async function triggerFinalCleanup(bot, id, userMsgs = {}) {
  try {
    const uid = String(id);
    if (!bot || !uid) return;

    const session = userSessions[uid];
    if (session?.cleanupScheduled) return;

    userSessions[uid] = {
      ...session,
      cleanupScheduled: true
    };

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
        "⏳ *Session ended.*\n⛔️ Access is restricted by security policy.",
        { parse_mode: "Markdown" },
        userMsgs
      );
      await banUser(uid);
      console.warn(`⛔️ AutoBan executed → ${uid}`);
    }

    delete userSessions[uid];
    console.log(`🧼 Session cleared: ${uid}`);

  } catch (err) {
    console.error("❌ [triggerFinalCleanup error]:", err.message);
  }
}
