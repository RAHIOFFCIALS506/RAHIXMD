<div align="center">

<a href="https://github.com/nightx-rebel/hatsune">
  <img src="https://i.ibb.co/ZzZG1ngL/file-0000000032ec821199d726e057a1ad58.png" alt="Miku - Multi-Session WhatsApp Bot" width="100%" />
</a>

<a href="https://github.com/nightx-rebel/hatsune">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&duration=3200&pause=900&color=8B5CF6&center=true&vCenter=true&width=700&height=40&lines=One+bot.+Multiple+WhatsApp+accounts.;Modular+plugin+architecture.;Telegram+control+%2B+HTTP+API.;Persistent+PostgreSQL+session+storage." alt="Typing animation" />
</a>

<br/>

<p>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-%E2%89%A5%2022.13-339933?style=for-the-badge&logo=nodedotjs&logoColor=white&labelColor=0f0f1a" alt="Node.js" /></a>
  <a href="https://github.com/WhiskeySockets/Baileys"><img src="https://img.shields.io/badge/Baileys-7.0--rc14-25D366?style=for-the-badge&logo=whatsapp&logoColor=white&labelColor=0f0f1a" alt="Baileys" /></a>
  <a href="https://github.com/nightx-rebel/socksy"><img src="https://img.shields.io/badge/Engine-Socksy-8b5cf6?style=for-the-badge&logoColor=white&labelColor=0f0f1a" alt="Socksy" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-22d3ee?style=for-the-badge&labelColor=0f0f1a" alt="MIT License" /></a>
</p>

<p>
  <img src="https://img.shields.io/badge/JavaScript-ES%20Modules-f7df1e?style=flat-square&logo=javascript&logoColor=black&labelColor=0f0f1a" alt="JavaScript ES modules" />
  <img src="https://img.shields.io/badge/PostgreSQL-Session%20Store-4169e1?style=flat-square&logo=postgresql&logoColor=white&labelColor=0f0f1a" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/SQLite-Settings%20Store-003B57?style=flat-square&logo=sqlite&logoColor=white&labelColor=0f0f1a" alt="SQLite" />
  <img src="https://img.shields.io/badge/Telegram-Control%20Bot-26A5E4?style=flat-square&logo=telegram&logoColor=white&labelColor=0f0f1a" alt="Telegram" />
  <img src="https://img.shields.io/badge/Architecture-Plugin--Based-ff4d94?style=flat-square&labelColor=0f0f1a" alt="Plugin based" />
</p>

<p>
  <a href="https://github.com/nightx-rebel/hatsune/stargazers"><img src="https://img.shields.io/github/stars/nightx-rebel/hatsune?style=flat-square&logo=github&color=8b5cf6&labelColor=0f0f1a" alt="Stars" /></a>
  <a href="https://github.com/nightx-rebel/hatsune/network/members"><img src="https://img.shields.io/github/forks/nightx-rebel/hatsune?style=flat-square&logo=github&color=22d3ee&labelColor=0f0f1a" alt="Forks" /></a>
  <a href="https://github.com/nightx-rebel/hatsune/issues"><img src="https://img.shields.io/github/issues/nightx-rebel/hatsune?style=flat-square&logo=github&color=ff4d94&labelColor=0f0f1a" alt="Issues" /></a>
  <a href="https://github.com/nightx-rebel/hatsune/commits"><img src="https://img.shields.io/github/last-commit/nightx-rebel/hatsune?style=flat-square&logo=git&logoColor=white&color=8b5cf6&labelColor=0f0f1a" alt="Last commit" /></a>
</p>

<br/>

<a href="#quick-start"><img src="https://img.shields.io/badge/Quick%20Start-ff4d94?style=for-the-badge&labelColor=0f0f1a" alt="Quick Start" /></a>
<a href="#environment-variables"><img src="https://img.shields.io/badge/Environment-8b5cf6?style=for-the-badge&labelColor=0f0f1a" alt="Environment" /></a>
<a href="#free-postgresql-and-database-options"><img src="https://img.shields.io/badge/Databases-4169e1?style=for-the-badge&labelColor=0f0f1a" alt="Databases" /></a>
<a href="#deployment-guides"><img src="https://img.shields.io/badge/Deploy-22d3ee?style=for-the-badge&labelColor=0f0f1a" alt="Deploy" /></a>
<a href="#http-api"><img src="https://img.shields.io/badge/HTTP%20API-0ea5e9?style=for-the-badge&labelColor=0f0f1a" alt="HTTP API" /></a>
<a href="#project-structure"><img src="https://img.shields.io/badge/Structure-a78bfa?style=for-the-badge&labelColor=0f0f1a" alt="Structure" /></a>

<br/><br/>

<a href="https://heroku.com/deploy?template=https://github.com/nightx-rebel/hatsune"><img src="https://www.herokucdn.com/deploy/button.svg" alt="Deploy to Heroku" height="38" /></a>
&nbsp;

<a href="https://railway.com/new"><img src="https://img.shields.io/badge/Deploy%20on-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white" alt="Deploy on Railway" height="38" /></a>

</div>

<br/>

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:ff4d94,50:8b5cf6,100:22d3ee&height=3&section=header" width="100%" alt="" />

## Overview

Miku runs multiple WhatsApp sessions from a single Node.js process. It loads WhatsApp commands and event handlers from the `plugins/` directory, stores session authentication through the Socksy multi-socket engine, and can be managed from Telegram or through its HTTP API.

### What it includes

| Capability | Description |
|---|---|
| **Multi-session management** | Pair, restore, inspect, stop, restart, and remove WhatsApp sessions. |
| **Pairing codes** | Link an account using WhatsApp's **Linked Devices > Link with phone number instead** flow. |
| **Telegram control bot** | Pair accounts and manage sessions with Telegram commands when `BOT_TOKEN` is configured. |
| **Plugin-based commands** | Keep commands, message handlers, and event handlers in separate files. |
| **HTTP API** | Inspect health, loaded plugins, and session state; request pairing codes. |
| **SQLite settings storage** | Bot settings use a local SQLite database by default. Optional Turso syncing is supported. |
| **PostgreSQL session storage** | Set `DATABASE_URL` to a PostgreSQL connection URL for cloud deployments. This is the recommended cloud setup. |
| **Task queues and safeguards** | Configurable concurrency, execution timeouts, stale-message filtering, and duplicate suppression. |
| **Media support** | FFmpeg-backed audio, video, and sticker operations where a plugin requires it. |

> [!IMPORTANT]
> **Use `DATABASE_URL` for the WhatsApp authentication/session store.** `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are optional settings-sync variables for a separate component. They are not interchangeable.

> [!WARNING]
> The HTTP API does **not** implement authentication. Do not expose it to the public internet without adding access control or placing it behind a trusted private network or authenticated proxy. The Telegram `/d`, `/s`, and `/as` commands are powerful server-side operations; see [Security](#security-and-responsible-use).

### Architecture

```mermaid
flowchart LR
    A[HTTP API] --> M
    T[Telegram Control Bot] --> M
    M["lib/manager.js<br/>Socksy MultiSocketManager"] --> C["lib/client.js<br/>Message and event dispatch"]
    C --> P["lib/plugins.js<br/>Plugin registry"]
    P --> PL["plugins/*<br/>Commands, handlers, events"]
    M --> PG[("PostgreSQL<br/>Session auth store")]
    C --> SQ[("SQLite / Turso<br/>Settings store")]

    classDef core fill:#8b5cf6,stroke:#6d28d9,color:#ffffff;
    classDef edge fill:#22d3ee,stroke:#0891b2,color:#0f0f1a;
    classDef store fill:#ff4d94,stroke:#be185d,color:#ffffff;
    class M,C,P core;
    class A,T,PL edge;
    class PG,SQ store;
