// 📦 core/handlers/finalHandler.js | FINAL IMMORTAL v999999999.∞+DIAMONDLOCK+SYNCFIX+SAFERESET
// MAIN MENU GREETING • SESSION RESET • DELIVERY FINISHER • 24/7 STABILITY

import fs from "fs/promises";
import path from "path";

import { sendAndTrack, sendPhotoAndTrack } from "../../helpers/messageUtils.js";
import { getMainMenu } from "../../helpers/menu.js";
import { fullResetUserState } from "../sessionManager.js"; // ✅ central reset
import { userSessions, activeUsers } from "../../state/userState.js";
import { simulateDelivery } from "./deliveryHandler.js";

export async function safeStart(bot, id) {
  const uid = sanitizeId(id);
  if (!bot?.sendMessage || !uid) return;

  try {
    await fullResetUserState(uid); // ✅ centralized reset

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
          caption: greetingText(count, uid),
          parse_mode: "Markdown",
          reply_markup: menu
        }
      );
    } else {
      return sendAndTrack(
        bot,
        uid,
        fallbackText(count, uid),
        {
          parse_mode: "Markdown",
          reply_markup: menu
        }
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
      }
    );
  }
}

export async function finishOrder(bot, id) {
  const uid = sanitizeId(id);
  if (!bot?.sendMessage || !uid) return;

  try {
    const session = userSessions[uid];
    if (!session?.deliveryMethod) throw new Error("Missing delivery method");

    await simulateDelivery(bot, uid, session.deliveryMethod);
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
      }
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
      }
    );
  }
}

export async function resetSession(id) {
  const uid = sanitizeId(id);
  if (!uid) return;

  await fullResetUserState(uid); // ✅ centralized reset
  userSessions[uid] = { step: 1, createdAt: Date.now() };
}

// ———————————————————————
// Helpers
// ———————————————————————

function sanitizeId(id) {
  const s = String(id ?? "").trim();
  return s && s !== "undefined" && s !== "null" ? s : null;
}

function isAdmin(uid) {
  const adminId = process.env.ADMIN_ID || process.env.BOT_ADMIN_ID;
  return uid?.toString() === adminId?.toString();
}

function greetingText(count, uid) {
  const activeLine = isAdmin(uid) ? `\n👥 Active users: *${count}*` : "";
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
${activeLine}
`.trim();
}

function fallbackText(count, uid) {
  const activeLine = isAdmin(uid) ? `\n\n👥 Active users: *${count}*` : "";
  return `
🇺🇸 *BalticPharmacyBot* — 30+ cities live  

💊 Quality • Speed • Privacy  
🚚 45min courier/drop  
💵 Anonymous crypto payments  
${activeLine}
`.trim();
}
