// 📦 core/handlers/finalHandler.js | IMMORTAL FINAL v99999999999999.∞+ULTIMATE
// DIAMOND LOCKED • FULLY SYNCED • GREETING • RESET • DELIVERY • BULLETPROOF

import fs from "fs/promises";
import path from "path";
import { sendAndTrack, sendPhotoAndTrack } from "../../helpers/messageUtils.js";
import { getMainMenu } from "../../helpers/menu.js";
import { clearTimers, clearUserMessages, resetUser } from "../../state/stateManager.js";
import { userSessions, userMessages, activeUsers, paymentTimers } from "../../state/userState.js";
import { simulateDelivery } from "./deliveryHandler.js";

/**
 * 🚀 Starts a fresh session (/start)
 * @param {object} bot - Telegram bot instance
 * @param {string|number} id - User ID
 */
export async function safeStart(bot, id) {
  const uid = sanitizeId(id);
  if (!bot || !uid) return;

  try {
    await fullSessionReset(uid);

    userSessions[uid] = {
      step: 1,
      createdAt: Date.now()
    };

    activeUsers.add(uid);
    const count = activeUsers.size || 1;

    const greetingPath = path.join(process.cwd(), "assets", "greeting.jpg");
    let buffer = null;

    try {
      buffer = await fs.readFile(greetingPath);
    } catch (err) {
      console.warn("⚠️ [safeStart] greeting.jpg not found. Using fallback text:", err.message);
    }

    if (buffer?.byteLength > 10) {
      return await sendPhotoAndTrack(bot, uid, buffer, {
        caption: greetingText(count),
        parse_mode: "Markdown",
        reply_markup: getMainMenu(uid)
      }, userMessages);
    }

    return await sendAndTrack(bot, uid, `✅ Welcome to *BalticPharmacyBot*!\n\n${fallbackText(count)}`, {
      parse_mode: "Markdown",
      reply_markup: getMainMenu(uid)
    }, userMessages);
  } catch (err) {
    console.error("❌ [safeStart error]:", err.message);
    return await sendAndTrack(bot, uid, "⚠️ Session start failed. Please try again.", {}, userMessages);
  }
}

/**
 * ✅ Finalizes confirmed order + starts delivery
 * @param {object} bot - Telegram bot instance
 * @param {string|number} id - User ID
 */
export async function finishOrder(bot, id) {
  const uid = sanitizeId(id);
  try {
    const session = userSessions[uid];
    if (!session || !session.deliveryMethod) throw new Error("❌ Delivery method not selected.");

    await simulateDelivery(bot, uid, session.deliveryMethod, userMessages);
    await resetSession(uid);

    return await sendAndTrack(bot, uid,
      "✅ Order accepted!\n🚚 Delivery is on the way...\n\nReturned to main menu:",
      {
        parse_mode: "Markdown",
        reply_markup: getMainMenu(uid)
      },
      userMessages
    );
  } catch (err) {
    console.error("❌ [finishOrder error]:", err.message);
    return await sendAndTrack(bot, uid, "❗️ Delivery error. Please try again or type /start.", {}, userMessages);
  }
}

/**
 * 🧼 Public session reset (post-payment or cancel)
 * @param {string|number} id - User ID
 */
export async function resetSession(id) {
  await fullSessionReset(sanitizeId(id));
}

/**
 * 🧯 Absolute session wipe — state, timers, flags, messages
 * @param {string} uid - User ID
 */
async function fullSessionReset(uid) {
  try {
    if (!uid) return;
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
      console.log(`🧯 [fullSessionReset] Finished for ${uid}`);
    }
  } catch (err) {
    console.error("❌ [fullSessionReset error]:", err.message);
  }
}

/**
 * 📸 Greeting caption with active user count
 * @param {number} count - Active user count
 * @returns {string} - Greeting text
 */
function greetingText(count) {
  return `
🇺🇸 Welcome to *BalticPharmacyBot* 🇺🇸

💊 *30+ US cities*  
🚚 Delivery in *45 minutes or less*  
🕵️ Ultra-discreet • No questions asked  

✨ *Since 2020* | *24/7 automated service*  
✨ Drop / Courier options available

📦 *Stock = button ON*  
🌆 *City = button ON*  
✅ Always updated!

❗️ *No photos or talking to couriers*  
⛔ Instant *BAN* for any violation

👥 Active users: *${count}*
`.trim();
}

/**
 * 💬 Text fallback (no greeting.jpg)
 * @param {number} count - Active user count
 * @returns {string} - Fallback text
 */
function fallbackText(count) {
  return `
🇺🇸 *BalticPharmacyBot* — 30+ cities live  

💊 Quality • Speed • Privacy  
🚚 45min courier/drop  
💵 Anonymous crypto payments  

👥 Active users: *${count}*
`.trim();
}

/**
 * ✅ Sanitizes user ID input
 * @param {string|number} id - Input ID
 * @returns {string|null} - Sanitized ID or null if invalid
 */
function sanitizeId(id) {
  const uid = String(id || "").trim();
  return uid && uid !== "undefined" && uid !== "null" ? uid : null;
}
