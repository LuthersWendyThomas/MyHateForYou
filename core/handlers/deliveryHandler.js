// 📦 core/handlers/deliveryHandler.js | IMMORTAL FINAL v2.0.0•99999999999999X•DIAMONDLOCK•SYNCED
// AUTO-STAGED DELIVERY • FSM CLEANUP • AUTODELETE + AUTOBAN • 24/7 IMMORTAL ENGINE

import { banUser } from "../../utils/bans.js";
import { autobanEnabled, autodeleteEnabled } from "../../config/features.js";
import { sendAndTrack } from "../../helpers/messageUtils.js";
import { userSessions, userMessages, activeTimers } from "../../state/userState.js";
import { BOT } from "../../config/config.js";
import { sendAdminPing } from "./paymentHandler.js";

const FINAL_CLEANUP_DELAY = 27 * 60 * 1000;

const DELIVERY_STEPS = {
  courier: [
    ["✅ Order confirmed!\n⏳ Preparing shipment...", 0],
    ["🚚 Courier en route! ETA ~20min.", 5 * 60_000],
    ["📍 Courier nearby! ⚠️ Await exact location...", 10 * 60_000],
    ["📬 Delivery in progress... Stand by.", 18 * 60_000],
    ["✅ *Package delivered successfully.* Stay safe.", null]
  ],
  drop: [
    ["✅ Order confirmed!\n⏳ Drop point is being prepared...", 0],
    ["📦 Drop en route! ETA ~20min.", 5 * 60_000],
    ["📍 Drop almost placed! ⚠️ Await coordinates.", 14 * 60_000],
    ["📬 Drop placed! Follow instructions.", 19 * 60_000],
    ["✅ *Package delivered successfully.* Stay safe.", null]
  ]
};

/**
 * 🚚 Initiate delivery flow
 */
export function simulateDelivery(bot, id, method = "drop") {
  const uid = sanitizeId(id);
  if (!bot?.sendMessage || !uid) return;

  const session = userSessions[uid] ||= { step: 9, createdAt: Date.now() };
  if (session.deliveryInProgress) {
    debug(`⚠️ Delivery already active: ${uid}`);
    return;
  }

  session.deliveryInProgress = true;
  session.step = 9;

  const steps = DELIVERY_STEPS[method.toLowerCase()] || DELIVERY_STEPS.drop;
  steps.forEach(([text, delay], i) => {
    const fn = i < steps.length - 1 ? sendStep : sendFinalStep;
    setTimeout(() => fn(bot, uid, text), delay ?? 0);
  });

  if (activeTimers[uid]) clearTimeout(activeTimers[uid]);
  activeTimers[uid] = setTimeout(() => {
    triggerCleanup(bot, uid);
    delete activeTimers[uid];
  }, FINAL_CLEANUP_DELAY);
}

async function sendStep(bot, uid, text) {
  await safeSend(bot, uid, text, true);
}

async function sendFinalStep(bot, uid, text) {
  await safeSend(bot, uid, text, false);
  setTimeout(() => triggerCleanup(bot, uid), 7_000);
}

    async function safeSend(bot, uid, text, silent) {
  try {
    await bot.sendChatAction(uid, "typing").catch(() => {});
    await wait(500);

    const msg = await sendAndTrack(
      bot,
      uid,
      text,
      {
        parse_mode: "Markdown",
        disable_notification: silent
      },
      userMessages
    );

    // ⏱️ Atnaujinti paskutinį veiksmą – debounce apsauga
    const session = userSessions[uid];
    if (session) session.lastActionTimestamp = Date.now();

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
    console.error("❌ [safeSend error]:", err);
  }
}

async function triggerCleanup(bot, uid) {
  const session = userSessions[uid];
  if (!session || session.cleanupScheduled) {
    debug(`⚠️ Cleanup already scheduled: ${uid}`);
    return;
  }

  session.cleanupScheduled = true;
  const isAdminUser = isAdmin(uid);

  // 🔥 Delete all messages
  if (autodeleteEnabled.status && !isAdminUser && Array.isArray(userMessages[uid])) {
    for (const msgId of userMessages[uid]) {
      bot.deleteMessage(uid, msgId).catch(() => {});
    }
    delete userMessages[uid];
  }

  // ⛔ Autoban
  if (autobanEnabled.status && !isAdminUser) {
    try {
      await sendAndTrack(
        bot,
        uid,
        "⏳ *Session closed.*\n⛔️ Access restricted for security reasons.",
        { parse_mode: "Markdown" },
        userMessages
      );
    } catch {}

    await banUser(uid);
    console.warn(`⛔️ Auto-banned user ${uid}`);

    await sendAdminPing(
      `⛔️ *Auto-ban/delete completed*\n` +
      `👤 UID: \`${uid}\`\n` +
      `📦 Product: *${session.product?.name || "—"}*\n` +
      `💵 Total: *$${session.totalPrice?.toFixed(2) || "0.00"}*\n` +
      `🔚 Delivery completed + cleanup done`
    );
  }

  cleanupSession(uid);
  debug(`✅ Cleanup complete: ${uid}`);
}

function cleanupSession(uid) {
  if (activeTimers[uid]) {
    clearTimeout(activeTimers[uid]);
    delete activeTimers[uid];
  }

  const session = userSessions[uid];
  if (session) {
    session.deliveryInProgress = false;
  }

  delete userSessions[uid];
}

function isAdmin(uid) {
  return String(uid) === String(BOT.ADMIN_ID);
}

function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function debug(...args) {
  if (process.env.DEBUG_MESSAGES === "true") {
    console.log(...args);
  }
}

function sanitizeId(id) {
  const s = String(id || "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}
