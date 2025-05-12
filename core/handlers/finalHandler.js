// 📦 core/handlers/finalHandler.js | IMMORTAL FINAL v1.0.0•GODMODE DIAMONDLOCK
// 24/7 LOCKED • GREETING+RESET IMMORTAL • MENU+DELIVERY BULLETPROOF

import fs from "fs/promises";
import path from "path";
import {
  sendAndTrack,
  sendPhotoAndTrack,
  sendKeyboard
} from "../../helpers/messageUtils.js";
import { getMainMenu } from "../../helpers/menu.js";
import {
  clearTimers,
  clearUserMessages,
  resetUser
} from "../../state/stateManager.js";
import {
  userSessions,
  userMessages,
  activeUsers,
  paymentTimers
} from "../../state/userState.js";
import { simulateDelivery } from "./deliveryHandler.js";

/**
 * 🚀 Handles /start command — full safe reset + greeting + menu
 */
export async function safeStart(bot, id) {
  const uid = sanitizeId(id);
  if (!bot?.sendMessage || !uid) return;

  try {
    await fullSessionReset(uid);
    userSessions[uid] = { step: 1, createdAt: Date.now() };
    activeUsers.add(uid);

    // typing indicator
    await bot.sendChatAction(uid, "typing").catch(() => {});

    const menu = getMainMenu(uid);
    const imgPath = path.join(process.cwd(), "assets", "greeting.jpg");
    let buf = null;
    try {
      buf = await fs.readFile(imgPath);
    } catch (err) {
      logError("⚠️ [safeStart] greeting.jpg not found", err, uid);
    }

    const count = activeUsers.size ?? activeUsers.count ?? 1;

    if (buf && buf.byteLength > 10) {
      return await sendPhotoAndTrack(
        bot,
        uid,
        buf,
        {
          caption: greetingText(count),
          parse_mode: "Markdown",
          reply_markup: menu
        },
        userMessages
      );
    }

    // fallback to text + menu
    return await sendKeyboard(
      bot,
      uid,
      fallbackText(count),
      menu,
      userMessages,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    logError("❌ [safeStart error]", err, uid);
    const menu = getMainMenu(uid);
    return await sendKeyboard(
      bot,
      uid,
      "⚠️ Failed to start. Please try again.",
      menu,
      userMessages,
      { parse_mode: "Markdown" }
    );
  }
}

/**
 * ✅ Finalizes order and triggers delivery simulation
 */
export async function finishOrder(bot, id) {
  const uid = sanitizeId(id);
  if (!bot?.sendMessage || !uid) return;

  try {
    const session = userSessions[uid];
    if (!session?.deliveryMethod) {
      throw new Error("Missing delivery method");
    }

    // simulate and then reset
    await simulateDelivery(bot, uid, session.deliveryMethod, userMessages);
    await resetSession(uid);

    const menu = getMainMenu(uid);
    await bot.sendChatAction(uid, "typing").catch(() => {});

    return await sendKeyboard(
      bot,
      uid,
      "✅ Order confirmed!\n🚚 Delivery started...\n\nMain menu:",
      menu,
      userMessages,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    logError("❌ [finishOrder error]", err, uid);
    const menu = getMainMenu(uid);
    return await sendKeyboard(
      bot,
      uid,
      "❗️ Delivery error. Try again or use /start.",
      menu,
      userMessages,
      { parse_mode: "Markdown" }
    );
  }
}

/**
 * 🔄 Public reset hook (after cancel, delivery, payment)
 */
export async function resetSession(id) {
  const uid = sanitizeId(id);
  if (!uid) return;
  await fullSessionReset(uid);
}

/**
 * 🧯 FULL session wipe — messages, timers, state, sessions
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
    activeUsers.remove
      ? activeUsers.remove(uid)
      : activeUsers.delete(uid);

    logAction("🧯 [fullSessionReset]", "Session reset", uid);
  } catch (err) {
    logError("❌ [fullSessionReset error]", err, uid);
  }
}

/** 🧠 Safe UID cleaner */
function sanitizeId(id) {
  const s = String(id || "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

/** 📸 Greeting text with active user count */
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

/** 🧾 Fallback text if greeting image is missing */
function fallbackText(count = 1) {
  return `
🇺🇸 *BalticPharmacyBot* — 30+ cities live  

💊 Quality • Speed • Privacy  
🚚 45min courier/drop  
💵 Anonymous crypto payments  

👥 Active users: *${count}*
`.trim();
}

/** 📋 Simple logger */
function logAction(action, message, uid = "") {
  console.log(
    `${new Date().toISOString()} ${action} → ${message}${
      uid ? ` (ID: ${uid})` : ""
    }`
  );
}
/** 🚨 Simple error logger */
function logError(action, error, uid = "") {
  const msg = error?.message || error;
  console.error(
    `${new Date().toISOString()} ${action} → ${msg}${
      uid ? ` (ID: ${uid})` : ""
    }`
  );
}
