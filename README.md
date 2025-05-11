# 🤖 MyHateForYou Telegram Bot

**Status:** 🔒 Production Locked  
**Bot Type:** Crypto Product Delivery Bot  
**Deploy Target:** `Render.com` — Background Worker  

---

## 🚀 Features

- ⚡ Automated order flow with region + city logic
- 💸 Crypto payments (BTC / ETH / MATIC / SOL)
- 🧠 Smart session system with retry-safe state
- 🔧 Admin panel: stats, bans, discounts, broadcast
- 🎁 Promo codes, product/category discounts
- 🛡️ Fully anonymous | 0 personal data stored

---

## 📁 Project Structure

```
MyHateForYou/
├── config/            # Wallets, bot token, features
├── core/              # Bot handlers (flow, routing)
├── flows/             # Order flow logic
├── helpers/           # Keyboard/menu utilities
├── state/             # In-memory user sessions
├── utils/             # Admin tools, promo, QR, etc.
├── assets/            # Greeting media
├── logs/              # Session/user stats exports
├── .env               # Secrets
└── index.js           # Entrypoint for Render
```

---

## ⚙️ Environment (.env) Example

```env
TELEGRAM_TOKEN=123456789:ABCDEF_MyBotToken
ADMIN_ID=123456789

BTC_WALLET=1ABCxyz...
ETH_WALLET=0x123...
MATIC_WALLET=0xabc...
SOL_WALLET=abc123...

ETHEREUM_RPC=https://mainnet.infura.io/v3/xxx
MATIC_RPC=https://polygon-rpc.com
SOLANA_RPC=https://api.mainnet-beta.solana.com

AUTOBAN_ENABLED=true
AUTODELETE_ENABLED=true
```

---

## 📦 Package.json Start Script

```json
"scripts": {
  "start": "node index.js"
}
```

---

## 🚀 Deployment (Render.com)

1. Create new **Background Worker**
2. Link your GitHub repo: `MyHateForYou`
3. Set **Start Command**:
   ```bash
   yarn install && yarn start
   ```
4. Add your `.env` keys via Render dashboard
5. Press **Deploy**

> 🧠 PM2 or Docker not needed. Render handles process management.

---

## 🧪 Admin Panel (via Telegram)

| Option                | Function                               |
|-----------------------|----------------------------------------|
| 📊 STATISTICS          | View today/week/month earnings         |
| 🏷️ Manage Discounts     | Set % discounts by user/product/region |
| 🟢 Toggle Items        | Enable/disable products/cities/regions |
| 📣 Broadcast           | Send message to all users              |
| 🔒 BAN / UNBAN / Temp  | Manage blacklisted users               |
| 📋 Lists               | View bans, temporary bans              |

---

## 🧼 Bot Behavior & Safety

- Sessions auto-expire after inactivity
- All messages auto-deleted after 27min (if enabled)
- Blockchain payment verified automatically
- Admin notified on crash
- No DB / persistent logs — fully anonymous

---

## ✅ Final Notes

- Works 24/7 on Render.com
- Fully bulletproof crash handling
- All core logic in `index.js` and `core/`
- Trusted quality since 2025 🔒

---

> Developed by [@LuthersWendyThomas](https://github.com/LuthersWendyThomas)  
> Copyright © 2025
