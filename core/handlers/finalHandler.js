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
 * ✅ Pristato užsakymą ir grąžina į meniu
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
      "✅ Order accepted!\nDelivery has started...\n\nYou are returning to the main menu:",
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
 * ✅ Išvalo naudotojo sesiją
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

// — Su paveikslėliu
function greetingText(count) {
  return `
☁️ Welcome to *BalticPharmacyBot*! ☁️

✨ 3 years of experience
✨ Premium quality 🇩🇪 🇳🇱 🇪🇸
✨ Discreet deliveries 24/7
✨ Delivery within *30 minutes*
🚚 *Courier* / *Drop* system

❗️ *Do not take pictures or talk to the courier*
⛔ Violation = BAN

❓ Questions? Click *HELP*

👥 Active users: *${count}*`;
}

// — Fallback be paveikslėlio
function fallbackText(count) {
  return `
✨ 3 years of experience
✨ Premium quality | 24/7 delivery 
✨ *Couriers* / *Drop* system

👥 Active users: *${count}*`;
}
