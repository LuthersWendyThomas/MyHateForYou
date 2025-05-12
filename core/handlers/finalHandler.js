// 📦 core/handlers/finalHandler.js | IMMORTAL FINAL v1.0.1•GODMODE DIAMONDLOCK
// 24/7 LOCKED • GREETING+RESET IMMORTAL • MENU+DELIVERY BULLETPROOF

import fs    from "fs/promises";
import path  from "path";
import {
  sendAndTrack,
  sendPhotoAndTrack
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
 * 🚀 /start — full session wipe, greeting + main menu
 */
export async function safeStart(bot, id) {
  const uid = sanitizeId(id);
  if (!bot?.sendMessage || !uid) return;

  try {
    // 1️⃣ full reset
    await fullSessionReset(uid);
    userSessions[uid] = { step: 1, createdAt: Date.now() };
    activeUsers.add(uid);

    // 2️⃣ typing indicator
    await bot.sendChatAction(uid, "typing").catch(() => {});

    // 3️⃣ prepare menu + image
    const menu    = getMainMenu(uid);             // { reply_markup }
    const imgPath = path.join(process.cwd(), "assets", "greeting.jpg");
    let buffer;
    try {
      buffer = await fs.readFile(imgPath);
    } catch {
      buffer = null;
    }

    const count = activeUsers.count || 1;

    // 4️⃣ send greeting
    if (buffer && buffer.byteLength > 10) {
      return sendPhotoAndTrack(
        bot,
        uid,
        buffer,
        {
          caption: greetingText(count),
          parse_mode: "Markdown",
          reply_markup: menu.reply_markup
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
          reply_markup: menu.reply_markup
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
        reply_markup: menu.reply_markup
      },
      userMessages
    );
  }
}

/**
 * ✅ finishOrder — simulate delivery then reset → show menu
 */
export async function finishOrder(bot, id) {
  const uid = sanitizeId(id);
  if (!bot?.sendMessage || !uid) return;

  try {
    const session = userSessions[uid];
    if (!session?.deliveryMethod) throw new Error("Missing delivery method");

    // 🚚 simulate delivery
    await simulateDelivery(bot, uid, session.deliveryMethod, userMessages);

    // 🔄 reset session
    await resetSession(uid);

    const menu = getMainMenu(uid);
    await bot.sendChatAction(uid, "typing").catch(() => {});

    // 📬 show main menu
    return sendAndTrack(
      bot,
      uid,
      "✅ Order confirmed!\n🚚 Delivery started...\n\nMain menu:",
      {
        parse_mode: "Markdown",
        reply_markup: menu.reply_markup
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
        reply_markup: menu.reply_markup
      },
      userMessages
    );
  }
}

/**
 * 🔄 resetSession — public hook to wipe session state
 */
export async function resetSession(id) {
  const uid = sanitizeId(id);
  if (!uid) return;
  await fullSessionReset(uid);
}

/**
 * 🧯 fullSessionReset — clear timers, messages, state, sessions
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

  } catch (err) {
    console.error("❌ [fullSessionReset error]:", err);
  }
}

/** 🧠 sanitizeId — ensure valid string ID */
function sanitizeId(id) {
  const s = String(id || "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

/** 📸 greetingText — image caption */
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

/** 🧾 fallbackText — no-image version */
function fallbackText(count) {
  return `
🇺🇸 *BalticPharmacyBot* — 30+ cities live  

💊 Quality • Speed • Privacy  
🚚 45min courier/drop  
💵 Anonymous crypto payments  

👥 Active users: *${count}*
`.trim();
}
