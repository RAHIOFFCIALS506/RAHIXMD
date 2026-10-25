const isTrue = (x) => x === "true" || x === true;

export default {
  // General Config
  GROUP_LINKS: [],
  prefix: ".",
  DATABASE_URL: process.env.DATABASE_URL || "",
  BOT_NAME: process.env.BOT_NAME || "miku",
  packname: process.env.PACKNAME || "bot",
  author: process.env.AUTHOR || "x-Miku",
  THEME: process.env.THEME || "t",
  giftname: "miku",
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN || "",
  TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL || "",
  // Telegram Group Config
  ALLOWED_GROUP_ID: Number(process.env.TG_GROUP_ID) || -1003718062610,
  GROUP_INVITE_LINK: process.env.TG_GROUP_LINK || "https://t.me/x_miku_1",
  // WhatsApp Channel Config
  WA_CHANNEL_LINK:
    process.env.WA_CHANNEL_LINK ||
    "https://whatsapp.com/channel/0029Vb6gE1WHrDZX1MbuPi3G",
  // Pairing Config
  PAIR_COOLDOWN_MS: 30_000,
  // Telegram Bot Token
  BOT_TOKEN: process.env.BOT_TOKEN || "",
};
