import fs from "fs/promises";
import path from "path";
import { sendAndTrack, sendPhotoAndTrack } from "../../helpers/messageUtils.js";
import { getMainMenu } from "../../helpers/menu.js";
import { clearTimers, clearUserMessages, resetUser } from "../../state/stateManager.js";
import { userSessions, userMessages, activeUsers, paymentTimers } from "../../state/userState.js";
import { simulateDelivery } from "./deliveryHandler.js";

/**
 * ✅ Fully resets and restarts the user session (entrypoint for /start)
 */
export async function safeStart(bot, id) {
  const uid = String(id);
  if (!bot || !uid) return;

  try {
    await fullSessionReset(uid);

    userSessions[uid] = {
      step: 1,
      createdAt: Date.now()
    };

    activeUsers.add(uid);
    const count = activeUsers.count;

    const greetingPath = path.join(process.cwd(), "assets", "greeting.jpg");

    try {
      const buffer = await fs.readFile(greetingPath);
      if (buffer?.length > 0) {
        return await sendPhotoAndTrack(
          bot,
          uid,
          buffer,
          {
            caption: greetingText(count),
            parse_mode: "Markdown",
            reply_markup: getMainMenu(uid)
          },
          userMessages
        );
      }
      throw new Error("Empty image buffer");
    } catch (imgErr) {
      console.warn("⚠️ greeting.jpg not found or unreadable:", imgErr.message);
      return await sendAndTrack(
        bot,
        uid,
        `✅ Welcome to *BalticPharmacyBot*!\n\n${fallbackText(count)}`,
        {
          parse_mode: "Markdown",
          reply_markup: getMainMenu(uid)
        },
        userMessages
      );
    }

  } catch (err) {
    console.error("❌ [safeStart error]:", err.message);
    return await sendAndTrack(
      bot,
      uid,
      "⚠️ Session start failed. Please try again or type /start.",
      {},
      userMessages
    );
  }
}

/**
 * ✅ Finalizes order and triggers delivery
 */
export async function finishOrder(bot, id) {
  const uid = String(id);
  try {
    const s = userSessions[uid];
    if (!s || !s.deliveryMethod) throw new Error("Missing delivery method");

    await simulateDelivery(bot, uid, s.deliveryMethod, userMessages);
    await resetSession(uid);

    return await sendAndTrack(
      bot,
      uid,
      "✅ Order accepted!\n🚚 Delivery in progress...\n\nYou’ve been returned to the main menu:",
      {
        parse_mode: "Markdown",
        reply_markup: getMainMenu(uid)
      },
      userMessages
    );
  } catch (err) {
    console.error("❌ [finishOrder error]:", err.message);
    return await sendAndTrack(
      bot,
      uid,
      "❗️ Delivery error. Please try again later or use /start.",
      {},
      userMessages
    );
  }
}

/**
 * ✅ Clears all timers and memory for the session
 */
export async function resetSession(id) {
  const uid = String(id);
  await fullSessionReset(uid);
  console.log(`🧼 Session fully cleared: ${uid}`);
}

/**
 * 🔁 Fully clears everything related to the user: timers, payments, memory
 */
async function fullSessionReset(uid) {
  try {
    await clearTimers(uid);
    await clearUserMessages(uid);
    await resetUser(uid);

    // Extra kill-switch: clear payment timers
    if (paymentTimers[uid]) {
      clearTimeout(paymentTimers[uid]);
      delete paymentTimers[uid];
    }

    // Remove hanging flags from past flows
    if (userSessions[uid]) {
      delete userSessions[uid].paymentInProgress;
      delete userSessions[uid].deliveryInProgress;
      delete userSessions[uid].cleanupScheduled;
      delete userSessions[uid].paymentTimer;
      delete userSessions[uid].expectedAmount;
    }
  } catch (err) {
    console.error("❌ [fullSessionReset error]:", err.message);
  }
}

// 🖼️ Greeting with image
function greetingText(count) {
  return `
🇺🇸 Welcome to *BalticPharmacyBot* 🇺🇸

💊 Operating in *30+ US cities*  
🚚 Delivery in *45 minutes or less*  
🕵️ Ultra-discreet • No questions asked  

✨ Trusted Quality *Since 2020*
✨ *24/7* Live Support & Fully Automated Service
✨ *Drop / Courier Options Available*

🌆 *Drop anywhere in your city* 📍  
🌆 *Courier to your agreed location* 🚚  

✅ *U see product button ON = IN STOCK!*  
✅ *U see city button ON = THAT CITY IS ON!*  
✅ *We constantly update products & cities!*

❗️ *Do not speak or photograph couriers*  
⛔ Any violation = instant *BAN*  

👥 Active users: *${count}*
`.trim();
}

// 📝 Fallback version (no image)
function fallbackText(count) {
  return `
🇺🇸 *BalticPharmacyBot* — now live in 30+ US cities  

💊 Quality, Speed, Stealth  
🚚 *Courier* or *Drop* delivery in 45 min  
🔒 Fully anonymous crypto payments  

👥 Active users: *${count}*
`.trim();
}
