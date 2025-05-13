// 📛 utils/punishUser.js | IMMORTAL FINAL v1.9.9•DIAMONDLOCK•FASTSAFE
import { sendAndTrack } from "../helpers/messageUtils.js";
import { autodeleteEnabled } from "../config/features.js";
import { userSessions, userMessages } from "../state/userState.js";
import { MAIN_KEYBOARD, MENU_BUTTONS } from "../helpers/keyboardConstants.js";
import { resetSession } from "../core/handlers/finalHandler.js";

// ✅ Precache all valid button texts
const BUTTON_TEXTS = Object.values(MENU_BUTTONS)
  .map(btn => String(btn.text || "").trim().toLowerCase())
  .filter(Boolean);

/**
 * ⚠️ Warns user for invalid actions
 *  • Skips any punish if user just pressed a valid button
 *  • Auto-deletes warning if feature enabled
 *  • Always shows MAIN_KEYBOARD (or a fallback)
 */
export async function punish(bot, id, messages = userMessages) {
  try {
    if (!bot || !id) return;
    const uid = String(id).trim();
    if (!uid || uid === "undefined" || uid === "null") return;

    // ✅ 1) Don’t punish if last message was a legit button press
    const last = userSessions[uid]?.lastText?.toString().trim().toLowerCase();
    if (last && BUTTON_TEXTS.includes(last)) return;

    // ✅ 2) If user is fully broken – restore clean state
    if (!userSessions[uid] || !isValidStep(userSessions[uid].step)) {
      await resetSession(uid);
      userSessions[uid] = { step: 1, createdAt: Date.now() };
    }

    // ✅ 3) Warning message + fallback keyboard
    const warning = "⚠️ *Invalid action.*\nPlease use the *buttons below*.";
    let reply_markup = MAIN_KEYBOARD;
    if (!reply_markup?.keyboard) {
      reply_markup = { keyboard: MAIN_KEYBOARD, resize_keyboard: true, selective: true };
    }

    const msg = await sendAndTrack(
      bot,
      uid,
      warning,
      { parse_mode: "Markdown", reply_markup },
      messages
    );

    // ✅ 4) Auto-delete after 1.5s (if enabled)
    const mid = msg?.message_id;
    if (autodeleteEnabled?.status && mid) {
      setTimeout(async () => {
        try {
          await bot.deleteMessage(uid, mid);
          if (process.env.DEBUG_MESSAGES === "true") {
            console.log(`🗑️ [punish] Deleted warning → ${uid} :: ${mid}`);
          }
        } catch (e) {
          console.warn(`⚠️ [punish] Couldn’t delete #${mid}: ${e.message}`);
        }
      }, 1500);
    }
  } catch (err) {
    console.error("❌ [punish error]:", err.message || err);
  }
}

// ————— Helpers —————

/** ✅ Ensure step is within valid FSM flow */
function isValidStep(s) {
  return (
    Number.isFinite(s) &&
    (Math.floor(s) === s) &&
    s >= 1 &&
    s <= 9
  );
}