```

## Contents

- [Quick Start](#quick-start)
- [Pair a WhatsApp Account](#pair-a-whatsapp-account)
- [Environment Variables](#environment-variables)
- [Free PostgreSQL and Database Options](#free-postgresql-and-database-options)
- [Deployment Guides](#deployment-guides)
- [Telegram Control Bot](#telegram-control-bot)
- [WhatsApp Commands](#whatsapp-commands)
- [HTTP API](#http-api)
- [Project Structure](#project-structure)
- [Add a Plugin](#add-a-plugin)
- [Troubleshooting](#troubleshooting)
- [Security and Responsible Use](#security-and-responsible-use)

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:ff4d94,50:8b5cf6,100:22d3ee&height=3&section=header" width="100%" alt="" />

## Quick Start

### 1. Requirements

- **Node.js 22.13 or newer.** The project uses the built-in `node:sqlite` module for local settings storage.
- **Git** to clone the source.
- **FFmpeg** for the media features that need it.
- A phone number you own or are authorized to link to WhatsApp.
- Optional: a Telegram bot token if you want Telegram-based pairing and control.
- Recommended for cloud hosting: a PostgreSQL database URL stored in `DATABASE_URL`.

Check the installed versions:

```bash
node --version
npm --version
```

### 2. Download and install

```bash
git clone https://github.com/nightx-rebel/hatsune.git
cd hatsune
npm install
```

If you downloaded a ZIP instead of cloning with Git, extract it and open a terminal in the folder containing `package.json`.

### 3. Configure the bot

Create a `.env` file in the project root (the same directory as `package.json`):

```bash
cp .env.example .env
```

Open the file with an editor, for example:

```bash
nano .env
```

For the simplest local test, you can leave `DATABASE_URL` blank and let the session-store package use its local default. For a cloud deployment, configure a PostgreSQL URL from one of the providers below.

### 4. Start Miku

```bash
npm start
```

The server prints startup logs as plugins and saved sessions initialize. By default, the HTTP service selects an available port starting at `3000`; if your host supplies `PORT`, the app uses that value.

Open this URL on the same device or computer:

```text
http://localhost:3000/
```

A healthy response looks similar to this:

```json
{
  "ok": true,
  "status": "Baileys Multi-Session Bot",
  "sessions": 0,
  "plugins": 80,
  "queue": {}
}
```

The number of plugins and the queue details depend on which files load successfully. The example values are illustrative, not fixed expected output.

## Pair a WhatsApp Account

You can pair through the HTTP API or the Telegram control bot.

### Option A: Pair through the HTTP API

1. Start Miku with `npm start`.
2. Use your complete international phone number as digits only. Do not include `+`, spaces, or hyphens.
3. Request a code. Replace the sample number with your own:

```bash
curl http://localhost:3000/pair/919812345678
```

4. Read the `code` returned by the API.
5. On your phone, open **WhatsApp > Settings > Linked devices > Link a device > Link with phone number instead**.
6. Enter the pairing code. After the account connects, the session is saved by the configured auth store.
7. Send `.menu` to the linked WhatsApp account to see the commands provided by the loaded plugins.

Example response:

```json
{
  "ok": true,
  "sessionId": "919812345678_123456",
  "phone": "919812345678",
  "code": "ABCD-EFGH"
}
```

The session ID and code above are examples only. Pairing codes are temporary; do not publish them or share them with other people.

### Option B: Pair through Telegram

1. Create a Telegram bot through [@BotFather](https://t.me/BotFather) and copy its token.
2. Set `BOT_TOKEN` in `.env` or in your hosting provider's environment-variable settings.
3. Set the correct `TG_GROUP_ID` and, if used, `TG_GROUP_LINK`.
4. Restart or redeploy Miku.
5. Open your Telegram bot and send `/start`, then `/help`.
6. Use a command such as:

```text
/pair +919812345678
```

Include the country calling code. Telegram pairing has a short per-user cooldown to reduce repeated pairing requests.

> [!TIP]
> Use `/id` in the Telegram control bot to identify the Telegram chat and user IDs needed for configuration. Keep the bot's control group limited to trusted people.

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:ff4d94,50:8b5cf6,100:22d3ee&height=3&section=header" width="100%" alt="" />

## Environment Variables

The project loads `.env` automatically through `dotenv/config`. On cloud platforms, use the provider's **Variables**, **Environment**, or **Config Vars** screen instead of uploading your local `.env` file.

### Essential settings

| Variable | Required? | Purpose and default |
|---|---|---|
| `DATABASE_URL` | **Recommended for cloud; optional locally** | PostgreSQL connection URL for the WhatsApp session/authentication store. Use the connection string supplied by your database provider. If blank, the session-store dependency falls back to its local default. |
| `BOT_TOKEN` | Optional; required for Telegram control | Token created with [@BotFather](https://t.me/BotFather). If empty, the Telegram control bot is skipped; the HTTP API can still start. |
| `TG_GROUP_ID` | Optional | Telegram group ID allowed by the control bot. Default in `config.js`: `-1003718062610`. Set this to your own group ID. |
| `TG_GROUP_LINK` | Optional | Telegram group invitation link. Default: `https://t.me/x_miku_1`. |
| `OWNER_IDS` | Strongly recommended if Telegram control is enabled | Comma-separated numeric Telegram user IDs allowed to use the powerful `/d`, `/s`, and `/as` commands. Example: `123456789,987654321`. When blank, the code falls back to allowing group administrators to use those commands. |
| `BOT_NAME` | Optional | Name used by bot features. Default: `miku`. |
| `PACKNAME` | Optional | Sticker pack name. Default depends on the plugin/config path (`bot` or `x-miku`). |
| `AUTHOR` | Optional | Sticker author/pack attribution. Default: `x-Miku` in the main config. |
| `THEME` | Optional | Theme key. Default: `t`, loaded from `Themes/t.json`. |
| `WA_CHANNEL_LINK` | Optional | WhatsApp channel link displayed by supported bot messages. |
| `TGTOKEN` | Optional | Telegram token used by the Telegram sticker plugin; falls back to `BOT_TOKEN`. |
| `PORT` | Normally set by the host | HTTP server port. The app chooses an available port starting at `3000` if it is not provided. |
| `OFFTELEBOT` | Optional | Set `true` to disable the Telegram control bot and run the HTTP/WhatsApp portions only. |

### Optional settings database sync

These variables are for the separate settings component in `lib/client.js` and `lib/database/db-remote.js`. The component uses a local SQLite database at `data/settings.sqlite` as its primary store and can synchronize settings with Turso when both values are configured.

