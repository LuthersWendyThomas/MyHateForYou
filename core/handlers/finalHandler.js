// 📦 core/handlers/finalHandler.js | IMMORTAL FINAL v999999999999999.∞+ULTRA-SYNC
// GODMODE • RESET-PROOF • DELIVERY-READY • GREETING DYNAMIC • CLEAN STATE MACHINE • 24/7 LOCKED

import fs from "fs/promises";
import path from "path";
import { sendAndTrack, sendPhotoAndTrack } from "../../helpers/messageUtils.js";
import { getMainMenu } from "../../helpers/menu.js";
import { clearTimers, clearUserMessages, resetUser } from "../../state/stateManager.js";
import { userSessions, userMessages, activeUsers, paymentTimers } from "../../state/userState.js";
import { simulateDelivery } from "./deliveryHandler.js";

/**
 * 🚀 Safe session start (/start command)
 */
export async function safeStart(bot, id) {
  const uid = sanitizeId(id);
  if (!bot || !uid) return;

  try {
    await fullSessionReset(uid);
    userSessions[uid] = { step: 1, createdAt: Date.now() };
    activeUsers.add(uid);

    const greetingPath = path.join(process.cwd(), "assets", "greeting.jpg");
    let buffer = null;

    try {
      buffer = await fs.readFile(greetingPath);
    } catch (err) {
      console.warn("⚠️ [safeStart] No greeting.jpg found:", err.message);
    }

    const text = buffer?.byteLength > 10
      ? undefined
      : `✅ Welcome to *BalticPharmacyBot*!\n\n${fallbackText(activeUsers.size)}`;

    return buffer
      ? sendPhotoAndTrack(bot, uid, buffer, {
          caption: greetingText(activeUsers.size),
          parse_mode: "Markdown",
          reply_markup: getMainMenu(uid)
        }, userMessages)
      : sendAndTrack(bot, uid, text, {
          parse_mode: "Markdown",
          reply_markup: getMainMenu(uid)
        }, userMessages);

  } catch (err) {
    console.error("❌ [safeStart error]:", err.message || err);
    return sendAndTrack(bot, uid, "⚠️ Failed to start session. Please try again.", {}, userMessages);
  }
}

/**
 * ✅ Finalizes order and simulates delivery
 */
export async function finishOrder(bot, id) {
  const uid = sanitizeId(id);
  try {
    const session = userSessions[uid];
    if (!session?.deliveryMethod) throw new Error("❌ Missing delivery method.");

    await simulateDelivery(bot, uid, session.deliveryMethod, userMessages);
    await resetSession(uid);

    return sendAndTrack(bot, uid,
      "✅ Order confirmed!\n🚚 Delivery started...\n\nMain menu:",
      {
        parse_mode: "Markdown",
        reply_markup: getMainMenu(uid)
      },
      userMessages
    );
  } catch (err) {
    console.error("❌ [finishOrder error]:", err.message || err);
    return sendAndTrack(bot, uid, "❗️ Delivery error. Please try again or type /start.", {}, userMessages);
  }
}

/**
 * 🔁 Public session reset (post-payment, cancel)
 */
export async function resetSession(id) {
  const uid = sanitizeId(id);
  await fullSessionReset(uid);
}

/**
 * 🧯 Absolute reset: wipes user session, timers, messages, and flags
 */
async function fullSessionReset(uid) {
  if (!uid) return;

  try {
    await clearTimers(uid);
    await clearUserMessages(uid);
    await resetUser(uid);

    if (paymentTimers[uid]) {
      clearTimeout(paymentTimers[uid]);
      delete paymentTimers[uid];
    }

    const session = userSessions[uid];
    if (session) {
      [
        "paymentInProgress", "deliveryInProgress", "cleanupScheduled", "paymentTimer",
        "expectedAmount", "wallet", "currency", "quantity", "product", "category",
        "promoCode", "deliveryMethod", "deliveryFee", "adminStep", "step", "createdAt", "lastText"
      ].forEach(k => delete session[k]);

      delete userSessions[uid];
    }

    activeUsers.delete(uid);

    if (process.env.DEBUG_MESSAGES === "true") {
      console.log(`🧯 [fullSessionReset] Reset complete for ${uid}`);
    }
  } catch (err) {
    console.error("❌ [fullSessionReset error]:", err.message || err);
  }
}

/**
 * 🖼️ Dynamic greeting with user count
 */
function greetingText(count = 1) {
  return `
🇺🇸 Welcome to *BalticPharmacyBot* 🇺🇸

💊 *30+ US cities*  
🚚 Delivery in *under 45 minutes*  
🕵️ Fully anonymous — No questions asked  

✨ *Since 2020* | *24/7 AI support*  
✨ Drop & Courier options available

📦 *In-stock = button ON*  
🌆 *City = button ON*  
✅ Always updated & automated

⛔ *No chatting with couriers* — instant *BAN*

👥 Active users: *${count}*
`.trim();
}

/**
 * 🧾 Fallback greeting if image not available
 */
function fallbackText(count = 1) {
  return `
🇺🇸 *BalticPharmacyBot* — 30+ cities live  

💊 Quality • Speed • Privacy  
🚚 45min courier/drop  
💵 Anonymous crypto payments  

👥 Active users: *${count}*
`.trim();
}

/**
 * 🧼 Sanitize user ID
 */
function sanitizeId(id) {
  const uid = String(id || "").trim();
  return uid && uid !== "undefined" && uid !== "null" ? uid : null;
}
