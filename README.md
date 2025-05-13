# 🤖 MyHateForYou Telegram Bot

**Status:** 🟩 LIVE • FINAL IMMORTAL LOCK  
**Bot Type:** 💊 Crypto Product Auto-Delivery  
**Deploy Target:** 🚀 `Render.com` — Background Worker (24/7 bulletproof)

---

## 🌟 Core Features

- 🗺️ Region → City → Delivery flow (FSM-safe)
- 💵 Crypto payments (BTC, ETH, MATIC, SOL) via QR
- 🧠 Session-based system (retry-safe + auto-expire)
- 🎛️ Admin Panel: bans, stats, promo codes, toggle, broadcast
- 🎁 Full discount system (global / per product / promo codes)
- 🕵️ Anonymous: no user data stored, no logs, no DB
- 🔐 Bulletproof crash recovery with auto cleanup + delivery engine
- 👁 Admin-only analytics & monitoring (with secret auto-notify system)

---

## 📁 Project Structure

```
MyHateForYou/
├── config/            # Wallets, features, bot token
├── core/              # Handlers: session, payment, delivery, step engine
├── flows/             # Order entry logic (startOrder)
├── helpers/           # Message utils, keyboards, menus
├── state/             # In-memory sessions, timers, tracking
├── utils/             # Admin tools, QR, stats, broadcast, bans
├── assets/            # Greeting photo (greeting.jpg)
├── logs/              # Exportable stats (if used)
├── .env               # Secrets (never committed)
└── index.js           # Main entrypoint (Render worker)
```

---

## ⚙️ Environment Configuration (`.env`)

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
DEBUG_MESSAGES=true
```

> ⚠️ Never commit `.env` file to Git — use it via Render dashboard secrets.

---

## 🚀 Deployment (Render.com)

1. Go to **Render Dashboard**
2. Create new **Background Worker**
3. Link GitHub repo → `MyHateForYou`
4. Set **Start Command**:
   ```bash
   yarn install && yarn start
   ```
5. Add `.env` variables via Render's **Environment settings**
6. ✅ Done — bot runs 24/7 with full crash protection

---

## 🧠 Admin Panel Features (in Telegram)

| Option                | Description                                  |
|-----------------------|----------------------------------------------|
| 📊 STATISTICS         | Today / Week / Month revenue report          |
| 🏷️ Manage Discounts    | Apply % off globally or per category/product |
| 🟢 Toggle Items        | Enable/disable regions, cities, products     |
| 📣 Broadcast           | Message all users instantly                  |
| 🔒 BAN / UNBAN         | Block/unblock by UID                         |
| ⏳ Temp. BAN           | Timed access restriction                     |
| 📋 View Lists          | See active bans and timeouts                 |

> Access: Only for `ADMIN_ID` defined in `.env`

---

## 🔐 Safety & Anonymity

- ✅ Blockchain-based payments (confirmed by backend)
- 🧼 Sessions auto-expire if inactive
- 🧾 Orders not logged — fully ephemeral
- 📸 Greeting with image + active user counter
- 🚨 Admin receives alerts: startup, payment, delivery ban
- 💣 Crash protection with `try/catch` wrappers everywhere

---

## 📦 Package.json Example

```json
"scripts": {
  "start": "node index.js"
}
```

---

## ✅ Project Highlights

- 🌙 Runs 24/7 with no supervision
- 🧱 IMMORTAL FSM engine (9-step flow)
- 🔁 Integrated flood protection system
- 🚀 Production-tested | Crypto-safe | Admin-controlled

---

### 👤 Author

> Developed by [@LuthersWendyThomas](https://github.com/LuthersWendyThomas)  
> ⚡️ `© 2025` | All rights reserved  
> 🔒 Codebase locked & bulletproof