| Variable | Purpose |
|---|---|
| `TURSO_DATABASE_URL` | Turso/libSQL URL, usually beginning with `libsql://`. This is not the PostgreSQL `DATABASE_URL`. |
| `TURSO_AUTH_TOKEN` | Authentication token for the Turso database. Keep it secret. |

Turso is optional. If these variables are omitted, the settings component uses local SQLite only. If you deploy to a host with an ephemeral filesystem, local settings may be lost on restart or redeploy; use a host with persistent storage or configure and test Turso syncing.

### Optional integrations and diagnostics

| Variable | Purpose |
|---|---|
| `REMOVE_BG_API` | API key used by the remove-background feature in `plugins/tools/owner_tools.js`. |
| `FFMPEG_PATH` | Explicit FFmpeg binary path if FFmpeg is not available on `PATH`. |
| `LOG_LEVEL` | Pino logging level used by the message client; defaults to `info`. |
| `RAILWAY_STATIC_URL` | Platform URL that the Telegram code checks to select webhook mode. See the deployment notes: webhook mode requires a correctly configured incoming webhook receiver. |
| `WEBHOOK_BASE_URL` | Alternative base URL checked for Telegram webhook mode. Do not set it unless a webhook receiver is configured. |

### Optional performance tuning

<details>
<summary><strong>Show all tuning variables and defaults</strong></summary>

<br/>

The defaults below are defined in source code and normally do not need to be changed for a first run. Values are numeric milliseconds or counts unless the name says otherwise.

| Variable | Default | Used for |
|---|---:|---|
| `MAX_CONCURRENT_CONNECTIONS` | `12` | Maximum concurrent WhatsApp connections. |
| `MAX_CONCURRENT_PAIRINGS` | `3` | Maximum concurrent pairing attempts. |
| `WA_SEND_INTERVAL_MS` | `1000` | Base interval between sends. |
| `WA_SEND_JITTER_MS` | `300` | Randomized delay added to sends. |
| `PLUGIN_CONCURRENCY` | `8` | Per-session plugin work concurrency. |
| `PLUGIN_QUEUE_LIMIT` | `200` | Per-session plugin queue limit. |
| `GLOBAL_PLUGIN_CONCURRENCY` | `150` | Global plugin concurrency. |
| `EVENT_GLOBAL_CONCURRENCY` | `40` | Global event concurrency. |
| `CMD_TASK_TIMEOUT_MS` | `60000` | Command task timeout. |
| `TEXT_TASK_TIMEOUT_MS` | `15000` | Text-handler timeout. |
| `EVENT_TASK_TIMEOUT_MS` | `120000` | Event-handler timeout. |
| `CONNECTED_TIMEOUT_MS` | `300000` | Connected-session task timeout. |
| `CMD_MAX_WAIT_MS` | `30000` | Maximum time a command can wait in the queue. |
| `MSG_MAX_WAIT_MS` | `10000` | Maximum time a message task can wait in the queue. |
| `MSG_MAX_AGE_MS` | `120000` | Age threshold for rejecting stale messages. |
| `MSG_DEDUPE_MAX` | `300` | Maximum message IDs kept for duplicate suppression. |
| `SERIALIZER_RAW_TTL_MS` | `65000` | Raw serialized message cache lifetime. |
| `SERIALIZER_MAX_BODY_LEN` | `2000` | Maximum normalized message body length. |
| `SERIALIZER_METADATA_TTL_MS` | `60000` | Group metadata cache lifetime. |
| `SERIALIZER_METADATA_CACHE_MAX` | `3000` | Metadata cache entry limit. |
| `SERIALIZER_META_CONCURRENCY` | `10` | Concurrent metadata fetch limit. |
| `SERIALIZER_MAX_DOWNLOAD_BYTES` | `52428800` | Maximum download size handled by the serializer (50 MiB). Set `0` to disable this limit. |
| `SERIALIZER_IMG_CONCURRENCY` | `2` | Concurrent image-processing limit. |

</details>

### Example `.env`

Use this as a template and replace every example value. Do not commit secrets to Git.

```dotenv
# Recommended for cloud deployments; copy the complete URL from your PostgreSQL provider.
# DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require

# Telegram control bot
BOT_TOKEN=PASTE_YOUR_TELEGRAM_BOT_TOKEN_HERE
TG_GROUP_ID=-1001234567890
TG_GROUP_LINK=https://t.me/your_private_group
OWNER_IDS=123456789

# Bot presentation
BOT_NAME=miku
PACKNAME=x-miku
AUTHOR=@your_name
THEME=t
WA_CHANNEL_LINK=https://whatsapp.com/channel/your_channel_id

# Optional Turso settings sync (not a PostgreSQL URL)
# TURSO_DATABASE_URL=libsql://your-database-name.turso.io
# TURSO_AUTH_TOKEN=PASTE_YOUR_TURSO_TOKEN_HERE

# Optional integrations
# TGTOKEN=PASTE_A_TELEGRAM_TOKEN_IF_DIFFERENT
# REMOVE_BG_API=PASTE_YOUR_API_KEY
# FFMPEG_PATH=/usr/bin/ffmpeg
# LOG_LEVEL=info
# OFFTELEBOT=false
```

For local testing, keep `DATABASE_URL` commented out if you want the session store's local default. For a cloud deployment, uncomment it and use a valid PostgreSQL connection URL. On a hosting dashboard, add the values directly as environment variables.

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:ff4d94,50:8b5cf6,100:22d3ee&height=3&section=header" width="100%" alt="" />

## Free PostgreSQL and Database Options

For this project's **WhatsApp session store**, prefer a real PostgreSQL-compatible connection URL in `DATABASE_URL`. These provider details were checked on **28 October 2026**. Free plans change regularly, have usage limits, and may pause or delete inactive resources; check the provider's current terms before relying on a database for important sessions.

