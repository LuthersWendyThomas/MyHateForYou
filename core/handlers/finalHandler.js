// 📦 core/handlers/finalHandler.js | IMMORTAL FINAL v999999999999999.∞+SYNC+GODMODE
// 24/7 LOCKED • GREETING+RESET IMMORTAL • MENU+DELIVERY BULLETPROOF

import fs from "fs/promises";
import path from "path";
import { sendAndTrack, sendPhotoAndTrack } from "../../helpers/messageUtils.js";
import { getMainMenu } from "../../helpers/menu.js";
import { clearTimers, clearUserMessages, resetUser } from "../../state/stateManager.js";
import { userSessions, userMessages, activeUsers, paymentTimers } from "../../state/userState.js";
import { simulateDelivery } from "./deliveryHandler.js";

/**
 * 🚀 Handles /start command — full safe reset + menu + greeting
 */
export async function safeStart(bot, id) {
  const uid = sanitizeId(id);
  if (!bot || !uid) return;

  try {
    await fullSessionReset(uid);

    userSessions[uid] = { step: 1, createdAt: Date.now() };
    activeUsers.add(uid);

    const greetingImgPath = path.join(process.cwd(), "assets", "greeting.jpg");
    let photoBuffer = null;

    try {
      photoBuffer = await fs.readFile(greetingImgPath);
    } catch (err) {
      console.warn("⚠️ [safeStart] greeting.jpg not found:", err.message);
    }

    const activeCount = activeUsers.count || 1;
    const messageText = photoBuffer?.byteLength > 10 ? undefined : fallbackText(activeCount);
    const menu = getMainMenu(uid);

    return photoBuffer
      ? await sendPhotoAndTrack(bot, uid, photoBuffer, {
          caption: greetingText(activeCount),
          parse_mode: "Markdown",
          reply_markup: menu
        }, userMessages)
      : await sendAndTrack(bot, uid, messageText, {
          parse_mode: "Markdown",
          reply_markup: menu
        }, userMessages);

  } catch (err) {
    console.error("❌ [safeStart error]:", err.message || err);
    return sendAndTrack(bot, uid, "⚠️ Failed to start. Please try again.", {}, userMessages);
  }
}

/**
 * ✅ Finalizes order and triggers delivery simulation
 */
export async function finishOrder(bot, id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  try {
    const session = userSessions[uid];
    if (!session?.deliveryMethod) throw new Error("Missing delivery method");

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
    return sendAndTrack(bot, uid, "❗️ Delivery error. Try again or use /start.", {}, userMessages);
  }
}

/**
 * 🔄 Publicly resets session (after cancel, delivery, payment)
 */
export async function resetSession(id) {
  const uid = sanitizeId(id);
  await fullSessionReset(uid);
}

/**
 * 🧯 FULL session wipe — messages, timers, state, sessions, delivery
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

    delete userSessions[uid];
    activeUsers.remove(uid);

    if (process.env.DEBUG_MESSAGES === "true") {
      console.log(`🧯 [fullSessionReset] → ${uid}`);
    }
  } catch (err) {
    console.error("❌ [fullSessionReset error]:", err.message || err);
  }
}

/**
 * 📸 Greeting with active user count
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
 * 🧾 Fallback text if greeting image is not found
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
 * 🧠 Safe UID cleaner
 */
function sanitizeId(id) {
  const str = String(id || "").trim();
  return str && str !== "undefined" && str !== "null" ? str : null;
}
