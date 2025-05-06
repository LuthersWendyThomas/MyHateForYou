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
        throw new Error("Tuščias paveikslėlis");
      }
    } catch (imgErr) {
      console.warn("⚠️ greeting.jpg klaida:", imgErr.message);
      return await sendAndTrack(
        bot,
        uid,
        `✅ Sveiki atvykę į *BalticVaistineBot*!\n\n${fallbackText(count)}`,
        {
          parse_mode: "Markdown",
          reply_markup: getMainMenu(uid)
        },
        userMessages
      );
    }

  } catch (err) {
    console.error("❌ [safeStart klaida]:", err.message);
    return await sendAndTrack(
      bot,
      uid,
      "⚠️ Nepavyko paleisti sesijos. Bandykite dar kartą su /start.",
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
      throw new Error("Trūksta pristatymo informacijos");
    }

    await simulateDelivery(bot, uid, session.deliveryMethod, userMessages);
    await resetSession(uid);

    return await sendAndTrack(
      bot,
      uid,
      "✅ Užsakymas priimtas!\nPristatymas pradėtas...\n\nGrįžtate į pagrindinį meniu:",
      {
        parse_mode: "Markdown",
        reply_markup: getMainMenu(uid)
      },
      userMessages
    );

  } catch (err) {
    console.error("❌ [finishOrder klaida]:", err.message);
    return await sendAndTrack(
      bot,
      uid,
      "❗️ Klaida vykdant pristatymą. Bandykite vėliau.",
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
    console.error("❌ [resetSession klaida]:", err.message);
  }
}

// — Su paveikslėliu
function greetingText(count) {
  return `
☁️ Sveiki atvykę į *BalticVaistineBot*! ☁️

✨ 3 metų patirtis  
✨ Premium kokybė 🇩🇪 🇳🇱 🇪🇸  
✨ Diskretiški pristatymai 24/7  
✨ Pristatymas per *30 minučių*  
🚚 *Kurjeris* / *Drop* sistema  

❗️ *Nefotografuoti ir nešnekinėti kurjerio*  
⛔ Pažeidimas = BAN  

❓ Klausimai? Spauskite *PAGALBA*  

👥 Aktyvūs vartotojai: *${count}*`;
}

// — Fallback be paveikslėlio
function fallbackText(count) {
  return `
✨ 3 metų patirtis  
✨ Premium kokybė | 24/7 pristatymas  
✨ *Kurjeriai* / *Drop* sistema  

👥 Aktyvūs vartotojai: *${count}*`;
}