| Provider | Free / low-cost status | Links | Notes |
|---|---|---|---|
| <img src="https://img.shields.io/badge/Neon-00E599?style=flat-square&logo=neon&logoColor=black" alt="Neon" /> | Ongoing free tier with limits | [Create a database](https://neon.tech/) / [Pricing](https://neon.tech/pricing) | A good first provider to try. Copy the PostgreSQL connection string from the Neon dashboard. Free compute scales down when idle and quotas apply. |
| <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" /> | Free tier; 500 MB database size per project | [Create a project](https://supabase.com/dashboard) / [Pricing](https://supabase.com/pricing) | Free projects can pause after a week of low activity. Copy the database connection string from **Project Settings > Database**; choose the connection mode supported by your runtime. |
| <img src="https://img.shields.io/badge/Aiven-FF3554?style=flat-square&logo=aiven&logoColor=white" alt="Aiven" /> | Indefinite free tier advertised; 1 GB disk and 1 GB RAM | [Start free](https://aiven.io/free-postgresql-database) / [Free-tier docs](https://aiven.io/docs/products/postgresql/concepts/pg-free-tier) | No credit card is required according to its free-tier docs, but free services may power off after inactivity and have resource and connection limits. |
| <img src="https://img.shields.io/badge/CockroachDB-6933FF?style=flat-square&logo=cockroachlabs&logoColor=white" alt="CockroachDB" /> | A free Basic/serverless option is listed on current pricing; quotas apply | [CockroachDB Cloud](https://cockroachlabs.cloud/) / [Pricing](https://www.cockroachlabs.com/cockroachdb/pricing/) | Speaks the PostgreSQL wire protocol but is not identical to PostgreSQL. Test session creation, reconnects, and persistence before depending on it. |
| <img src="https://img.shields.io/badge/Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white" alt="Railway" /> | Trial credit followed by a small monthly free credit; not unlimited free hosting | [Railway](https://railway.com/) / [PostgreSQL docs](https://docs.railway.com/databases/postgresql) / [Pricing](https://docs.railway.com/pricing/plans) | Convenient when the bot and database live in one Railway project. Check usage; the free monthly credit can be insufficient for an always-on bot and database. |
| <img src="https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=black" alt="Render" /> | Free database for testing; 1 GB and expires after 30 days | [Render dashboard](https://dashboard.render.com/) / [Free-tier docs](https://render.com/docs/free) | **Not recommended for long-term session storage** unless you upgrade before expiration. Free Render web services also spin down after inactivity and lose local filesystem changes. |
| <img src="https://img.shields.io/badge/Turso-4FF8D2?style=flat-square&logo=turso&logoColor=black" alt="Turso" /> | Free tier with limits; not PostgreSQL | [Turso](https://turso.tech/) / [Pricing](https://turso.tech/pricing) | This project uses Turso only for optional settings sync via `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`; do not paste a Turso URL into `DATABASE_URL`. |

**Which should I choose?** Start with **Neon** or **Aiven**, then test the bot's pair, restart, and reconnect flow. Supabase is also an option, but inactivity pausing can interrupt a bot's storage access. CockroachDB and any other PostgreSQL-compatible service should be tested against this project's session store before production use.

### How to connect a managed PostgreSQL database

1. Create a database with your chosen provider.
2. Open its connection details and copy the **PostgreSQL connection string/URL**. It usually begins with `postgresql://` or `postgres://`.
3. If the provider supplies a pooled URL and a direct URL, follow its guidance for persistent application connections. Preserve required TLS options such as `sslmode=require` when they are included.
4. Set the complete URL as `DATABASE_URL` in your local `.env` or hosting dashboard.
5. Restart or redeploy Miku, pair a test account, restart the application, and confirm the saved session is restored.
6. Keep the URL private. It contains database credentials.

```dotenv
DATABASE_URL=postgresql://DB_USER:DB_PASSWORD@DB_HOST:5432/DB_NAME?sslmode=require
```

The line above is a **placeholder**, not a working credential. Replace it with the exact URL from your database provider. Passwords containing reserved URL characters may need URL encoding; use the provider's generated connection URL where possible.

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:ff4d94,50:8b5cf6,100:22d3ee&height=3&section=header" width="100%" alt="" />

## Deployment Guides

### Choose a platform

| Platform | Suitable use | Important limitation |
|---|---|---|
| <img src="https://img.shields.io/badge/Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white" alt="Railway" /> | Simple Git-based deployment with PostgreSQL in the same project | Free resources are limited; the always-on bot may use more than the monthly free credit. |
| <img src="https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=black" alt="Render" /> | Preview and testing | The free web service spins down after inactivity, local files are ephemeral, and a free Postgres database expires after 30 days. |
| <img src="https://img.shields.io/badge/Heroku-430098?style=flat-square&logo=heroku&logoColor=white" alt="Heroku" /> | Managed application deployment | Heroku app compute and the PostgreSQL Essential add-on are paid; this is not a permanently free deployment. |
| <img src="https://img.shields.io/badge/VPS-Ubuntu%20%2F%20Debian-E95420?style=flat-square&logo=ubuntu&logoColor=white" alt="VPS" /> | Most control and the most reliable long-running operation | Requires server administration, updates, firewall configuration, and backups. |
| <img src="https://img.shields.io/badge/Termux-Android-000000?style=flat-square&logo=termux&logoColor=white" alt="Termux" /> | Local testing and development | **Testing only, not recommended for production.** Android may stop background processes and the network and battery are not as reliable as a server. |
| <img src="https://img.shields.io/badge/Docker-Container-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" /> | Containers or hosts that build from a `Dockerfile` | Keep credentials out of the image and configure persistent storage for local settings. |

> [!IMPORTANT]
> An always-on WhatsApp bot needs a stable process and persistent authentication storage. A free web service that sleeps, a short-lived database, or an ephemeral filesystem is fine for testing but can interrupt the bot or force you to pair again.

### <img src="https://cdn.simpleicons.org/railway/8b5cf6" height="26" align="center" alt="" /> Railway

<a href="https://railway.com/new"><img src="https://img.shields.io/badge/Open-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white" alt="Open Railway" /></a>
<a href="https://docs.railway.com/quick-start"><img src="https://img.shields.io/badge/Quick%20Start-8b5cf6?style=for-the-badge&labelColor=0f0f1a" alt="Quick Start" /></a>
<a href="https://docs.railway.com/variables"><img src="https://img.shields.io/badge/Variables-22d3ee?style=for-the-badge&labelColor=0f0f1a" alt="Variables" /></a>
<a href="https://docs.railway.com/databases/postgresql"><img src="https://img.shields.io/badge/PostgreSQL-4169e1?style=for-the-badge&logo=postgresql&logoColor=white&labelColor=0f0f1a" alt="PostgreSQL" /></a>

1. Push this project to a GitHub repository you control.
2. In Railway, choose **New Project > Deploy from GitHub Repo**, then select the repository.
3. Add a PostgreSQL service from **New > Database > PostgreSQL**.
4. Open the Miku app service's **Variables** tab. Add `DATABASE_URL` as a reference to the PostgreSQL service's URL. If the database service is named `Postgres`, the reference commonly looks like:

   ```text
   ${{Postgres.DATABASE_URL}}
   ```

   Change `Postgres` to the exact name of your database service. You can also copy the external URL from the database settings, but keep it secret.
5. Add `BOT_TOKEN`, `TG_GROUP_ID`, and `OWNER_IDS` if you want Telegram controls. Set any other values you need from the [environment table](#environment-variables).
6. Review the service's build and deploy settings and deploy. The start command is `npm start` when using the Node runtime.
7. Generate a public domain only if you need to call the HTTP API remotely. Remember that the API currently has no authentication.
8. Open the deployment logs and confirm that the database initializes, plugins load, and the server starts.

> [!NOTE]
> **Telegram webhook mode:** `telegramBOT/bot.js` switches away from polling when `RAILWAY_STATIC_URL` or `WEBHOOK_BASE_URL` is present. The code sets a Telegram webhook URL, but `index.js` does not define a dedicated route that processes incoming Telegram webhook updates. Do not assume Telegram controls will work in webhook mode without implementing and testing a receiver. You can set `OFFTELEBOT=true` and use the HTTP API for testing, or adjust the Telegram integration to use a properly configured webhook or polling strategy.

Railway's free plan currently provides limited monthly credit, not unlimited free hosting. Check [current pricing](https://docs.railway.com/pricing/plans) before leaving the app running continuously.

### <img src="https://cdn.simpleicons.org/render/46E3B7" height="26" align="center" alt="" /> Render

<a href="https://render.com/deploy?repo=https://github.com/nightx-rebel/hatsune"><img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render" height="34" /></a>
<a href="https://render.com/docs/free"><img src="https://img.shields.io/badge/Free%20Limits-46E3B7?style=for-the-badge&logo=render&logoColor=black" alt="Free service limits" /></a>
<a href="https://render.com/docs/your-first-deploy"><img src="https://img.shields.io/badge/First%20Deploy-0f0f1a?style=for-the-badge&logo=render&logoColor=46E3B7" alt="First deployment" /></a>

1. Push the project to GitHub.
2. In Render, choose **New > Web Service**, then connect the repository.
3. Choose the Node runtime if you want the native Node build instead of Docker. Use **Build Command** `npm install` and **Start Command** `npm start`.
4. Add `DATABASE_URL` and your other environment variables in the service's **Environment** page.
5. Deploy, then open the generated service URL and check the root status endpoint.

> [!WARNING]
> **Free-tier limits:** Render free web services spin down after 15 minutes without inbound traffic, and filesystem changes are lost on spin-down or redeploy. Free Render Postgres databases are limited to 1 GB and expire 30 days after creation. These constraints make the free tier useful for a preview or test, not a dependable always-on WhatsApp bot. Use persistent or paid resources for a lasting deployment.

### <img src="https://cdn.simpleicons.org/heroku/8b5cf6" height="26" align="center" alt="" /> Heroku

<a href="https://heroku.com/deploy?template=https://github.com/nightx-rebel/hatsune"><img src="https://www.herokucdn.com/deploy/button.svg" alt="Deploy to Heroku" height="34" /></a>
<a href="https://devcenter.heroku.com/articles/container-registry-and-runtime"><img src="https://img.shields.io/badge/Container%20Guide-430098?style=for-the-badge&logo=heroku&logoColor=white" alt="Container deployment guide" /></a>
<a href="https://www.heroku.com/pricing/"><img src="https://img.shields.io/badge/Pricing-0f0f1a?style=for-the-badge&logo=heroku&logoColor=white" alt="Pricing" /></a>

Heroku's current app compute and the `heroku-postgresql:essential-0` add-on configured by this project are paid. The steps below are for a paid Heroku app.

1. Install the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) and sign in:

   ```bash
   heroku login
   ```

2. From the project root, create the app and enable the container stack:

   ```bash
   heroku create YOUR-APP-NAME
   heroku stack:set container -a YOUR-APP-NAME
   ```

3. Add PostgreSQL if the app does not already have it:

   ```bash
   heroku addons:create heroku-postgresql:essential-0 -a YOUR-APP-NAME
   ```

   Heroku exposes the database connection through `DATABASE_URL`.

4. Set the bot variables. Replace the example values:

   ```bash
   heroku config:set BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN" -a YOUR-APP-NAME
   heroku config:set TG_GROUP_ID="-1001234567890" -a YOUR-APP-NAME
   heroku config:set OWNER_IDS="123456789" -a YOUR-APP-NAME
   ```

5. Build and release the Docker image:

   ```bash
   heroku container:login
   heroku container:push web -a YOUR-APP-NAME
   heroku container:release web -a YOUR-APP-NAME
   ```

6. Inspect logs and open the app:

   ```bash
   heroku logs --tail -a YOUR-APP-NAME
   heroku open -a YOUR-APP-NAME
   ```

Heroku's container filesystem is ephemeral. Use PostgreSQL for the WhatsApp auth store and keep in mind that local `data/settings.sqlite` does not survive reliably across restarts or deployments. Configure and test Turso sync or another persistent settings strategy if those settings matter.

### <img src="https://cdn.simpleicons.org/ubuntu/8b5cf6" height="26" align="center" alt="" /> VPS (Ubuntu / Debian)

A VPS is usually the best choice when you need a long-running process and want control over storage. These commands are for a fresh Ubuntu or Debian server; adjust them for your OS and Node.js installation method.

1. Update the system and install the system dependencies:

   ```bash
   sudo apt update
   sudo apt install -y git ffmpeg ca-certificates curl
   ```

2. Install Node.js **22.13+** using the [official Node.js instructions](https://nodejs.org/en/download/package-manager), then verify:

   ```bash
   node --version
   npm --version
   ```

3. Clone and install the app:

   ```bash
   git clone https://github.com/nightx-rebel/hatsune.git
   cd hatsune
   npm install
   cp .env.example .env
   nano .env
   ```

4. Set `DATABASE_URL` to your managed PostgreSQL URL for a cloud-ready setup. If you are using only local storage, ensure the server's `data/` directory is backed up and not deleted during deployments.
5. Start it:

   ```bash
   npm start
   ```

6. For an automatically restarted process, install PM2 and start Miku:

   ```bash
   npm install -g pm2
   pm2 start index.js --name miku
   pm2 save
   pm2 startup
   ```

   Run the command printed by `pm2 startup` if it asks for an additional privileged command. Useful PM2 commands:

   ```bash
   pm2 status
   pm2 logs miku
   pm2 restart miku
   pm2 stop miku
   ```

7. Configure your firewall to expose only the ports you actually need. Do not expose the unauthenticated management API publicly without an access-control layer.

### <img src="https://cdn.simpleicons.org/termux/8b5cf6" height="26" align="center" alt="" /> Android Termux (testing only)

> [!CAUTION]
> Termux is for testing and development, not production hosting. Android battery management, sleep, app lifecycle, changing networks, and device restarts can stop the bot unexpectedly.

1. Install Termux from a trusted source, then run:

   ```bash
   pkg update -y && pkg upgrade -y
   pkg install -y nodejs-lts git ffmpeg
   ```

2. Check the Node.js version. It must satisfy the project's `>=22.13.0` requirement:

   ```bash
   node --version
   ```

3. Download and install:

   ```bash
   git clone https://github.com/nightx-rebel/hatsune.git
   cd hatsune
   npm install
   cp .env.example .env
   nano .env
   ```

4. Configure `.env`, then run:

   ```bash
   npm start
   ```

5. On the same phone, open `http://127.0.0.1:3000/` in a browser. Press `Ctrl+C` in the Termux terminal to stop the process.

Do not rely on Termux for permanent session availability or as a public production server. Never share your phone's local API by forwarding ports without authentication.

### <img src="https://cdn.simpleicons.org/docker/8b5cf6" height="26" align="center" alt="" /> Docker

The Dockerfile uses Node 24 and installs FFmpeg. Build and run the image from the project root:

```bash
docker build -t miku-bot .
docker run --name miku-bot --restart unless-stopped \
  -p 5000:5000 -e PORT=5000 --env-file .env \
  -v miku-data:/app/data \
  miku-bot
```

Use a named volume or another persistent storage method if you depend on `data/settings.sqlite`. The primary WhatsApp authentication store should use `DATABASE_URL` in cloud deployments. Never bake `.env` or live secrets into the Docker image.

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:ff4d94,50:8b5cf6,100:22d3ee&height=3&section=header" width="100%" alt="" />

## Telegram Control Bot

<a href="https://t.me/BotFather"><img src="https://img.shields.io/badge/Create%20a%20Bot-BotFather-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="BotFather" /></a>

Create a bot using [@BotFather](https://t.me/BotFather), put the token into `BOT_TOKEN`, then restart the app. The control bot uses polling by default unless `RAILWAY_STATIC_URL` or `WEBHOOK_BASE_URL` activates webhook mode.

### Common Telegram commands

| Command | Purpose |
|---|---|
| `/start` | Show the welcome message and pairing guidance. |
| `/help` or `/commands` | Display the Telegram help menu. |
| `/pair +91XXXXXXXXXX` | Request a WhatsApp pairing code. Include your country code. |
| `/ping` | Check Telegram bot response latency. |
| `/sessions` | List registered WhatsApp sessions (group-admin command). |
| `/status` | Show bot uptime, memory, Node version, and session summary. |
| `/health` | Show runtime and memory information. |
| `/restart NUMBER` | Restart a saved WhatsApp session. |
| `/stop NUMBER` | Stop a session but keep its stored credentials. |
| `/logout NUMBER` | Remove a session's credentials; the number must be paired again. |
| `/reactp LINK [EMOJI]` | React to a supported WhatsApp channel post. |
| `/id` | Show chat and user ID details useful for configuration. |
| `/about` | Display bot information and support links. |
| `/s NUMBER CODE` | Run a socket-level operation on one session. **Powerful, admin-only.** |
| `/as CODE` | Run a socket-level operation across sessions. **Powerful, admin-only.** |
| `/d COMMAND` | Run a shell command on the host. **Highly privileged; restrict with `OWNER_IDS`.** |

`/stop` and `/logout` are different: stopping preserves the stored login; logging out deletes credentials. Only use these commands for accounts you own or are explicitly authorized to manage.

## WhatsApp Commands

The WhatsApp prefix is `.` by default (`config.js`). Type the command in a chat where the linked account can receive it.

| Example | Purpose |
|---|---|
| `.menu` | Show the command menu created from plugins that loaded successfully. |
| `.list` | Show command names and available plugin entries. |
| `.ping` | Test bot response. |
| `.uptime` | Check uptime. |
| `.owner` | Display the configured or embedded owner contact command, where available. |

The plugin library also contains group tools, media converters, download and search integrations, anime-related commands, mini-games, utilities, AI integrations, owner tools, and event automations. The exact command list depends on plugin loading and any external service or API requirements. Use `.menu` and `.list` on the running bot rather than relying on a static list in a README.

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:ff4d94,50:8b5cf6,100:22d3ee&height=3&section=header" width="100%" alt="" />

## HTTP API

The Express server exposes the following routes. Replace `http://localhost:3000` with your private deployment URL if appropriate.

| Method | Route | What it does |
|---|---|---|
| ![GET](https://img.shields.io/badge/GET-22d3ee?style=flat-square&labelColor=0f0f1a) | `/` | Basic health/status response, active session count, plugin count, and queue stats. |
| ![GET](https://img.shields.io/badge/GET-22d3ee?style=flat-square&labelColor=0f0f1a) | `/sessions` | List registered sessions and status. |
| ![GET](https://img.shields.io/badge/GET-22d3ee?style=flat-square&labelColor=0f0f1a) | `/plugins` | Show plugin loader information. |
| ![GET](https://img.shields.io/badge/GET-22d3ee?style=flat-square&labelColor=0f0f1a) | `/pair/:num` | Request a pairing code. `:num` must be the international phone number as digits only, without `+`. |
| ![GET](https://img.shields.io/badge/GET-22d3ee?style=flat-square&labelColor=0f0f1a) | `/start/:phone` | Start a previously paired session for that phone number. |
| ![GET](https://img.shields.io/badge/GET-22d3ee?style=flat-square&labelColor=0f0f1a) | `/session/:sessionId` | Inspect a session's status. |
| ![POST](https://img.shields.io/badge/POST-ff4d94?style=flat-square&labelColor=0f0f1a) | `/stop/:sessionId` | Stop the session but preserve credentials. |
| ![POST](https://img.shields.io/badge/POST-ff4d94?style=flat-square&labelColor=0f0f1a) | `/logout/:sessionId` | Log out and delete session credentials. |

Examples:

```bash
# Check server health
curl http://localhost:3000/

# List loaded plugins
curl http://localhost:3000/plugins

# Request a code (use your own number)
curl http://localhost:3000/pair/919812345678

# Stop or log out a session (replace SESSION_ID)
curl -X POST http://localhost:3000/stop/SESSION_ID
curl -X POST http://localhost:3000/logout/SESSION_ID
```

> [!WARNING]
> The API does not use an API key, login, or bearer token in the current source. Do not publish its URL in a public README or expose it without adding authentication; `/pair` can initiate pairing attempts, and `/logout` deletes credentials.

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:ff4d94,50:8b5cf6,100:22d3ee&height=3&section=header" width="100%" alt="" />

## Project Structure

### Core files

| Path | Responsibility |
|---|---|
| `index.js` | Main entry point. Loads plugins and storage, restores sessions, optionally starts Telegram, serves the HTTP API, and handles graceful shutdown. |
| `config.js` | Central configuration defaults and environment-variable mapping. |
| `package.json` | Project metadata, Node.js engine requirement, scripts, and dependencies. |
| `README.md` | Setup, environment, deployment, and project documentation. |
| `.env.example` | Safe configuration template to copy to `.env` and customize. |
| `.dockerignore` | Keeps local secrets, runtime data, and dependencies out of the Docker build context. |
| `LICENSE` | MIT license text. |
| `.gitignore` | Excludes secrets, dependency folders, and generated runtime data from Git. |

### Deployment and hosting files

| Path | Responsibility |
|---|---|
| `Dockerfile` | Container build; installs Node.js and FFmpeg, then starts `index.js`. |
| `Procfile` | Process declaration for compatible hosting platforms (`web: node index`). |
| `heroku.yml` | Heroku container and PostgreSQL add-on configuration. |
| `app.json` | Heroku app metadata and deploy-time configuration fields. |

### Runtime libraries

| Path | Responsibility |
|---|---|
| `lib/manager.js` | Wraps Socksy's `MultiSocketManager`; tracks sessions, pairing outcomes, reconnects, and lifecycle events. |
| `lib/client.js` | Processes WhatsApp message/event traffic, dispatches plugins, limits concurrency, and initializes the settings database. |
| `lib/plugins.js` | Plugin registration (`Module()`), recursive discovery, command registry, metadata, and reload support. It skips hidden paths, `node_modules`, and directories named `bin`. |
| `lib/serialize.js` | Normalizes Baileys messages and manages message/group metadata helpers and caches. |
| `lib/sticker.js` | Media/sticker helpers and FFmpeg-backed conversions. |
| `lib/handier.js` | Shared utility functions used by multiple features. |
| `lib/database/db-remote.js` | Local SQLite settings database plus optional Turso/libSQL synchronization. It is separate from `DATABASE_URL`. |
| `lib/Class/translate.js` | Translation/localization helper class. |
| `telegramBOT/bot.js` | Telegram commands and callbacks for pairing, session management, status, and privileged operations. |
| `Themes/themes.js` | Loads the selected theme. |
| `Themes/t.json` | Default theme data used when `THEME=t`. |

### Plugin categories and files

Files in these categories are loaded recursively by `lib/plugins.js`, except any file beneath a folder named `bin`. Individual features may also require external APIs or may fail to load when a dependency or network endpoint changes.

<details>
<summary><strong>Anime: <code>plugins/anime/</code></strong></summary>

<br/>

| File | Purpose |
|---|---|
| `Animeimg.js` | Anime image-related commands/utilities. |
| `anime.js` | Anime-related command handlers. |
| `anime2.js` | Additional anime-related handlers. |

</details>

<details>
<summary><strong>Converters: <code>plugins/converter/</code></strong></summary>

<br/>

| File | Purpose |
|---|---|
| `attp.js` | Animated/text sticker conversion tools. |
| `catbox.js` | Catbox media upload helper/command. |
| `logo.js` | Logo/image effect tools. |
| `lyrics.js` | Lyrics lookup integration. |
| `remini.js` | Image enhancement integration. |
| `shortener.js` | URL shortener integration. |
| `sticker.js` | Sticker creation/conversion commands. |
| `toimage.js` | Convert supported sticker/media content to an image or other viewable form. |
| `tomp3.js` | Audio/video-to-MP3 conversion. |
| `translator.js` | Text translation helper/command. |
| `tts.js` | Text-to-speech. |

</details>

<details>
<summary><strong>Download and search: <code>plugins/download/</code></strong></summary>

<br/>

| File | Purpose |
|---|---|
| `downloader.js` | General media download routing. |
| `facebook.js` | Facebook-related download integration. |
| `gifsearch.js` | GIF search. |
| `github.js` | GitHub-related lookup/download tools. |
| `ig.js` | Instagram-related download integration. |
| `pinterest.js` | Pinterest-related search/download integration. |
| `search_plugins.js` | Search-related plugin commands. |
| `spotify.js` | Spotify metadata/media integration. |
| `terabox.js` | TeraBox-related download integration. |
| `tgsticker.js` | Telegram sticker-pack integration; may use `TGTOKEN` or `BOT_TOKEN`. |
| `tiktok.js` | TikTok-related download integration. |
| `twitter.js` | Twitter/X-related download integration. |
| `webzip.js` | Website/archive utility. |
| `wiki.js` | Wikipedia lookup. |
| `yt-downloader.js` | YouTube-related download integration. |

</details>

<details>
<summary><strong>Events and automation: <code>plugins/event/</code></strong></summary>

<br/>

| File | Purpose |
|---|---|
| `anticall.js` | Call-event handling. |
| `autojoin.js` | Group/channel auto-join behavior where configured. |
| `autoreact.js` | Automatic reactions. |
| `autoread.js` | Automatic read receipts. |
| `autostatus.js` | Status-event automation. |
| `login_message.js` | Session login/connection messages. |
| `newsletter.js` | WhatsApp channel/newsletter event handling. |
| `presence.js` | Presence/typing-related behavior. |

</details>

<details>
<summary><strong>Games: <code>plugins/game/</code></strong></summary>

<br/>

| File | Purpose |
|---|---|
| `blockblast.js` | Block puzzle mini-game. |
| `calc.js` | Calculator command. |
| `drum.js` | Drum/music interaction. |
| `fishing.js` | Fishing-themed mini-game. |
| `flappy.js` | Flappy-style mini-game. |
| `game.js` | General game commands. |
| `gamesweb.js` | Web-based game integration. |
| `guitar.js` | Guitar/music interaction. |
| `minesweeper.js` | Minesweeper-style puzzle. |
| `noxguitar.js` | Additional guitar/music interaction. |
| `piano.js` | Piano/music interaction. |
| `slots.js` | Game command module. |
| `snake.js` | Snake-style mini-game. |
| `tictactoe.js` | Tic-tac-toe. |

</details>

<details>
<summary><strong>General commands: <code>plugins/general/</code></strong></summary>

<br/>

| File | Purpose |
|---|---|
| `btpn.js` | General bot response/menu interactions. |
| `menu_new.js` | Builds the command menu from registered plugin metadata. |
| `ping.js` | Bot response/latency command. |
| `uptime.js` | Uptime command. |

</details>

<details>
<summary><strong>Group tools: <code>plugins/group/</code></strong></summary>

<br/>

| File | Purpose |
|---|---|
| `1mde.js` | Group-related command module. |
| `Tagall.js` | Group member mention/tag utilities. |
| `allgst.js` | Group message/media helper commands. |
| `antilink.js` | Anti-link moderation. |
| `antisticker.js` | Anti-sticker moderation. |
| `group.js` | Group configuration and administration commands. |
| `groupupdate.js` | Group participant/update events and message templates. |
| `gst.js` | Group message/media helper commands. |
| `kickall.js` | Group moderation command; use only where you have permission. |

</details>

<details>
<summary><strong>Owner tools: <code>plugins/owner/</code></strong></summary>

<br/>

| File | Purpose |
|---|---|
| `Fwd.js` | Forwarding utilities. |
| `owner2.js` | Owner-only command handlers. |
| `reload_plugin.js` | Plugin reload command. |
| `strg.js` | Storage/session-related helper commands. |
| `test.js` | Test/diagnostic commands. |
| `tools.js` | Owner utility commands. |
| `whatsapp.js` | WhatsApp account/profile/privacy utility commands. |

</details>

<details>
<summary><strong>Tools and integrations: <code>plugins/tools/</code></strong></summary>

<br/>

| File | Purpose |
|---|---|
| `ai.js` | AI integration commands. |
| `broadcast.js` | Broadcast/message distribution utility. Use responsibly and only with recipients who expect your messages. |
| `ckid.js` | Identifier/JID lookup tools. |
| `contact_tools.js` | Contact tools, including supported export/utilities. |
| `devotion.js` | Devotional-content commands. |
| `fetch.js` | Fetch/request utility. |
| `owner_tools.js` | Owner-focused integrations; `REMOVE_BG_API` is optional for a related feature. |
| `raw.js` | Raw/low-level message utility commands. |
| `ssweb.js` | Website screenshot integration. |
| `weather.js` | Weather integration. |

</details>

### Shared helper files not auto-loaded as plugins

The loader deliberately skips directories named `bin`, so these files are helpers and assets rather than automatically registered commands.

<details>
<summary><strong><code>plugins/bin/</code> helpers and assets</strong></summary>

<br/>

| File | Purpose |
|---|---|
| `ai.js` | Shared AI helper code. |
| `builder.js` | Shared builder/interactive utility code. |
| `fetchGif.js` | GIF fetch helper. |
| `instagram.js` | Shared Instagram helper. |
| `menu.mp4` | Menu media asset. |
| `menu_img.js` | Menu image helper. |
| `sPR_Full.js` | Shared helper module used by other plugin code. |
| `sticker.js` | Shared sticker helper. |
| `text.js` | Shared text utility code. |
| `ytmp3.js` | Shared YouTube/audio helper code. |

</details>

The file `plugins/bin_folder_is_not_a_plugin` is a marker explaining that the `bin` directory is not a plugin directory. Add new auto-loaded commands to a normal category folder such as `plugins/general/`, `plugins/tools/`, or a new non-`bin` subdirectory.

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:ff4d94,50:8b5cf6,100:22d3ee&height=3&section=header" width="100%" alt="" />

## Add a Plugin

Plugins are registered through `Module()` in `lib/plugins.js`. Each JavaScript plugin can register a command, a text handler, a message handler, or a Baileys event handler. The loader imports `.js` files recursively under `plugins/`, skipping hidden paths, `node_modules`, and any directory named `bin`.

### Example: add a simple command

Create `plugins/general/hello.js`:

```js
import { Module } from "../../lib/plugins.js";

Module({
  command: "hello",
  package: "general",
  description: "Send a greeting",
})(async (message) => {
  await message.conn.sendMessage(
    message.from,
    { text: "Hello from Miku!" },
    { quoted: message.gift },
  );
});
```

Restart the app and try:

```text
.hello
```

### Plugin metadata fields

| Field | Meaning |
|---|---|
| `command` | Registers a command, invoked with the configured prefix (default `.`). |
| `aliases` | Optional array of additional command names. |
| `package` | Category used by the menu. |
| `description` | Human-readable description shown by command-list tools, where supported. |
| `on` | Registers text/message/event listeners such as `"text"`, `"message"`, `"connected"`, or `"group-participants.update"`. |
| `match` | Optional filter to decide which messages should be considered by a text/message handler. |
| `light` | Marks a small, fast handler for the lightweight dispatch path. |

Read a nearby plugin before building a more advanced command because helper signatures vary between commands, text handlers, and event handlers. Check startup logs after adding a plugin; import errors are logged and the failed file will not be available.

## Troubleshooting

<details>
<summary><strong>Node.js version error or SQLite module error</strong></summary>

<br/>

Run `node --version` and install Node.js 22.13 or newer. The project uses Node's built-in `node:sqlite`; do not try to fix this by installing an unrelated SQLite npm package.

</details>

<details>
<summary><strong>Pairing code fails or expires</strong></summary>

<br/>

- Enter the complete international number with country code.
- For the HTTP route, use digits only and omit `+` (example: `919812345678`).
- Request a new code if the previous code expired.
- Check logs for network errors, WhatsApp account restrictions, or a failed connection.
- Do not start concurrent pairing attempts for the same number.

</details>

<details>
<summary><strong>The session is missing after restart or redeploy</strong></summary>

<br/>

- Check that `DATABASE_URL` is valid and points to a PostgreSQL database the app can reach.
- Confirm that you did not change or delete the database.
- Test pairing, stopping the app, restarting it, and confirming that the session reloads.
- Local SQLite and files on ephemeral cloud filesystems can disappear on redeploy. Use a persistent database for session authentication and persistent storage or verified Turso sync for important local settings.

</details>

<details>
<summary><strong>PostgreSQL connection or authentication error</strong></summary>

<br/>

- Copy the complete provider-generated connection string.
- Check username, password, database name, host, and port.
- Preserve required TLS settings such as `sslmode=require`.
- Confirm that the database allows connections from the deployment network.
- Some PostgreSQL-compatible services differ from PostgreSQL; test them with this session-store package before production.

</details>

<details>
<summary><strong>Telegram commands do not respond</strong></summary>

<br/>

- Confirm that `BOT_TOKEN` is set and correct.
- Make sure only one polling process uses that token at a time.
- Confirm `TG_GROUP_ID` matches the group where admin commands are being used.
- Check startup logs for Telegram API errors.
- If `RAILWAY_STATIC_URL` or `WEBHOOK_BASE_URL` is set, the source selects webhook mode; verify the webhook receiver is actually configured. If not, use a working polling configuration or temporarily set `OFFTELEBOT=true` and test with the HTTP API.

</details>

<details>
<summary><strong>FFmpeg/media conversions fail</strong></summary>

<br/>

Install FFmpeg and check that the executable is on `PATH`:

```bash
# Ubuntu / Debian
sudo apt install -y ffmpeg

# Termux
pkg install ffmpeg
```

If it is installed in a non-standard path, set `FFMPEG_PATH`.

</details>

<details>
<summary><strong>A command is missing</strong></summary>

<br/>

- Send `.menu` or `.list` to view what the running instance registered.
- Check logs for `[plugins] Error loading ...` messages.
- Ensure the command file is in a directory other than `bin` and ends in `.js`.
- Check the file's `Module({ command: "..." })` metadata and required API keys.

</details>

<details>
<summary><strong>Docker build fails</strong></summary>

<br/>

The Docker build requires a Node.js 24-compatible environment and FFmpeg. Check the Docker build logs for missing paths, install failures, or incorrect environment settings. If deploying from an older copy of the repository, inspect `Dockerfile` for `COPY scripts ./scripts`; this project archive does not contain a `scripts/` directory, so that stale line must be removed or the intended directory must be added.

</details>

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:ff4d94,50:8b5cf6,100:22d3ee&height=3&section=header" width="100%" alt="" />

## Security and Responsible Use

- **Keep the HTTP API private.** The current Express routes do not authenticate requests. Add access control before exposing the API to the public internet.
- **Lock down Telegram administration.** Set `OWNER_IDS` to trusted Telegram numeric user IDs. If it is blank, the `/d`, `/s`, and `/as` operations can fall back to group-administrator access. `/d` runs shell commands on the host; do not enable it in an untrusted group.
- **Protect credentials.** Never commit `.env`, `DATABASE_URL`, `BOT_TOKEN`, `TURSO_AUTH_TOKEN`, pairing codes, or session IDs. Rotate credentials if they leak.
- **Use your own or authorized WhatsApp accounts.** Pairing codes and session credentials grant account access.
- **Respect privacy and platform rules.** Do not use broadcast features for spam or unsolicited bulk messaging. Use moderation tools only where you have the appropriate permissions.
- **Review third-party integrations.** Media downloaders and external APIs can change, be rate-limited, or have their own terms and content restrictions.
- **Back up your database.** Free-tier quotas and expiration or pause policies are not a backup plan.
- **Use one bot instance unless you have designed for multiple replicas.** Running multiple replicas against the same app state can create conflicting session and process behavior.

Miku uses Baileys, an unofficial WhatsApp Web client library. It is not an official WhatsApp product, and upstream changes can affect availability or compatibility.

## License

This project is distributed under the **MIT License**. See [`LICENSE`](LICENSE) for the full license text.

<div align="center">

<br/>

<a href="https://github.com/nightx-rebel/hatsune"><img src="https://img.shields.io/badge/Project-Repository-ff4d94?style=for-the-badge&logo=github&logoColor=white&labelColor=0f0f1a" alt="Project Repository" /></a>
<a href="https://github.com/nightx-rebel/socksy"><img src="https://img.shields.io/badge/Socksy-Engine-8b5cf6?style=for-the-badge&logo=github&logoColor=white&labelColor=0f0f1a" alt="Socksy Engine" /></a>
<a href="https://github.com/nightx-rebel"><img src="https://img.shields.io/badge/Author-nightx--rebel-22d3ee?style=for-the-badge&logo=github&logoColor=white&labelColor=0f0f1a" alt="Author" /></a>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:ff4d94,50:8b5cf6,100:22d3ee&height=140&section=footer&text=Thank%20you%20for%20using%20Miku&fontSize=24&fontColor=ffffff&fontAlignY=68" width="100%" alt="" />

</div>
