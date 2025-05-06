// 📛 utils/punishUser.js | BalticPharma V2 — BULLETPROOF v2.1 IMMORTAL-SYNCED FINAL BUILD

import { sendAndTrack } from "../helpers/messageUtils.js";
import { FLAGS } from "../config/config.js";
import { userMessages } from "../state/userState.js";

/**
 * Reaguoja į neteisingą įvestį — parodo įspėjimą, suseka žinutę, ištrina po 3s (jei įjungta)
 * @param {TelegramBot} bot - Bot instancija
 * @param {number|string} id - Telegram naudotojo ID
 * @param {Object=} messages - Sekamos žinutės (numatyta: userMessages)
 */
export async function punish(bot, id, messages = userMessages) {
  try {
    if (!bot || !id) return;

    const warning = "⚠️ *Neleistinas veiksmas.*\nPrašome naudotis *apatiniais mygtukais*.";

    const msg = await sendAndTrack(
      bot,
      id,
      warning,
      {
        parse_mode: "Markdown",
        disable_notification: true
      },
      messages
    );

    const canDelete = FLAGS.AUTODELETE_ENABLED === true;
    const messageId = msg?.message_id;

    if (canDelete && messageId) {
      setTimeout(() => {
        bot.deleteMessage(id, messageId).catch((err) =>
          console.warn(`⚠️ Nepavyko ištrinti punish žinutės (${messageId}):`, err.message)
        );
      }, 3000);
    }

  } catch (err) {
    console.error("❌ [punishUser klaida]:", err.message || err);
  }
}
