// 🧠 core/handlers/stepHandler.js | FINAL IMMORTAL v999999999∞+SYNC FIXED
import { cities, deliveryMethods } from "../../config/features.js";
import { WALLETS } from "../../config/config.js";
import { products } from "../../config/products.js";
import { userSessions } from "../../state/userState.js";
import { sendKeyboard, sendAndTrack } from "../../helpers/messageUtils.js";
import { punish } from "../../utils/punishUser.js";
import { handlePayment, handlePaymentConfirmation } from "./paymentHandler.js";
import { resetSession, safeStart } from "./finalHandler.js";

export async function handleStep(bot, id, text, userMessages) {
  const s = (userSessions[id] ||= { step: 1, createdAt: Date.now() });
  const input = text?.trim();

  if (!input || typeof input !== "string") {
    return await punish(bot, id, userMessages);
  }

  // 🔙 Atgal logika
  if (input === "🔙 Atgal") {
    if (s.step > 1) {
      s.step--;
      return renderStep(bot, id, s.step, userMessages);
    } else {
      await resetSession(id);
      return await safeStart(bot, id);
    }
  }

  try {
    switch (s.step) {
      case 1:
        if (!cities.includes(input)) return await punish(bot, id, userMessages);
        s.city = input;
        break;

      case 2:
        const method = deliveryMethods.find(m => m.label === input);
        if (!method) return await punish(bot, id, userMessages);
        s.deliveryMethod = method.key;
        s.deliveryFee = method.fee;
        break;

      case 3:
        if (!products[input]) return await punish(bot, id, userMessages);
        s.category = input;
        break;

      case 4:
        const prod = products[s.category]?.find(p => p.name === input);
        if (!prod || typeof prod !== "object") return await punish(bot, id, userMessages);
        s.product = prod;
        break;

      case 5:
        const qty = input?.match(/^[^\s(]+/)?.[0];
        const price = s.product?.prices?.[qty];
        const qtyNum = parseInt(qty, 10);
        if (!price || isNaN(qtyNum)) return await punish(bot, id, userMessages);
        s.quantity = qty;
        s.unitPrice = price;
        s.totalPrice = price + s.deliveryFee;
        break;

      case 6:
        const wallet = WALLETS[input];
        if (!wallet || typeof wallet !== "string" || wallet.length < 8)
          return await punish(bot, id, userMessages);
        s.currency = input;
        s.wallet = wallet;
        break;

      case 7:
        if (input !== "✅ PATVIRTINTI") return await punish(bot, id, userMessages);
        return await handlePayment(bot, id, userMessages);

      case 8:
        if (input === "✅ PATVIRTINTI") {
          s.step = 9;
          return await handlePaymentConfirmation(bot, id, userMessages);
        }
        if (input === "❌ Atšaukti mokėjimą") {
          await sendAndTrack(bot, id, "❌ Mokėjimas atšauktas. Grįžtate į pradžią.", {}, userMessages);
          await resetSession(id);
          return await safeStart(bot, id);
        }
        return await punish(bot, id, userMessages);

      default:
        userSessions[id] = { step: 1, createdAt: Date.now() };
        return renderStep(bot, id, 1, userMessages);
    }

    s.step++;
    return renderStep(bot, id, s.step, userMessages);
  } catch (err) {
    console.error("❌ [handleStep klaida]:", err.message);
    return await punish(bot, id, userMessages);
  }
}

function renderStep(bot, id, step, userMessages) {
  const s = userSessions[id] ||= { step: 1 };

  try {
    switch (step) {
      case 1:
        return sendKeyboard(
          bot,
          id,
          "🌍 Pasirink miestą:",
          cities.map(c => [{ text: c }]).concat([[{ text: "🔙 Atgal" }]]),
          userMessages
        );

      case 2:
        return sendKeyboard(
          bot,
          id,
          "🚛 *Pasirink pristatymo būdą:*",
          deliveryMethods.map(m => [{ text: m.label }]).concat([[{ text: "🔙 Atgal" }]]),
          userMessages
        );

      case 3:
        return sendKeyboard(
          bot,
          id,
          "📋 *Pasirink kategoriją:*",
          Object.keys(products).map(k => [{ text: k }]).concat([[{ text: "🔙 Atgal" }]]),
          userMessages
        );

      case 4:
        const cat = products[s.category] || [];
        return sendKeyboard(
          bot,
          id,
          "📦 *Pasirink produktą:*",
          cat.map(p => [{ text: p.name }]).concat([[{ text: "🔙 Atgal" }]]),
          userMessages
        );

      case 5:
        return sendKeyboard(
          bot,
          id,
          "⚖️ *Pasirink kiekį:*",
          Object.entries(s.product?.prices || {}).map(([q, p]) => [{ text: `${q} (${p}€)` }]).concat([[{ text: "🔙 Atgal" }]]),
          userMessages
        );

      case 6:
        const networks = Object.keys(WALLETS).reduce((rows, key) => {
          const last = rows[rows.length - 1];
          if (last && last.length < 2) last.push({ text: key });
          else rows.push([{ text: key }]);
          return rows;
        }, []);
        networks.push([{ text: "🔙 Atgal" }]);
        return sendKeyboard(
          bot,
          id,
          "💳 *Pasirink tinklą:*",
          networks,
          userMessages
        );

      case 7:
        const summary = `📜 *Užsakymo suvestinė:*\n\n` +
          `• Miestas: ${s.city}\n` +
          `• Pristatymas: ${s.deliveryMethod} (${s.deliveryFee}€)\n` +
          `• Kategorija: ${s.category}\n` +
          `• Produktas: ${s.product?.name || "N/A"}\n` +
          `• Kiekis: ${s.quantity}\n` +
          `• Mokėjimas: ${s.currency}\n\n` +
          `💰 Bendra suma: *${s.totalPrice.toFixed(2)}€*\n\n` +
          `✅ Patvirtinkite, jei viskas tinka.`;

        return sendKeyboard(
          bot,
          id,
          summary,
          [[{ text: "✅ PATVIRTINTI" }], [{ text: "🔙 Atgal" }]],
          userMessages
        );

      case 8:
        return sendKeyboard(
          bot,
          id,
          "❓ *Ar mokėjimas atliktas?*",
          [
            [{ text: "✅ PATVIRTINTI" }],
            [{ text: "❌ Atšaukti mokėjimą" }]
          ],
          userMessages
        );

      default:
        userSessions[id] = { step: 1, createdAt: Date.now() };
        return renderStep(bot, id, 1, userMessages);
    }

  } catch (err) {
    console.error("❌ [renderStep klaida]:", err.message);
    return sendKeyboard(
      bot,
      id,
      "⚠️ Klaida atvaizduojant žingsnį.",
      [[{ text: "🔁 Bandykite iš naujo" }]],
      userMessages
    );
  }
}
