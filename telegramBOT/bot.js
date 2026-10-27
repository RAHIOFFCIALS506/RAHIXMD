import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import config from "../config.js";
import TelegramBot from "node-telegram-bot-api";

export default async function initializeTelegramBot(manager) {
  // ═══════════════════════════════════════════════════════════════════════════
  //  CONFIG
  // ═══════════════════════════════════════════════════════════════════════════
  const BOT_TOKEN = config.BOT_TOKEN;
  const ALLOWED_GROUP_ID = config.ALLOWED_GROUP_ID;
  const GROUP_INVITE_LINK = config.GROUP_INVITE_LINK;
  const WA_CHANNEL_LINK = config.WA_CHANNEL_LINK;
  const PAIR_COOLDOWN_MS = Number(config.PAIR_COOLDOWN_MS) || 30_000;

  // Optional: restrict dangerous commands (/s /as /d) to specific Telegram
  // user IDs. In config.js:  OWNER_IDS: "123456789,987654321"  (or an array)
  // If not set, any group admin can use them (old behaviour).
  const OWNER_IDS = []
    .concat(config.OWNER_IDS ?? [])
    .flatMap((v) => String(v).split(","))
    .map((v) => v.trim())
    .filter(Boolean);

  if (!BOT_TOKEN) {
    console.warn("❌ [bot.js] BOT_TOKEN not set — skipping Telegram bot.");
    return null;
  }

  const RAILWAY_URL =
    process.env.RAILWAY_STATIC_URL || process.env.WEBHOOK_BASE_URL || "";
  const USE_WEBHOOK = Boolean(RAILWAY_URL);

  const tbot = new TelegramBot(
    BOT_TOKEN,
    USE_WEBHOOK
      ? { polling: false }
      : { polling: { interval: 3000, timeout: 30 } },
  );

  tbot.on("polling_error", (e) =>
    console.error("❗ [bot.js] Polling error:", e?.message || e),
  );
  tbot.on("webhook_error", (e) =>
    console.error("❗ [bot.js] Webhook error:", e?.message || e),
  );

  // Bot identity
  let botId = null;
  try {
    const me = await tbot.getMe();
    botId = me.id;
    tbot.botId = me.id;
    tbot.botUsername = me.username;
    console.log(
      `🤖 [bot.js] @${me.username} (${me.id}) — mode: ${USE_WEBHOOK ? "webhook" : "polling"}`,
    );
  } catch (e) {
    console.warn("⚠️ [bot.js] getMe failed:", e?.message);
  }

  // Per-user /pair cooldown (swept periodically so it never grows forever)
  const pairCooldown = new Map(); // userId → timestamp
  const cooldownSweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [uid, ts] of pairCooldown) {
      if (now - ts > PAIR_COOLDOWN_MS) pairCooldown.delete(uid);
    }
  }, PAIR_COOLDOWN_MS * 2);
  cooldownSweepTimer.unref?.();

  // ═══════════════════════════════════════════════════════════════════════════
  //  TEXT HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const LINE = "━━━━━━━━━━━━━━━━━━";

  const esc = (s = "") =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Sans-serif bold font (𝖧𝖾𝗅𝗅𝗈) — body labels
  const F = (text = "") =>
    String(text).replace(/[A-Za-z]/g, (ch) => {
      const c = ch.charCodeAt(0);
      return c <= 90
        ? String.fromCodePoint(0x1d5a0 + (c - 65))
        : String.fromCodePoint(0x1d5ba + (c - 97));
    });

  // Monospace font (𝙷𝚎𝚕𝚕𝚘) — headings of the pairing flow
  const M = (text = "") =>
    String(text).replace(/[A-Za-z]/g, (ch) => {
      const c = ch.charCodeAt(0);
      return c <= 90
        ? String.fromCodePoint(0x1d670 + (c - 65))
        : String.fromCodePoint(0x1d68a + (c - 97));
    });

  // Plain emoji map (replaces the old Telegram custom emojis)
  const EMOJI = {
    pairReady: "🔑", number: "📱", country: "🌍", code: "🔐",
    settings: "⚙️", link: "🔗", keyboard: "⌨️", timer: "⏳",
    connected: "🎉", ok: "✅", fail: "❌", timeout: "⏰",
    retry: "🔁", phone: "📞", globe: "🌐", sparkle: "✨",
    clock: "⏱", memory: "💾", plug: "🔌", health: "🩺", node: "🧩",
  };
  const E = (key) => EMOJI[key] || "▪️";

  // ╭━━〔 TITLE 〕━━⬣  card
  const card = (title, rows = []) =>
    [
      `╭━━〔 <b>${title}</b> 〕━━⬣`,
      ...rows.filter((r) => r !== null && r !== undefined).map((r) => `┃ ${r}`),
      `╰${LINE}⬣`,
    ].join("\n");

  const isoToFlag = (iso) =>
    !iso || iso.length !== 2
      ? "🏳️"
      : [...iso.toUpperCase()]
          .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
          .join("");

  // Any shape of phone number → digits only
  const normalizePhoneNumber = (raw) => String(raw || "").replace(/\D/g, "");
  const isValidPhone = (d) => /^[1-9][0-9]{6,14}$/.test(d);

  // Temp session id for a fresh pairing attempt: `${phone}_${6 digits}`
  const makeTempSessionId = (phone) =>
    `${phone}_${Math.floor(100000 + Math.random() * 900000)}`;

  // `${phone}_${random}` → phone (legacy sids without a suffix pass through)
  const phoneFromSid = (sid) => {
    const s = String(sid || "");
    const i = s.lastIndexOf("_");
    return i > 0 ? s.slice(0, i) : s;
  };

  // Pair code → XXXX-XXXX
  const fmtCode = (raw) => {
    const s = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return s.length === 8
      ? `${s.slice(0, 4)}-${s.slice(4)}`
      : s.match(/.{1,4}/g)?.join("-") || s;
  };

  const fmtUptime = (sec) =>
    `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m ${sec % 60}s`;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ═══════════════════════════════════════════════════════════════════════════
  //  CHAT / PERMISSION HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const isPrivate = (msg) => msg?.chat?.type === "private";

  const isAllowedGroup = (msg) => {
    if (!msg?.chat || msg.chat.type === "private") return false;
    return String(msg.chat.id) === String(ALLOWED_GROUP_ID);
  };

  const isAnonymousAdmin = (msg) =>
    !!(
      msg?.sender_chat &&
      msg?.chat &&
      String(msg.sender_chat.id) === String(msg.chat.id)
    );

  async function isAdmin(msg) {
    try {
      if (!msg?.chat || msg.chat.type === "private") return false;
      if (isAnonymousAdmin(msg)) return true;
      if (!msg.from) return false;
      const m = await tbot.getChatMember(msg.chat.id, msg.from.id);
      return m?.status === "creator" || m?.status === "administrator";
    } catch {
      return false;
    }
  }

  // Owner check for dangerous commands (falls back to admin if OWNER_IDS empty)
  async function isOwner(msg) {
    if (!OWNER_IDS.length) return isAdmin(msg);
    return OWNER_IDS.includes(String(msg.from?.id));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SEND HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  async function safeReply(chatId, text, opts = {}) {
    try {
      return await tbot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        ...opts,
      });
    } catch (error) {
      console.error("[bot.js] sendMessage failed:", error?.message);
      return null;
    }
  }

  async function safeEdit(chatId, msgId, text, opts = {}) {
    try {
      return await tbot.editMessageText(text, {
        chat_id: chatId,
        message_id: msgId,
        parse_mode: "HTML",
        ...opts,
      });
    } catch {
      return null;
    }
  }

  const safeDelete = (chatId, msgId) =>
    msgId ? tbot.deleteMessage(chatId, msgId).catch(() => {}) : Promise.resolve();

  async function sendMedia(method, chatId, media, options = {}) {
    try {
      return await tbot[method](chatId, media, { parse_mode: "HTML", ...options });
    } catch (error) {
      console.error(`[bot.js] ${method} failed:`, error?.message || error);
      return null;
    }
  }

  // Sends text as a temp file (for long outputs), then deletes the file
  async function sendAsFile(chatId, fileName, content, options = {}) {
    const tmpPath = path.join(os.tmpdir(), `${Date.now()}_${fileName}`);
    try {
      await fs.promises.writeFile(tmpPath, content, "utf8");
      return await sendMedia("sendDocument", chatId, tmpPath, options);
    } finally {
      fs.promises.unlink(tmpPath).catch(() => {});
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  COUNTRY DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  // [calling code, ISO, name]
  const COUNTRIES = [
    [1, "US", "United States/Canada"], [7, "RU", "Russia/Kazakhstan"],
    [20, "EG", "Egypt"], [27, "ZA", "South Africa"], [30, "GR", "Greece"],
    [31, "NL", "Netherlands"], [32, "BE", "Belgium"], [33, "FR", "France"],
    [34, "ES", "Spain"], [36, "HU", "Hungary"], [39, "IT", "Italy"],
    [40, "RO", "Romania"], [41, "CH", "Switzerland"], [43, "AT", "Austria"],
    [44, "GB", "United Kingdom"], [45, "DK", "Denmark"], [46, "SE", "Sweden"],
    [47, "NO", "Norway"], [48, "PL", "Poland"], [49, "DE", "Germany"],
    [51, "PE", "Peru"], [52, "MX", "Mexico"], [53, "CU", "Cuba"],
    [54, "AR", "Argentina"], [55, "BR", "Brazil"], [56, "CL", "Chile"],
    [57, "CO", "Colombia"], [58, "VE", "Venezuela"], [60, "MY", "Malaysia"],
    [61, "AU", "Australia"], [62, "ID", "Indonesia"], [63, "PH", "Philippines"],
    [64, "NZ", "New Zealand"], [65, "SG", "Singapore"], [66, "TH", "Thailand"],
    [81, "JP", "Japan"], [82, "KR", "South Korea"], [84, "VN", "Vietnam"],
    [86, "CN", "China"], [90, "TR", "Turkey"], [91, "IN", "India"],
    [92, "PK", "Pakistan"], [93, "AF", "Afghanistan"], [94, "LK", "Sri Lanka"],
    [95, "MM", "Myanmar"], [98, "IR", "Iran"], [211, "SS", "South Sudan"],
    [212, "MA", "Morocco"], [213, "DZ", "Algeria"], [216, "TN", "Tunisia"],
    [218, "LY", "Libya"], [220, "GM", "Gambia"], [221, "SN", "Senegal"],
    [233, "GH", "Ghana"], [234, "NG", "Nigeria"], [254, "KE", "Kenya"],
    [255, "TZ", "Tanzania"], [256, "UG", "Uganda"], [260, "ZM", "Zambia"],
    [263, "ZW", "Zimbabwe"], [351, "PT", "Portugal"], [353, "IE", "Ireland"],
    [358, "FI", "Finland"], [380, "UA", "Ukraine"], [420, "CZ", "Czech Republic"],
    [421, "SK", "Slovakia"], [500, "FK", "Falkland Islands"], [501, "BZ", "Belize"],
    [502, "GT", "Guatemala"], [505, "NI", "Nicaragua"], [506, "CR", "Costa Rica"],
    [507, "PA", "Panama"], [591, "BO", "Bolivia"], [593, "EC", "Ecuador"],
    [595, "PY", "Paraguay"], [598, "UY", "Uruguay"], [670, "TL", "East Timor"],
    [673, "BN", "Brunei"], [675, "PG", "Papua New Guinea"], [679, "FJ", "Fiji"],
    [850, "KP", "North Korea"], [852, "HK", "Hong Kong"], [853, "MO", "Macau"],
    [855, "KH", "Cambodia"], [856, "LA", "Laos"], [880, "BD", "Bangladesh"],
    [886, "TW", "Taiwan"], [960, "MV", "Maldives"], [961, "LB", "Lebanon"],
    [962, "JO", "Jordan"], [963, "SY", "Syria"], [964, "IQ", "Iraq"],
    [965, "KW", "Kuwait"], [966, "SA", "Saudi Arabia"], [967, "YE", "Yemen"],
    [968, "OM", "Oman"], [971, "AE", "UAE"], [972, "IL", "Israel"],
    [973, "BH", "Bahrain"], [974, "QA", "Qatar"], [975, "BT", "Bhutan"],
    [977, "NP", "Nepal"], [992, "TJ", "Tajikistan"], [993, "TM", "Turkmenistan"],
    [994, "AZ", "Azerbaijan"], [995, "GE", "Georgia"], [996, "KG", "Kyrgyzstan"],
    [998, "UZ", "Uzbekistan"], [1242, "BS", "Bahamas"], [1246, "BB", "Barbados"],
    [1345, "KY", "Cayman Islands"], [1868, "TT", "Trinidad and Tobago"],
    [1876, "JM", "Jamaica"],
  ]
    .map(([callingCode, iso, name]) => ({ callingCode, iso, name }))
    // longest calling code first so +1876 wins over +1
    .sort(
      (a, b) =>
        String(b.callingCode).length - String(a.callingCode).length ||
        b.callingCode - a.callingCode,
    );

  function detectCountry(digits) {
    if (!digits) return null;
    if (digits.startsWith("00")) digits = digits.slice(2);
    return COUNTRIES.find((c) => digits.startsWith(String(c.callingCode))) || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  MESSAGE BUILDERS
  // ═══════════════════════════════════════════════════════════════════════════

  const groupChannelKeyboard = () => ({
    inline_keyboard: [
      [
        { text: "Official group", url: GROUP_INVITE_LINK },
        { text: "WhatsApp channel", url: WA_CHANNEL_LINK },
      ],
    ],
  });

  function buildPairSuccessMessage(rawArg, rawCode, countryInfo) {
    const code = fmtCode(rawCode);
    const country = countryInfo
      ? `${isoToFlag(countryInfo.iso)} <b>${esc(countryInfo.name)}</b> (+${countryInfo.callingCode})`
      : `<i>Country unknown</i>`;

    const text = [
      `${E("pairReady")} <b>${M("Hey Pairing Code Is Ready")}</b>`,
      ``,
      card(M("PAIR CODE"), [
        `${E("number")} <b>${M("Number:")}</b> <code>${esc(rawArg)}</code>`,
        `${E("country")} <b>${M("Country:")}</b> ${country}`,
        `${E("code")} <b>${M("Code:")}</b> 『<code>${esc(code)}</code>』`,
      ]),
      ``,
      `<b>${M("How to connect")}</b>`,
      `${E("settings")} ${M("Open WhatsApp → Settings → Linked Devices")}`,
      `${E("link")} ${M("Tap Link a Device")}`,
      `${E("keyboard")} ${M("Enter the pairing code above")}`,
      ``,
      `${E("timer")} <b>${M("Code window: up to 3 minutes.")}</b>`,
    ].join("\n");

    const reply_markup = {
      inline_keyboard: [
        [{ text: code, copy_text: { text: code } }], // tap to copy
        [{ text: "Open WhatsApp channel", url: WA_CHANNEL_LINK }],
        [{ text: "Pair another account", callback_data: "pair_help" }],
      ],
    };
    return { text, reply_markup };
  }

  const buildHelpMessage = () =>
    [
      `${E("sparkle")} <b>${F("X-Miku · WhatsApp Session Manager")}</b>`,
      ``,
      card(`📲 ${F("Pairing")}`, [
        `<code>/pair +91XXXXXXXXXX</code>  ${F("Create a link code")}`,
        `<code>/ping</code>  ${F("Check response time")}`,
      ]),
      ``,
      card(`🧰 ${F("Admin tools")}`, [
        `<code>/sessions</code>  ${F("Connected accounts")}`,
        `<code>/status</code>  ${F("Bot health and uptime")}`,
        `<code>/restart NUMBER</code>  ${F("Reconnect an account")}`,
        `<code>/stop NUMBER</code>  ${F("Pause an account")}`,
        `<code>/logout NUMBER</code>  ${F("Remove an account")}`,
        `<code>/reactp LINK [EMOJI]</code>  ${F("React to a channel post")}`,
        `<code>/s NUMBER CODE</code>  ${F("Socket query")}`,
        `<code>/as CODE</code>  ${F("Run on all sessions")}`,
        `<code>/d COMMAND</code>  ${F("Server command")}`,
      ]),
      ``,
      card(`💡 ${F("More")}`, [
        `<code>/about</code>  ${F("About this bot")}`,
        `<code>/health</code>  ${F("Runtime metrics")}`,
        `<code>/id</code>  ${F("Chat and user IDs")}`,
        `<code>/help</code> · <code>/commands</code>  ${F("This menu")}`,
      ]),
      ``,
      `<i>${F("Use the full international number, including the country code.")}</i>`,
    ].join("\n");

  const buildHelpKeyboard = () => ({
    inline_keyboard: [
      [{ text: "Pair a WhatsApp account", callback_data: "pair_help" }],
      ...groupChannelKeyboard().inline_keyboard,
    ],
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  PAIRING CORE (shared by /pair and the callback button)
  //
  //  Only a genuinely CONNECTED session blocks a new pairing. Any stale or
  //  half-finished leftover for the same number is wiped automatically, so
  //  nobody needs to /logout by hand before pairing again.
  // ═══════════════════════════════════════════════════════════════════════════

  async function cleanupStaleSession(sid) {
    const entry = manager.sessions.get(sid);
    if (!entry) return;
    const stuck = ["starting", "reconnecting", "connecting"].includes(entry.status);
    const dead = entry.sock && manager.isRunning?.(sid) === false;
    if (stuck || dead) await manager.stop(sid).catch(() => {});
  }

  async function doPair(chatId, rawArg, replyToId) {
    const reply = (text, opts = {}) =>
      safeReply(chatId, text, { reply_to_message_id: replyToId, ...opts });

    const digits = normalizePhoneNumber(rawArg);
    if (!isValidPhone(digits)) {
      return reply(
        `${E("fail")} Please enter a valid international phone number (7–15 digits, no leading zero).`,
      );
    }

    const countryInfo = detectCountry(digits);
    const sid = makeTempSessionId(digits);

    if (!manager.reservePhonePairing(digits, sid)) {
      return reply(
        `⏳ A pairing attempt is already in progress for this number. Please wait for it to finish.`,
      );
    }

    // already connected?
    let connectedSid;
    try {
      connectedSid = await manager.findConnectedSessionIdByPhone(digits);
    } catch (error) {
      manager.releasePhonePairing(sid);
      return reply(
        `${E("fail")} Could not check this phone's session: ${esc(error?.message || error)}`,
      );
    }
    if (connectedSid) {
      manager.releasePhonePairing(sid);
      return reply(
        [
          card(`✘ ${M("Already Paired")}`, [
            `${E("number")} <b>${M("Number:")}</b> <code>${esc(rawArg)}</code>`,
          ]),
          ``,
          `<i>Use /restart ${esc(digits)} to reconnect it, or /logout ${esc(digits)} to remove it and pair again.</i>`,
        ].join("\n"),
      );
    }

    // wipe stale leftovers for this phone
    try {
      await manager.cleanupPhoneSessions(digits);
    } catch (error) {
      manager.releasePhonePairing(sid);
      return reply(
        `${E("fail")} Could not clear an old pairing attempt: ${esc(error?.message || error)}`,
      );
    }

    const loadingMsg = await reply(
      [
        `<b>ᝰ ${M("Generating Pair Code...")}</b>`,
        ``,
        card(M("PLEASE WAIT"), [
          `${E("number")} <b>${M("Number:")}</b> <code>${esc(rawArg)}</code>`,
          countryInfo
            ? `${isoToFlag(countryInfo.iso)} <b>${esc(countryInfo.name)}</b> (+${countryInfo.callingCode})`
            : `<i>Country not detected — trying anyway</i>`,
        ]),
      ].join("\n"),
    );

    // request the code from the manager (wa-multi-session / Baileys)
    let rawCode = null;
    try {
      await cleanupStaleSession(sid);
      rawCode = await manager.requestPairingCode(sid, digits, { timeoutMs: 30_000 });
    } catch (err) {
      await safeDelete(chatId, loadingMsg?.message_id);
      manager.logout(sid).catch(() => {}); // wipe partial creds
      return reply(
        [
          card(`✘ ${M("Pairing Not Successful")}`, [
            `${E("number")} <b>${M("Number:")}</b> +${esc(digits)}`,
            `㋡ <b>${M("Reason:")}</b> ${esc(String(err?.message || err))}`,
          ]),
          ``,
          `<b>${M("Please try pairing again with Miku.")} ♡</b>`,
        ].join("\n"),
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: `/pair +${digits}`, copy_text: { text: `/pair +${digits}` } }],
            ],
          },
        },
      );
    }

    await safeDelete(chatId, loadingMsg?.message_id);

    if (!rawCode) {
      manager.releasePhonePairing(sid);
      manager.logout(sid).catch(() => {});
      return reply(`${E("fail")} ${F("No pair code returned — please try again.")}`);
    }

    const { text, reply_markup } = buildPairSuccessMessage(rawArg, rawCode, countryInfo);
    const pairMsg = await reply(text, {
      reply_markup,
      disable_web_page_preview: true,
    });

    if (!pairMsg?.message_id) {
      manager.releasePhonePairing(sid);
      manager.logout(sid).catch(() => {});
      return pairMsg;
    }

    // ── watch the outcome in the background (never blocks the reply) ──
    const msgId = pairMsg.message_id;
    const displayNum = `+${digits}`;

    const connectedText = [
      `${E("connected")} <b>${M("BOT CONNECTED!")}</b>`,
      ``,
      card(`${E("ok")} ${M("Successfully linked")}`, [
        `${E("number")} <b>${M("Number:")}</b> <code>${esc(displayNum)}</code>`,
        countryInfo
          ? `${isoToFlag(countryInfo.iso)} <b>${esc(countryInfo.name)}</b> (+${countryInfo.callingCode})`
          : `<i>Country unknown</i>`,
      ]),
    ].join("\n");

    const failedText = [
      `${E("fail")} <b>${M("PAIR UNSUCCESSFUL")}</b>`,
      ``,
      card(`${E("timeout")} ${M("Timed out")}`, [
        `${M("The code was not used.")}`,
        `${E("number")} <b>${M("Number:")}</b> <code>${esc(displayNum)}</code>`,
      ]),
      ``,
      `${E("retry")} <b>${M("Please try again:")}</b>`,
      `<code>/pair ${esc(displayNum)}</code>`,
    ].join("\n");

    manager
      .awaitPairingOutcome(sid, { timeoutMs: 180_000 })
      .then(async ({ success }) => {
        if (success) {
          await safeEdit(chatId, msgId, connectedText, {
            reply_markup: { inline_keyboard: [[{ text: "WA Channel", url: WA_CHANNEL_LINK }]] },
            disable_web_page_preview: true,
          });
          console.log(`[bot.js] ❤️‍🩹 Pair watcher: ${sid} connected`);
        } else {
          await safeEdit(chatId, msgId, failedText, {
            reply_markup: {
              inline_keyboard: [
                [{ text: `/pair ${displayNum}`, copy_text: { text: `/pair ${displayNum}` } }],
                [{ text: "WA Channel", url: WA_CHANNEL_LINK }],
              ],
            },
            disable_web_page_preview: true,
          });
          console.log(`[bot.js] 😴 Pair watcher: ${sid} did not complete`);
        }
      })
      .catch((e) =>
        console.error(`[bot.js] awaitPairingOutcome error for ${sid}:`, e?.message || e),
      );

    return pairMsg;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CODE-EXECUTION HELPERS (/s and /as)
  // ═══════════════════════════════════════════════════════════════════════════

  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  // runs `code` with `sock` in scope; rejects after `ms`, timer always cleared
  async function runWithSock(sock, code, ms = 30_000) {
    const fn = new AsyncFunction("sock", `return await (${code})`);
    let timer;
    try {
      return await Promise.race([
        fn(sock),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Execution timed out (${ms / 1000}s)`)), ms);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  function describeResult(result) {
    if (result === undefined || result === null)
      return { str: String(result), summary: `<i>${result === null ? "null" : "undefined"}</i>` };
    if (Buffer.isBuffer(result) || result instanceof Uint8Array)
      return { str: `<Buffer ${result.byteLength} bytes>`, summary: `📦 Buffer — ${result.byteLength} bytes` };

    let str;
    try {
      str = typeof result === "object" ? JSON.stringify(result, null, 2) : String(result);
    } catch {
      str = String(result);
    }
    if (Array.isArray(result)) return { str, summary: `📋 Array — ${result.length} items` };
    if (typeof result === "object")
      return { str, summary: `🗂 Object — ${Object.keys(result).length} keys` };
    return { str, summary: typeof result };
  }

  const errorHint = (msg = "") =>
    msg.includes("timed out") ? `⏰ ${F("Try a lighter query.")}`
    : msg.includes("not a function") ? `💡 ${F("Check the method name.")}`
    : msg.includes("Cannot read") ? `💡 ${F("A property may be undefined.")}`
    : msg.includes("Unexpected token") ? `💡 ${F("Remove semicolons (;) from the code.")}`
    : "";

  const sockUserName = (sock, fallback) =>
    sock?.user?.name || sock?.user?.id?.split(":")?.[0] || fallback;

  // ═══════════════════════════════════════════════════════════════════════════
  //  PRIVATE REDIRECT
  // ═══════════════════════════════════════════════════════════════════════════

  const redirectToGroup = (chatId, replyToId) =>
    sendMedia("sendVideo", chatId, "https://files.catbox.moe/pohkxl.mp4", {
      caption: [
        `<b>🙂 ${M("Welcome to X-MIKU ♡ WA Mini Bot.")}</b>`,
        ``,
        `<b>⭐️ ${M("Pair your WA number — first join our group.")}</b>`,
        ``,
        `<b>${M("Then use the command below with your number:")} 🫠</b>`,
        ``,
        `<b>🇸🇻 ${M("Example:")} /pair +917002826276</b>`,
        ``,
        `<b>${M("Make sure to include the country code.")} 💋</b>`,
      ].join("\n"),
      reply_to_message_id: replyToId,
      reply_markup: {
        inline_keyboard: [[{ text: "ᝰ Join Official Group", url: GROUP_INVITE_LINK }]],
      },
    });

  // ═══════════════════════════════════════════════════════════════════════════
  //  COMMANDS
  //
  //  scope:  "group"    → only the allowed group
  //          "both"     → allowed group or private chat
  //          "redirect" → allowed group; private chats get the welcome video
  //  admin:  group admins only          owner: OWNER_IDS (or admins if unset)
  // ═══════════════════════════════════════════════════════════════════════════

  const phoneArg = (args) => normalizePhoneNumber(args);

  // shared body of /stop /logout /restart
  async function sessionAction({ reply, args, usage, run }) {
    const phone = phoneArg(args);
    if (!phone) return reply(`❓ ${F("Usage:")} <code>${usage}</code>`);
    const sid = await manager.findSessionIdByPhone(phone);
    if (!sid)
      return reply(`${E("fail")} ${F("No paired session found for")} <code>${esc(phone)}</code>`);
    try {
      return await run(sid, phone);
    } catch (e) {
      return reply(`${E("fail")} ${F("Action failed:")} <i>${esc(e?.message)}</i>`);
    }
  }

  const COMMANDS = {
    // ── /start ────────────────────────────────────────────────────────────────
    start: {
      scope: "redirect",
      run: ({ chatId, replyId }) =>
        sendMedia("sendVideo", chatId, "https://files.catbox.moe/dh9yey.mp4", {
          caption: [
            `<b>𖠌 ${M("X-MIKU Free WhatsApp Mini Bot")}</b>`,
            ``,
            card(M("GET STARTED"), [
              `<b>➥ ${M("Pair your WA number:")}</b>`,
              `<b>✆ ${M("Example:")}</b> /pair +917002826276`,
              `<b>ヅ ${M("Need help with pairing?")}</b> /help`,
            ]),
            ``,
            card(`♕ ${M("Developers")}`, [`${M("Sumon")} — @nightx_rebel`, `${M("Bittu")} — @bittu_1m`]),
            ``,
            `<b>${M("Made with love by X-MIKU")} ♡</b>`,
          ].join("\n"),
          reply_to_message_id: replyId,
          reply_markup: {
            inline_keyboard: [
              [{ text: "Open help", callback_data: "help" }],
              ...groupChannelKeyboard().inline_keyboard,
            ],
          },
        }),
    },

    // ── /help /commands ───────────────────────────────────────────────────────
    help: {
      scope: "redirect",
      run: ({ reply }) => reply(buildHelpMessage(), { reply_markup: buildHelpKeyboard() }),
    },

    // ── /about ────────────────────────────────────────────────────────────────
    about: {
      scope: "both",
      run: ({ reply }) =>
        reply(
          [
            `${E("sparkle")} <b>${F("X-Miku WhatsApp Session Manager")}</b>`,
            ``,
            F("Pair and manage WhatsApp sessions from Telegram."),
            F("Pairing codes are temporary. Only pair accounts you own or are authorized to manage."),
            ``,
            `${F("Commands:")} <code>/help</code>`,
            `<a href="${esc(GROUP_INVITE_LINK)}">${F("Official Telegram group")}</a>`,
            `<a href="${esc(WA_CHANNEL_LINK)}">${F("WhatsApp channel")}</a>`,
          ].join("\n"),
          { disable_web_page_preview: true },
        ),
    },

    // ── /ping ─────────────────────────────────────────────────────────────────
    ping: {
      scope: "redirect",
      run: async ({ chatId, replyId, reply }) => {
        const start = Date.now();
        const m = await reply("🏓 Pong!");
        if (!m?.message_id) return m;
        return safeEdit(chatId, m.message_id, `🏓 <b>Pong!</b>\n⚡ <b>${Date.now() - start}ms</b>`);
      },
    },

    // ── /pair ─────────────────────────────────────────────────────────────────
    pair: {
      scope: "redirect",
      run: async ({ msg, args, chatId, replyId, reply }) => {
        if (!args) {
          return reply(
            [
              card(`${E("ok")} ${M("Usage")}`, [
                `${E("phone")} <code>/pair +917074420859</code>`,
                `${E("phone")} <code>/pair 917074420859</code>`,
              ]),
              ``,
              `${E("globe")} <b>${M("Include your country code.")}</b>`,
            ].join("\n"),
          );
        }

        const digits = normalizePhoneNumber(args);
        if (!isValidPhone(digits)) {
          return reply(
            `<b>✘ ${M("Invalid number. Example:")}</b> <code>/pair +917074420859</code>`,
          );
        }

        const userId = msg.from?.id || msg.sender_chat?.id;
        const remaining = PAIR_COOLDOWN_MS - (Date.now() - (pairCooldown.get(userId) || 0));
        if (remaining > 0) {
          return reply(
            `<b>❆ ${M(`Please wait ${Math.ceil(remaining / 1000)}s before requesting another code.`)}</b>`,
          );
        }
        pairCooldown.set(userId, Date.now());

        return doPair(chatId, args, replyId);
      },
    },

    // ── /sessions ─────────────────────────────────────────────────────────────
    sessions: {
      scope: "group",
      admin: true,
      run: ({ reply }) => {
        const conns = manager.getAllConnections?.() || [];
        if (!conns.length) {
          return reply(
            `🌙 <b>${F("No Active Sessions")}</b>\n\n${F("No sessions are currently registered.")}`,
          );
        }
        const online = conns.filter((c) => c.healthy).length;

        let text =
          card(`🧩 ${F("SESSION OVERVIEW")}`, [
            `📊 Total: <b>${conns.length}</b>`,
            `🟢 Online: <b>${online}</b>  🔴 Offline: <b>${conns.length - online}</b>`,
          ]) + "\n\n";

        conns.forEach((c, i) => {
          const sid = c.sessionId || c.file_path || c.id || "unknown";
          const user = sockUserName(c.connection, "—");
          const stat = c.status || (c.healthy ? "connected" : "disconnected");
          text += `${c.healthy ? "🟢" : "🔴"} <b>${i + 1}.</b> <code>${esc(phoneFromSid(sid))}</code>\n`;
          text += `    👤 ${esc(user)} · <i>${esc(stat)}</i>\n\n`;
        });

        return reply(text, { disable_web_page_preview: true });
      },
    },

    // ── /status ───────────────────────────────────────────────────────────────
    status: {
      scope: "group",
      admin: true,
      run: ({ reply }) => {
        const conns = manager.getAllConnections?.() || [];
        const online = conns.filter((c) => c.healthy).length;
        return reply(
          card(`${E("sparkle")} ${F("BOT STATUS")}`, [
            `${E("clock")} ${F("Uptime:")}  <code>${fmtUptime(Math.floor(process.uptime()))}</code>`,
            `${E("memory")} ${F("Memory:")}  <code>${(process.memoryUsage().heapUsed / 1048576).toFixed(1)} MB</code>`,
            `${E("plug")} ${F("Sessions:")}  <b>${conns.length}</b> (${online} 🟢)`,
            `${E("health")} ${F("Platform:")}  <code>${process.platform}</code>`,
            `${E("settings")} ${F("Node.js:")}  <code>${process.version}</code>`,
          ]),
        );
      },
    },

    // ── /health ───────────────────────────────────────────────────────────────
    health: {
      scope: "group",
      admin: true,
      run: ({ reply }) => {
        const mem = process.memoryUsage();
        const sessions = manager.getAllConnections?.() || [];
        const online = sessions.filter((s) => s.healthy).length;
        const load = os.loadavg?.().map((v) => v.toFixed(2)).join(" / ") || "—";
        const up = Math.floor(process.uptime());
        return reply(
          card(`${E("health")} ${F("Runtime health")}`, [
            `${E("memory")} ${F("RSS:")} <code>${(mem.rss / 1048576).toFixed(1)} MB</code> · ${F("Heap:")} <code>${(mem.heapUsed / 1048576).toFixed(1)} MB</code>`,
            `${E("plug")} ${F("Sessions:")} <b>${online}</b> ${F("online /")} <b>${sessions.length}</b>`,
            `${E("clock")} ${F("Uptime:")} <code>${Math.floor(up / 3600)}h ${Math.floor((up % 3600) / 60)}m</code> · ${F("Load:")} <code>${load}</code>`,
            `${E("settings")} ${F("Runtime:")} <code>${process.version}</code> · <code>${process.platform}</code>`,
          ]),
        );
      },
    },

    // ── /id ───────────────────────────────────────────────────────────────────
    id: {
      scope: "group",
      admin: true,
      run: ({ msg, chatId, reply }) =>
        reply(
          card(`🪪 ${F("Telegram IDs")}`, [
            `${F("Chat:")} <code>${esc(chatId)}</code>`,
            `${F("Your account:")} <code>${esc(msg.from?.id || msg.sender_chat?.id || "unknown")}</code>`,
          ]),
        ),
    },

    // ── /stop ─────────────────────────────────────────────────────────────────
    stop: {
      scope: "group",
      admin: true,
      run: (ctx) =>
        sessionAction({
          ...ctx,
          usage: "/stop 91XXXXXXXXXX",
          run: async (sid, phone) => {
            await manager.stop(sid);
            return ctx.reply(
              `⏹️ <b>${F("Session Stopped")}</b>\n\n📱 <code>${esc(phone)}</code>\n\n<i>Credentials kept. Use /restart to reconnect.</i>`,
            );
          },
        }),
    },

    // ── /logout ───────────────────────────────────────────────────────────────
    logout: {
      scope: "group",
      admin: true,
      run: (ctx) =>
        sessionAction({
          ...ctx,
          usage: "/logout 91XXXXXXXXXX",
          run: async (sid, phone) => {
            await manager.logout(sid);
            return ctx.reply(
              `🗑️ <b>${F("Session Logged Out")}</b>\n\n📱 <code>${esc(phone)}</code>\n\n<i>Credentials deleted. User must pair again.</i>`,
            );
          },
        }),
    },

    // ── /restart ──────────────────────────────────────────────────────────────
    restart: {
      scope: "group",
      admin: true,
      run: (ctx) =>
        sessionAction({
          ...ctx,
          usage: "/restart 91XXXXXXXXXX",
          run: async (sid, phone) => {
            await manager.stop(sid);
            await sleep(1500);
            await manager.start(sid);
            return ctx.reply(`🔄 <b>${F("Session Restarted")}</b>\n\n📱 <code>${esc(phone)}</code>`);
          },
        }),
    },

    // ── /reactp ───────────────────────────────────────────────────────────────
    reactp: {
      scope: "group",
      admin: true,
      run: async ({ args, reply }) => {
        const parts = (args || "").trim().split(/\s+/);
        const postLink = parts[0];

        if (!postLink?.startsWith("https://whatsapp.com/channel/")) {
          return reply(
            `❓ <b>${F("Usage:")}</b>\n<code>/reactp https://whatsapp.com/channel/xxx/123 🍉👀🎀</code>\n\n${F("Emojis are optional — a random one is picked.")}`,
          );
        }

        const emojis =
          parts.slice(1).join("").match(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu) || ["🔥"];
        const chosen = emojis[Math.floor(Math.random() * emojis.length)];

        const active = (manager.getAllConnections() || []).find((c) => c.healthy);
        if (!active) return reply(`${E("fail")} ${F("No active WhatsApp session found.")}`);
        const sock = active.connection;

        await reply(`⏳ <b>${F("Reacting...")}</b>\n🎲 ${F("Chosen:")} ${chosen}`);

        try {
          const msgNumber = parseInt(postLink.split("/").pop(), 10);
          const info = await sock.newsletterInfo(postLink);
          const msgs = await sock.newsletterFetchMessages(info.id, 20);
          const target = msgs.find((m) => m.newsletterServerId === msgNumber);

          if (!target) {
            return reply(`${E("fail")} ${F("Post #")}${msgNumber} ${F("not found in the last 20 messages.")}`);
          }
          await sock.newsletterReactMessage(info.id, target.key.id, chosen);
          return reply(
            card(`${E("ok")} ${F("Reacted!")}`, [`📌 ${F("Post:")} #${msgNumber}`, `🎯 ${F("Emoji:")} ${chosen}`]),
          );
        } catch (err) {
          return reply(`${E("fail")} <b>${F("Failed:")}</b> <i>${esc(err?.message || String(err))}</i>`);
        }
      },
    },

    // ── /s — run code on ONE session ──────────────────────────────────────────
    s: {
      scope: "group",
      admin: true,
      owner: true,
      run: async ({ args, chatId, replyId, reply }) => {
        const spaceIdx = (args || "").indexOf(" ");
        if (spaceIdx === -1) {
          return reply(
            [
              `❓ <b>${F("Usage:")}</b>`,
              ``,
              `<code>/s 91XXXXXXXXXX sock.sendMessage('jid', { text: 'hi' })</code>`,
              `<code>/s 91XXXXXXXXXX sock.groupFetchAllParticipating()</code>`,
              `<code>/s 91XXXXXXXXXX sock.user</code>`,
              ``,
              `💡 ${F("Large results are sent as a .json file · timeout 30s")}`,
            ].join("\n"),
          );
        }

        const phone = normalizePhoneNumber(args.slice(0, spaceIdx));
        const code = args.slice(spaceIdx + 1).trim();
        if (!phone || !code) return reply(`${E("fail")} ${F("Missing number or code.")}`);

        const sid = await manager.findSessionIdByPhone(phone);
        const entry = sid ? manager.sessions.get(sid) : null;
        if (!sid || !entry?.sock) {
          const all = [...(manager.sessions?.keys() || [])]
            .map((s) => `<code>${esc(phoneFromSid(s))}</code>`)
            .join(", ");
          return reply(
            `${E("fail")} <b>${F("Session Not Found:")}</b> <code>${esc(phone)}</code>\n\n📋 ${F("Available:")} ${all || "none"}`,
          );
        }

        const sock = entry.sock;
        const user = sockUserName(sock, sid);
        const healthy = entry.status === "connected";

        const statusMsg = await reply(
          [
            `⏳ <b>${F("Executing...")}</b>`,
            ``,
            `📱 <code>${esc(phone)}</code> (${esc(user)}) ${healthy ? "🟢" : "🔴"}`,
            `📟 <code>${esc(code.slice(0, 300))}${code.length > 300 ? "..." : ""}</code>`,
          ].join("\n"),
        );

        const t0 = Date.now();
        try {
          const result = await runWithSock(sock, code);
          const ms = Date.now() - t0;
          const { str, summary } = describeResult(result);
          await safeDelete(chatId, statusMsg?.message_id);

          const header = [
            `${E("ok")} <b>${F("Done!")}</b>  📱 <code>${esc(phone)}</code> (${esc(user)})`,
            ``,
            `📊 ${F("Type:")} ${summary}`,
            `⚡ ${F("Time:")} ${ms}ms   📦 ${F("Size:")} ${(str.length / 1024).toFixed(1)} KB`,
          ].join("\n");

          if (str.length <= 3000) {
            return reply([header, ``, `📤 ${F("Result:")}`, `<pre>${esc(str)}</pre>`].join("\n"));
          }

          await sendAsFile(chatId, `s_${phone}.json`, str, {
            caption: [header, ``, `📟 <code>${esc(code.slice(0, 150))}${code.length > 150 ? "..." : ""}</code>`].join("\n"),
            reply_to_message_id: replyId,
          });
          return reply(`👁 <b>${F("Preview (first 500 chars):")}</b>\n<pre>${esc(str.slice(0, 500))}...</pre>`);
        } catch (err) {
          await safeDelete(chatId, statusMsg?.message_id);
          const msg = err?.message || String(err);
          return reply(
            [
              `${E("fail")} <b>${F("Error on")} <code>${esc(phone)}</code></b>  ⚡ ${Date.now() - t0}ms`,
              ``,
              `💬 <code>${esc(msg)}</code>`,
              errorHint(msg),
            ]
              .filter(Boolean)
              .join("\n"),
          );
        }
      },
    },

    // ── /as — run code on ALL connected sessions ─────────────────────────────
    as: {
      scope: "group",
      admin: true,
      owner: true,
      run: async ({ args, chatId, replyId, reply }) => {
        const code = (args || "").trim();
        if (!code) {
          return reply(
            [
              `❓ <b>${F("Usage:")}</b>`,
              ``,
              `<code>/as sock.sendMessage('jid', { text: 'hi' })</code>`,
              `<code>/as sock.newsletterFollow('120363xxx@newsletter')</code>`,
              `<code>/as sock.updateProfileStatus('new bio')</code>`,
              ``,
              `💡 ${F("Runs on ALL connected sessions at once")}`,
            ].join("\n"),
          );
        }

        const entries = [...manager.sessions.entries()].filter(
          ([, e]) => e?.sock && e.status === "connected",
        );
        if (!entries.length) return reply(`${E("fail")} ${F("No active sessions found.")}`);

        const statusMsg = await reply(
          [
            `⏳ <b>${F("Running on ALL sessions...")}</b>`,
            ``,
            `🔢 ${F("Sessions:")} <b>${entries.length}</b>`,
            `📟 <code>${esc(code.slice(0, 300))}${code.length > 300 ? "..." : ""}</code>`,
          ].join("\n"),
        );

        const t0 = Date.now();
        const results = await Promise.allSettled(
          entries.map(async ([sid, entry]) => ({ sid, result: await runWithSock(entry.sock, code) })),
        );
        const ms = Date.now() - t0;
        await safeDelete(chatId, statusMsg?.message_id);

        let ok = 0;
        let bad = 0;
        const lines = results.map((r, i) => {
          const [sid, entry] = entries[i];
          const phone = phoneFromSid(sid);
          const user = sockUserName(entry.sock, phone);
          if (r.status === "fulfilled") {
            ok++;
            let s;
            try {
              s = r.value.result === undefined ? "void" : JSON.stringify(r.value.result)?.slice(0, 100);
            } catch {
              s = String(r.value.result).slice(0, 100);
            }
            return `✅ <code>${esc(phone)}</code> (${esc(user)})\n    <i>${esc(s)}</i>`;
          }
          bad++;
          return `❌ <code>${esc(phone)}</code> (${esc(user)})\n    <i>${esc((r.reason?.message || String(r.reason)).slice(0, 100))}</i>`;
        });

        const summary = [
          card(`📊 ${F("All Sessions Done!")}`, [
            `⚡ ${ms}ms`,
            `✅ ${F("Success:")} <b>${ok}</b>   ❌ ${F("Failed:")} <b>${bad}</b>   🔢 ${F("Total:")} <b>${entries.length}</b>`,
          ]),
          ``,
          `📟 <code>${esc(code.slice(0, 150))}${code.length > 150 ? "..." : ""}</code>`,
          ``,
          ...lines,
        ].join("\n");

        if (summary.length <= 3500) return reply(summary);

        const plain = results
          .map((r, i) =>
            r.status === "fulfilled"
              ? `✅ ${entries[i][0]}\n${JSON.stringify(r.value.result, null, 2)}\n`
              : `❌ ${entries[i][0]}\n${r.reason?.message || r.reason}\n`,
          )
          .join("\n---\n");

        return sendAsFile(chatId, "as_result.txt", plain, {
          caption: `📊 <b>${F("All Sessions Done!")}</b>  ⚡ ${ms}ms\n✅ ${ok} success   ❌ ${bad} failed   🔢 ${entries.length} total`,
          reply_to_message_id: replyId,
        });
      },
    },

    // ── /d — shell command ────────────────────────────────────────────────────
    // ⚠️ Remote code execution by design. Set OWNER_IDS in config.js to limit
    // /d, /s and /as to specific Telegram user IDs instead of every group admin.
    d: {
      scope: "group",
      admin: true,
      owner: true,
      run: async ({ args, chatId, replyId, reply }) => {
        const rawCmd = (args || "").trim();
        if (!rawCmd) {
          return reply(
            `ℹ️ <b>${F("Usage")}</b>\n<code>/d git pull</code>\n<code>/d pm2 list</code>\n<code>/d df -h</code>`,
          );
        }

        const MAX_LINES = 50;
        const TIMEOUT_MS = 30_000;
        const MAX_TEXT_CHARS = 1800;

        await reply(`⚙️ <b>${F("Executing...")}</b>\n<code>${esc(rawCmd)}</code>`);

        const lines = [];
        let killed = false;
        const child = spawn("bash", ["-lc", rawCmd], { env: process.env });
        const killTimer = setTimeout(() => {
          killed = true;
          try {
            child.kill("SIGKILL");
          } catch {}
        }, TIMEOUT_MS);

        const pushLines = (chunk, src) =>
          chunk
            .toString()
            .split(/\r?\n/)
            .forEach((ln) => {
              if (ln && lines.length < MAX_LINES) lines.push(src === "err" ? `[ERR] ${ln}` : ln);
            });

        child.stdout.on("data", (c) => pushLines(c, "out"));
        child.stderr.on("data", (c) => pushLines(c, "err"));

        child.on("error", async (err) => {
          clearTimeout(killTimer);
          await reply(`${E("fail")} ${F("Spawn error:")} ${esc(String(err.message))}`);
        });

        child.on("close", async (code) => {
          clearTimeout(killTimer);
          if (!lines.length) return reply(`⚠️ ${F("No output produced.")}`);

          const header = [
            `$ ${rawCmd}`,
            `Exit: ${code ?? "null"}${killed ? " (killed — timeout)" : ""}`,
            "─".repeat(30),
          ].join("\n");
          const payload = `${header}\n${lines.join("\n")}`.trim();

          if (payload.length > MAX_TEXT_CHARS || lines.length >= MAX_LINES) {
            const sent = await sendAsFile(chatId, "cmd_output.txt", payload, {
              caption: `📄 <code>${esc(rawCmd)}</code> · exit <b>${code}</b>`,
              reply_to_message_id: replyId,
            });
            if (!sent) {
              await reply(`⚠️ ${F("Output preview:")}\n<code>${esc(payload.slice(0, 1500))}</code>`);
            }
          } else {
            await reply(`<pre>${esc(payload)}</pre>`);
          }
        });
      },
    },
  };

  // aliases
  COMMANDS.commands = COMMANDS.help;
  COMMANDS.session = COMMANDS.sessions;

  // ═══════════════════════════════════════════════════════════════════════════
  //  COMMAND PARSER + DISPATCHER
  // ═══════════════════════════════════════════════════════════════════════════

  // Accepts both "/cmd" and ".cmd" (Telegram only tags "/" as a bot_command)
  function parseCmd(msg) {
    if (!msg?.text) return null;
    const first = msg.entities?.[0];
    if (first?.type === "bot_command" && first.offset === 0) {
      return {
        cmd: msg.text.slice(0, first.length).split(/[@\s]/)[0].replace(/^[/.]/, "").toLowerCase(),
        args: msg.text.slice(first.length).trim(),
      };
    }
    if (!/^[/.]/.test(msg.text)) return null;
    const [rawCmd, ...rest] = msg.text.trim().split(/\s+/);
    return {
      cmd: rawCmd.split("@")[0].replace(/^[/.]/, "").toLowerCase(),
      args: rest.join(" ").trim(),
    };
  }

  async function handleCommand(msg) {
    const parsed = parseCmd(msg);
    if (!parsed) return;

    const { cmd, args } = parsed;
    const chatId = msg.chat.id;
    const replyId = msg.message_id;
    const reply = (text, opts = {}) =>
      safeReply(chatId, text, { reply_to_message_id: replyId, ...opts });

    console.log(`[bot.js] /${cmd} from ${msg.from?.id || msg.sender_chat?.id} in ${chatId}`);

    const def = Object.hasOwn(COMMANDS, cmd) ? COMMANDS[cmd] : null;
    const okGroup = isAllowedGroup(msg);

    // unknown command → only answer inside the allowed group
    if (!def) {
      if (!okGroup) return;
      return reply(
        `💢 ${F("Unknown command:")} <code>/${esc(cmd)}</code>\n\n${F("Try")} <code>/help</code> ${F("to see available commands.")}`,
      );
    }

    // scope check
    const priv = isPrivate(msg);
    if (def.scope === "redirect" && priv) return redirectToGroup(chatId, replyId);
    if (!(def.scope === "both" ? priv || okGroup : okGroup)) return;

    // permission checks
    if (def.admin && !(await isAdmin(msg))) {
      return reply(`🚫 <b>${F("Admins Only")}</b>\n\n${F("This command is restricted to group admins.")}`);
    }
    if (def.owner && !(await isOwner(msg))) {
      return reply(`🚫 <b>${F("Owner Only")}</b>\n\n${F("This command is restricted to the bot owner.")}`);
    }

    return def.run({ msg, cmd, args, chatId, replyId, reply });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  // Leave groups that aren't the official one
  tbot.on("new_chat_members", async (msg) => {
    try {
      if (!botId || !msg?.new_chat_members?.some((m) => m.id === botId)) return;

      if (!isAllowedGroup(msg)) {
        console.log("[bot.js] Added to unauthorized group:", msg.chat.id, "— leaving");
        await safeReply(
          msg.chat.id,
          `<b>${F("Official group only")}</b>\n\n${F("This bot is available in our official Telegram group. Join us here:")}\n\n<a href="${esc(GROUP_INVITE_LINK)}">${F("Join the group")}</a>`,
        );
        await tbot.leaveChat(msg.chat.id).catch(() => {});
      } else {
        await safeReply(
          msg.chat.id,
          `🎉 <b>${F("X-Miku is ready")}</b>\n\nUse /help to browse commands or /pair to link a WhatsApp account.`,
        );
      }
    } catch (e) {
      console.error("[bot.js] new_chat_members error:", e);
    }
  });

  // Inline buttons
  tbot.on("callback_query", async (query) => {
    const { data, id, message } = query;
    const chatId = message?.chat?.id;

    try {
      if (!data || !chatId) return tbot.answerCallbackQuery(id).catch(() => {});

      // "Pair again" button: data = "repairr:DIGITS"
      if (data.startsWith("repairr:")) {
        const digits = data.split(":")[1];
        if (!digits) return tbot.answerCallbackQuery(id).catch(() => {});

        const userId = query.from?.id;
        const remaining = PAIR_COOLDOWN_MS - (Date.now() - (pairCooldown.get(userId) || 0));
        if (remaining > 0) {
          return tbot
            .answerCallbackQuery(id, {
              text: `⏳ Please wait ${Math.ceil(remaining / 1000)}s before re-pairing.`,
              show_alert: true,
            })
            .catch(() => {});
        }
        pairCooldown.set(userId, Date.now());
        await tbot.answerCallbackQuery(id).catch(() => {});
        return doPair(chatId, `+${digits}`, message?.message_id);
      }

      await tbot.answerCallbackQuery(id).catch(() => {});
      if (!(isPrivate(message) || isAllowedGroup(message))) return;

      if (data === "help") {
        return safeReply(chatId, buildHelpMessage(), {
          reply_to_message_id: message.message_id,
          reply_markup: buildHelpKeyboard(),
        });
      }

      if (data === "pair_help") {
        return safeReply(
          chatId,
          [
            `📲 <b>${F("Pair a WhatsApp account")}</b>`,
            ``,
            `${F("Send this command in the official group:")}`,
            `<code>/pair +CCXXXXXXXXXX</code>`,
            ``,
            `<i>${F("Replace CCXXXXXXXXXX with your full number, including the country code. The linking code expires after a few minutes.")}</i>`,
          ].join("\n"),
          {
            reply_to_message_id: message.message_id,
            reply_markup: { inline_keyboard: [[{ text: "Join official group", url: GROUP_INVITE_LINK }]] },
          },
        );
      }
    } catch (e) {
      console.error("[bot.js] callback_query error:", e);
    }
  });

  // Every message → command handler
  tbot.on("message", async (msg) => {
    try {
      const sender = msg.from?.username || msg.from?.id || msg.sender_chat?.id || "?";
      console.log(
        `[bot.js] 📩 [${msg.chat?.id}/${msg.chat?.type}] @${sender}: ${(msg.text || "").slice(0, 120)}`,
      );
    } catch {}

    try {
      await handleCommand(msg);
    } catch (e) {
      console.error("[bot.js] handleCommand error:", e);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  WEBHOOK / POLLING
  // ═══════════════════════════════════════════════════════════════════════════

  if (USE_WEBHOOK) {
    try {
      const webhookUrl = `${RAILWAY_URL.replace(/\/$/, "")}/bot${BOT_TOKEN}`;
      await tbot.setWebHook(webhookUrl);
      console.log("[bot.js] ✅ Webhook set:", webhookUrl);
      const info = await tbot.getWebHookInfo();
      console.log("[bot.js] 🔎 Webhook info:", info.url, info.last_error_message || "ok");
    } catch (e) {
      console.error("[bot.js] Webhook setup failed:", e?.message);
    }
  } else {
    console.log("[bot.js] ℹ️  Polling mode (dev).");
  }

  // Graceful shutdown hook for app.js
  tbot.cleanup = async () => {
    try {
      clearInterval(cooldownSweepTimer);
      if (USE_WEBHOOK) await tbot.deleteWebHook().catch(() => {});
      else await tbot.stopPolling().catch(() => {});
      console.log("[bot.js] 🛑 Telegram bot stopped.");
    } catch {}
  };

  try {
    global.tbot = tbot;
  } catch {}
  return tbot;
}
