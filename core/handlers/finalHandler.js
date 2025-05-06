import fs from "fs/promises";
import path from "path";
import { sendAndTrack, sendPhotoAndTrack } from "../../helpers/messageUtils.js";
import { getMainMenu } from "../../helpers/menu.js";
import { clearTimers, clearUserMessages, resetUser } from "../../state/stateManager.js";
import { userSessions, userMessages, activeUsers } from "../../state/userState.js";
import { simulateDelivery } from "./deliveryHandler.js";

/**
 * ✅ /start command – safely starts a new session
 */
export async function safeStart(bot, id) {
  const uid = String(id);
  if (!bot || !uid) return;

  try {
    await clearTimers(uid);
    await clearUserMessages(uid);
    await resetUser(uid);

    userSessions[uid] = {
      step: 1,
      createdAt: Date.now()
    };

    if (!activeUsers.has(uid)) {
      activeUsers.add(uid);
    }

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
      } else {
        throw new Error("No Picture");
      }
    } catch (imgErr) {
      console.warn("⚠️ greeting.jpg error:", imgErr.message);
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
      "⚠️ Failed to start session. Please try again with /start.",
      {},
      userMessages
    );
  }
}

/**
 * ✅ Completes the order and returns to the main menu
 */
export async function finishOrder(bot, id) {
  const uid = String(id);
  try {
    const session = userSessions[uid];
    if (!session || !session.deliveryMethod) {
      throw new Error("Missing delivery information");
    }

    await simulateDelivery(bot, uid, session.deliveryMethod, userMessages);
    await resetSession(uid);

    return await sendAndTrack(
      bot,
      uid,
      "✅ Order has been accepted!\n🚚 Delivery is now in progress...\n\nYou have been returned to the main menu:",
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
      "❗️ Error while delivering. Please try again later.",
      {},
      userMessages
    );
  }
}

/**
 * ✅ Clears the user session
 */
export async function resetSession(id) {
  const uid = String(id);
  try {
    await clearTimers(uid);
    await clearUserMessages(uid);
    await resetUser(uid);
  } catch (err) {
    console.error("❌ [resetSession error]:", err.message);
  }
}

// — With image
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

❗️ U see product button ON = IN STOCK!
❗️ U see city button ON = THAT CITY IS ON!
❗️ We constantly update products & cities!

❗️ *Do not speak or photograph couriers*  
⛔ Any violation = instant *BAN*  

👥 Active users: *${count}*  
`;
}

// — Fallback without image
function fallbackText(count) {
  return `
🇺🇸 *BalticPharmacyBot* — now live in 30+ US cities  

💊 Quality, Speed, Stealth  
🚚 *Courier* or *Drop* delivery in 45 min  
🔒 Fully anonymous crypto payments  

👥 Active users: *${count}*  
`;
}
