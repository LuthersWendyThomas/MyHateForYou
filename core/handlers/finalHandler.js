// 📦 core/handlers/finalHandler.js | IMMORTAL FINAL v999999999.∞+SYNC+DIAMONDLOCK
// MAIN MENU GREETING • FULL SESSION RESET • DELIVERY FINISHER • 24/7 STABILITY

import fs from "fs/promises";
import path from "path";

import { sendAndTrack, sendPhotoAndTrack } from "../../helpers/messageUtils.js";
import { getMainMenu } from "../../helpers/menu.js";
import { clearTimers, clearUserMessages, resetUser } from "../../state/stateManager.js";

import {
  userSessions,
  userMessages,
  activeUsers,
  paymentTimers
} from "../../state/userState.js";

import { simulateDelivery } from "./deliveryHandler.js";

/**
 * 🚀 /start — full wipe + greeting + main menu render
 */
export async function safeStart(bot, id) {
  const uid = sanitizeId(id);
  if (!bot?.sendMessage || !uid) return;

  try {
    await fullSessionReset(uid);
    userSessions[uid] = { step: 1, createdAt: Date.now() };
    activeUsers.add(uid);

    await bot.sendChatAction(uid, "typing").catch(() => {});

    const menu = getMainMenu(uid);
    const imgPath = path.join(process.cwd(), "assets", "greeting.jpg");

    let buffer = null;
    try {
      buffer = await fs.readFile(imgPath);
    } catch {
      buffer = null;
    }

    const count = activeUsers?.size || 1;

    if (buffer?.byteLength > 10) {
      return sendPhotoAndTrack(
        bot,
        uid,
        buffer,
        {
          caption: greetingText(count),
          parse_mode: "Markdown",
          reply_markup: menu
        },
        userMessages
      );
    } else {
      return sendAndTrack(
        bot,
        uid,
        fallbackText(count),
        {
          parse_mode: "Markdown",
          reply_markup: menu
        },
        userMessages
      );
    }
  } catch (err) {
    console.error("❌ [safeStart error]:", err);
    const menu = getMainMenu(uid);
    return sendAndTrack(
      bot,
      uid,
      "⚠️ Failed to start. Please try again.",
      {
        parse_mode: "Markdown",
        reply_markup: menu
      },
      userMessages
    );
  }
}

/**
 * ✅ Order completion → delivery → main menu
 */
export async function finishOrder(bot, id) {
  const uid = sanitizeId(id);
  if (!bot?.sendMessage || !uid) return;

  try {
    const session = userSessions[uid];
    if (!session?.deliveryMethod) throw new Error("Missing delivery method");

    await simulateDelivery(bot, uid, session.deliveryMethod, userMessages);
    await resetSession(uid);

    const menu = getMainMenu(uid);
    await bot.sendChatAction(uid, "typing").catch(() => {});

    return sendAndTrack(
      bot,
      uid,
      "✅ Order confirmed!\n🚚 Delivery started...\n\nMain menu:",
      {
        parse_mode: "Markdown",
        reply_markup: menu
      },
      userMessages
    );
  } catch (err) {
    console.error("❌ [finishOrder error]:", err);
    const menu = getMainMenu(uid);
    return sendAndTrack(
      bot,
      uid,
      "❗️ Delivery error. Try again or use /start.",
      {
        parse_mode: "Markdown",
        reply_markup: menu
      },
      userMessages
    );
  }
}

/**
 * 🔄 Public session reset
 */
export async function resetSession(id) {
  const uid = sanitizeId(id);
  if (!uid) return;
  await fullSessionReset(uid);
}

/**
 * 🧼 Resets user state, timers, memory
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

    if (activeUsers.remove) {
      activeUsers.remove(uid);
    } else {
      activeUsers.delete(uid);
    }

    if (process.env.DEBUG_MESSAGES === "true") {
      console.debug(`🧼 [fullSessionReset] Session cleared for ${uid}`);
    }
  } catch (err) {
    console.error("❌ [fullSessionReset error]:", err);
  }
}

/**
 * 🧠 UID sanitizer
 */
function sanitizeId(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

/**
 * 📸 Greeting caption (with image)
 */
function greetingText(count) {
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
 * 🧾 Text-only fallback greeting
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
