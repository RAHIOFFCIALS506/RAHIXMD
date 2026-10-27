import * as baileys from "@whiskeysockets/baileys";
import { generateWAMessageFromContent } from "@whiskeysockets/baileys";
import { getMediaKeys } from "@whiskeysockets/baileys/lib/Utils/messages-media.js";
import axios from "axios";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import AdmZip from "adm-zip";
import { fileURLToPath } from "url";

import config from "../../config.js";
import stickerLib from "../../lib/sticker.js";
import { Module } from "../../lib/plugins.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═════════════════════════════════════════════════════════════════════════════
//  JIMP (pure JS / WASM — works on Termux android-arm64, no native deps)
//
//  Telegram static stickers are WebP, and plain Jimp can't read WebP.
//  So we add the WASM webp codec:   npm i jimp @jimp/core @jimp/wasm-webp
//  If the codec is missing the plugin still loads (blank tray fallback).
// ═════════════════════════════════════════════════════════════════════════════

let Jimp;
let WEBP_OK = false;
try {
  const { createJimp } = await import("@jimp/core");
  const { defaultFormats, defaultPlugins } = await import("jimp");
  const webp = (await import("@jimp/wasm-webp")).default;
  Jimp = createJimp({
    formats: [...defaultFormats, webp],
    plugins: defaultPlugins,
  });
  WEBP_OK = true;
} catch {
  Jimp = (await import("jimp")).Jimp;
  console.warn(
    "[TGS] @jimp/wasm-webp not found → run: npm i @jimp/core @jimp/wasm-webp",
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  CONSTANTS & SMALL HELPERS
// ═════════════════════════════════════════════════════════════════════════════

const WA_PACK_MAX = 60; // WhatsApp limit per sticker pack
const SINGLE_MAX = 120; // max stickers in 1-by-1 mode
const PACK_MODE_MAX = 300; // max stickers in -pack mode (5 packs)
const line = "━━━━━━━━━━━━━━━━━━";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const safeUnlink = (p) => {
  try {
    if (p && fs.existsSync(p)) fs.unlinkSync(p);
  } catch {}
};

const TEMP_DIR = path.join(__dirname, "../temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Telegram token (auto-clean "bot" prefix / spaces)
const getTgToken = () =>
  String(config.TGTOKEN || "")
    .trim()
    .replace(/^bot/i, "");

const tgErr = (e) =>
  e.response?.data?.description || e.message || "Unknown error";

// Link parser (addstickers + addemoji detect)
function parsePackName(link) {
  if (/\/addemoji\//i.test(link)) return { emoji: true };
  const m =
    link.match(/(?:t\.me|telegram\.me)\/addstickers\/([A-Za-z0-9_]+)/i) ||
    link.match(/^([A-Za-z0-9_]{3,})$/); // plain pack name works too
  return { name: m?.[1] || null };
}

// ═════════════════════════════════════════════════════════════════════════════
//  IMAGE HELPERS (Jimp)
// ═════════════════════════════════════════════════════════════════════════════

const blankPng = async (size) =>
  new Jimp({ width: size, height: size, color: 0x00000000 }).getBuffer(
    "image/png",
  );

// Any image → 512x512 transparent-padded WebP (fallback when stickerLib fails)
async function jimpToWebp(buffer) {
  const img = await Jimp.read(buffer);
  img.contain({ w: 512, h: 512 });
  return await img.getBuffer("image/webp", { quality: 80 });
}

// Tray icon: first sticker that decodes → 96x96 PNG, else transparent PNG
async function generateTrayIcon(webpBuffers) {
  for (let i = 0; i < webpBuffers.length; i++) {
    try {
      const img = await Jimp.read(webpBuffers[i]);
      img.contain({ w: 96, h: 96 });
      return await img.getBuffer("image/png");
    } catch (e) {
      console.error(`[TGS-PACK] tray gen failed on sticker#${i}: ${e.message}`);
      if (!WEBP_OK) break; // no webp codec → no point trying the rest
    }
  }
  return await blankPng(96);
}

// Static image → WebP (with EXIF via stickerLib, Jimp as fallback)
async function normalizeToWebp(mediaBuffer, index, exifData) {
  try {
    return await stickerLib.toSticker("image", mediaBuffer, exifData);
  } catch {
    console.error(
      `[TGS-PACK] sticker#${index} stickerLib failed → jimp fallback`,
    );
    try {
      return await jimpToWebp(mediaBuffer);
    } catch {
      console.error(`[TGS-PACK] sticker#${index} jimp also failed → skip`);
      return null;
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  REGISTER CUSTOM BAILEYS MEDIA TYPES
// ═════════════════════════════════════════════════════════════════════════════

const { MEDIA_PATH_MAP, MEDIA_HKDF_KEY_MAPPING } = baileys;
if (MEDIA_PATH_MAP && MEDIA_HKDF_KEY_MAPPING) {
  MEDIA_PATH_MAP["sticker-pack"] = "/mms/sticker-pack";
  MEDIA_HKDF_KEY_MAPPING["sticker-pack"] = "Sticker Pack";
  MEDIA_PATH_MAP["thumbnail-sticker-pack"] = "/mms/document";
  MEDIA_HKDF_KEY_MAPPING["thumbnail-sticker-pack"] = "Sticker Pack Thumbnail";
}

async function encryptMedia(buffer, mediaKey, mediaType) {
  const { cipherKey, iv, macKey } = await getMediaKeys(mediaKey, mediaType);
  const aes = crypto.createCipheriv("aes-256-cbc", cipherKey, iv);
  const hmac = crypto.createHmac("sha256", macKey).update(iv);
  const encFile = Buffer.concat([aes.update(buffer), aes.final()]);
  hmac.update(encFile);
  const mac = hmac.digest().slice(0, 10);
  const finalEncFile = Buffer.concat([encFile, mac]);
  return {
    encFile: finalEncFile,
    fileSha256: crypto.createHash("sha256").update(buffer).digest(),
    fileEncSha256: crypto.createHash("sha256").update(finalEncFile).digest(),
  };
}

// Encrypt → temp file → upload → always delete temp file
async function encryptAndUpload(sock, buffer, mediaKey, mediaType, tmpPath) {
  const enc = await encryptMedia(buffer, mediaKey, mediaType);
  fs.writeFileSync(tmpPath, enc.encFile);
  try {
    const upload = await sock.waUploadToServer(tmpPath, {
      mediaType,
      fileEncSha256B64: enc.fileEncSha256.toString("base64"),
    });
    return { enc, upload };
  } finally {
    safeUnlink(tmpPath);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  TELEGRAM DOWNLOAD (with retry + rate-limit handling)
// ═════════════════════════════════════════════════════════════════════════════

async function tgDownloadFile(fileId, retries = 3) {
  const token = getTgToken();
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const fileRes = await axios.get(
        `https://api.telegram.org/bot${token}/getFile`,
        { params: { file_id: fileId }, timeout: 30000 },
      );
      const fp = fileRes.data?.result?.file_path;
      if (!fp) throw new Error("No file_path from Telegram");

      const { data } = await axios.get(
        `https://api.telegram.org/file/bot${token}/${fp}`,
        { responseType: "arraybuffer", timeout: 60000 },
      );
      return Buffer.from(data);
    } catch (e) {
      lastErr = e;
      if (e.response?.status === 429 && i < retries - 1) {
        const wait = (e.response.data?.parameters?.retry_after || 5) * 1000;
        console.log(`[TGS] Rate limited — waiting ${wait}ms`);
        await sleep(wait);
        continue;
      }
      if (i < retries - 1) await sleep(1000 * (i + 1));
    }
  }
  throw new Error(tgErr(lastErr));
}

// ═════════════════════════════════════════════════════════════════════════════
//  BUILD + SEND WHATSAPP STICKER PACK
// ═════════════════════════════════════════════════════════════════════════════

async function buildAndSendStickerPack(
  sock,
  from,
  webpBuffers,
  packName,
  packPublisher,
  packId,
) {
  const tempBase = path.join(TEMP_DIR, `tgspack_${Date.now()}_${packId}`);
  const trayName = `${packId}.png`;

  const trayPngBuffer = await generateTrayIcon(webpBuffers);

  // contents.json + sticker list (everything is kept in memory, no temp files)
  const zip = new AdmZip();
  const stickersForJson = [];
  const stickersMetadata = [];

  webpBuffers.forEach((buf) => {
    const hash = crypto
      .createHash("sha256")
      .update(buf)
      .digest("base64")
      .replace(/\//g, "_")
      .replace(/\+/g, "-")
      .replace(/=/g, "");
    const webpName = `${hash}.webp`;
    zip.addFile(webpName, buf);
    stickersForJson.push({ image_file: webpName, emojis: [""] });
    stickersMetadata.push({
      fileName: webpName,
      mimetype: "image/webp",
      isAnimated: false,
      accessibilityLabel: "",
      isLottie: false,
      emojis: [""],
    });
  });

  zip.addFile(
    "contents.json",
    Buffer.from(
      JSON.stringify({
        android_play_store_link: "",
        ios_app_store_link: "",
        publisher_email: "",
        publisher_website: "",
        privacy_policy_website: "",
        license_agreement_website: "",
        image_data_version: "1",
        avoid_cache: false,
        animated_sticker_pack: false,
        identifier: packId,
        name: packName,
        publisher: packPublisher,
        tray_image_file: trayName,
        stickers: stickersForJson,
      }),
    ),
  );
  zip.addFile(trayName, trayPngBuffer);

  const zipBuffer = zip.toBuffer();
  const zipMediaKey = crypto.randomBytes(32);

  const { enc: zipEnc, upload: zipUpload } = await encryptAndUpload(
    sock,
    zipBuffer,
    zipMediaKey,
    "sticker-pack",
    `${tempBase}_zip_enc.tmp`,
  );
  const { enc: thumbEnc, upload: thumbUpload } = await encryptAndUpload(
    sock,
    trayPngBuffer,
    zipMediaKey,
    "thumbnail-sticker-pack",
    `${tempBase}_thumb_enc.tmp`,
  );

  const imageDataHash = crypto
    .createHash("sha256")
    .update(Buffer.concat(webpBuffers))
    .digest("base64");

  const waMsg = await generateWAMessageFromContent(
    from,
    {
      stickerPackMessage: {
        stickerPackId: packId,
        name: packName,
        publisher: packPublisher,
        stickers: stickersMetadata,
        trayIconFileName: trayName,
        fileSha256: zipEnc.fileSha256,
        fileEncSha256: zipEnc.fileEncSha256,
        mediaKey: zipMediaKey,
        fileLength: zipEnc.encFile.length,
        directPath: zipUpload.directPath,
        stickerPackSize: zipBuffer.length,
        stickerPackOrigin: 2,
        mediaKeyTimestamp: Math.floor(Date.now() / 1000),
        imageDataHash,
        thumbnailDirectPath: thumbUpload.directPath,
        thumbnailSha256: thumbEnc.fileSha256,
        thumbnailEncSha256: thumbEnc.fileEncSha256,
        thumbnailHeight: 96,
        thumbnailWidth: 96,
      },
    },
    { userJid: sock.user.id },
  );
  await sock.relayMessage(from, waMsg.message, { messageId: waMsg.key.id });
}

// ═════════════════════════════════════════════════════════════════════════════
//  COMMAND
// ═════════════════════════════════════════════════════════════════════════════

Module({
  command: "tgsticker",
  aliases: ["tgs", "tg"],
  package: "downloader",
  description: "Download Telegram sticker pack",
})(async (message, match) => {
  const sock = message.conn;
  const from = message.from;
  const react = (emoji) =>
    sock
      .sendMessage(from, { react: { text: emoji, key: message.key } })
      .catch(() => {});
  const botPrefix = message.prefix || ".";

  // const isSuperUser = message.isCreator || message.sudo;
  // if (!isSuperUser) return message.send('*This area is reserved for the bot owner only.* 🕷️');

  const token = getTgToken();
  if (!token) {
    await react("❌");
    return message.send(
      "❌ *Telegram Bot Token not configured*\nSet `TGTOKEN` in config.js",
    );
  }

  // ── args ───────────────────────────────────────────────────────────────────
  const args = match ? match.split(/\s+/).filter(Boolean) : [];
  const isPackMode = args.some((a) => /^-{1,2}pack$/i.test(a));
  const link = args
    .filter((a) => !/^-{1,2}pack$/i.test(a))
    .join(" ")
    .trim();

  if (!link) {
    return message.send(
      `╭━━〔 *TELEGRAM STICKERS* 〕━━⬣
┃ 🎴 Download Telegram sticker packs
╰${line}⬣

*1️⃣ Send one by one*
\`${botPrefix}tgs https://t.me/addstickers/PackName\`

*2️⃣ WhatsApp sticker pack*
\`${botPrefix}tgs -pack https://t.me/addstickers/PackName\`

• Max ${SINGLE_MAX} stickers (one by one)
• WhatsApp allows ${WA_PACK_MAX} per pack — auto splits
• Supports static + .webm video`,
    );
  }

  const parsed = parsePackName(link);
  if (parsed.emoji) {
    await react("❌");
    return message.send(
      "⚠️ Ei ta *emoji pack* (addemoji). Shudhu sticker pack (addstickers) support kore.",
    );
  }
  const packId = parsed.name;
  if (!packId) {
    await react("❌");
    return message.send(
      "❌ Invalid Telegram link!\nExample: https://t.me/addstickers/PackName",
    );
  }

  try {
    await react("⏳");

    // ── fetch pack info ──────────────────────────────────────────────────────
    let packRes;
    try {
      packRes = await axios.get(
        `https://api.telegram.org/bot${token}/getStickerSet`,
        { params: { name: packId }, timeout: 30000 },
      );
    } catch (e) {
      const desc = tgErr(e);
      console.error(`[TGS] getStickerSet("${packId}") failed:`, desc);
      await react("❌");
      if (/STICKERSET_INVALID/i.test(desc))
        return message.send(
          `❌ Pack not found: \`${packId}\`\nLink ba pack name check koro.`,
        );
      if (/unauthorized|not found/i.test(desc) && e.response?.status !== 400)
        return message.send("❌ Telegram token invalid. `TGTOKEN` check koro.");
      return message.send(`❌ Telegram error: ${desc}`);
    }

    if (!packRes.data?.ok) {
      await react("❌");
      return message.send("❌ Pack not found. Check the link.");
    }

    const pack = packRes.data.result;
    console.log(
      `[TGS] pack="${pack.title}" total=${pack.stickers.length} video=${pack.is_video} animated=${pack.is_animated}`,
    );

    if (pack.is_animated) {
      await react("❌");
      return message.send(
        "⚠️ Lottie (.tgs) animated not supported.\nStatic and .webm work.",
      );
    }

    const isVideo = pack.is_video;
    const MAX = isPackMode
      ? Math.min(pack.stickers.length, PACK_MODE_MAX)
      : SINGLE_MAX;
    const stickers = pack.stickers.slice(0, MAX);
    const totalPacks = Math.ceil(stickers.length / WA_PACK_MAX);

    if (isPackMode && pack.stickers.length > PACK_MODE_MAX) {
      await message.send(
        `⚠️ Pack has ${pack.stickers.length} stickers — limiting to ${PACK_MODE_MAX} (${PACK_MODE_MAX / WA_PACK_MAX} packs).`,
      );
    }

    if (isPackMode && !isVideo && !WEBP_OK) {
      await message.send(
        "⚠️ _WebP codec missing — tray icon will be blank._\n`npm i @jimp/core @jimp/wasm-webp`",
      );
    }

    // ── info card ────────────────────────────────────────────────────────────
    await message.send(
      `╭━━〔 *STICKERS FOUND* 〕━━⬣
┃ 🍉 *Name:* ${pack.title}
┃ ❄️ *Type:* ${isVideo ? "Animated (.webm)" : "Static (.webp)"}
┃ 🎐 *Total:* ${stickers.length} stickers
┃ 🎋 *Mode:* ${isPackMode ? "WhatsApp Pack" : "One by one"}${
        isPackMode && totalPacks > 1
          ? `\n┃ 📂 *Packs:* ${totalPacks} (${WA_PACK_MAX} per pack)`
          : ""
      }
╰${line}⬣

> _Downloading stickers..._`,
    );

    const packname = config.PACK_NAME || "x-miku";
    const packauthor = config.PACK_AUTHOR || "@nightx_rebel";
    const exifData = { packname, author: packauthor, categories: ["💖"] };

    // ── MODE 1: send one by one ──────────────────────────────────────────────
    if (!isPackMode) {
      let sent = 0;
      let failed = 0;

      for (const s of stickers) {
        try {
          const mediaBuffer = await tgDownloadFile(s.file_id);
          const stickerBuffer = await stickerLib.toSticker(
            isVideo ? "video" : "image",
            mediaBuffer,
            exifData,
          );
          await sock.sendMessage(from, { sticker: stickerBuffer });
          sent++;
        } catch (err) {
          failed++;
          console.error(`[TGS] #${sent + failed} failed:`, err.message);
        }
        await sleep(3500);
      }

      await react(sent ? "✅" : "❌");
      return message.send(
        `╭━━〔 *DONE* 〕━━⬣\n┃ ✔️ *Sent:* ${sent}\n┃ ❌ *Failed:* ${failed}\n╰${line}⬣`,
      );
    }

    // ── MODE 2: WhatsApp sticker pack(s) ─────────────────────────────────────
    let totalSent = 0;
    let totalFailed = 0;
    let packsSent = 0;

    for (let packNum = 0; packNum < totalPacks; packNum++) {
      const chunk = stickers.slice(
        packNum * WA_PACK_MAX,
        (packNum + 1) * WA_PACK_MAX,
      );
      const chunkPackId = crypto.randomUUID();
      const chunkPackName =
        totalPacks > 1 ? `${packname} (${packNum + 1}/${totalPacks})` : packname;

      const webpBuffers = [];

      for (let i = 0; i < chunk.length; i++) {
        try {
          const mediaBuffer = await tgDownloadFile(chunk[i].file_id);
          const webpBuf = isVideo
            ? await stickerLib.toSticker("video", mediaBuffer, exifData)
            : await normalizeToWebp(mediaBuffer, i, exifData);

          if (!webpBuf) {
            totalFailed++;
            continue;
          }
          webpBuffers.push(webpBuf);
          totalSent++;
        } catch (err) {
          totalFailed++;
          console.error(
            `[TGS-PACK] Pack ${packNum + 1} sticker ${i + 1} failed:`,
            err.message,
          );
        }
        if (i < chunk.length - 1) await sleep(800);
      }

      if (!webpBuffers.length) {
        await message.send(
          `⚠️ Pack ${packNum + 1} — all stickers failed, skipping.`,
        );
        continue;
      }

      try {
        await buildAndSendStickerPack(
          sock,
          from,
          webpBuffers,
          chunkPackName,
          packauthor,
          chunkPackId,
        );
        packsSent++;
      } catch (err) {
        console.error("[TGS-PACK] buildAndSend failed:", err.message);
        await message.send(`❌ Pack ${packNum + 1} failed: ${err.message}`);
      }

      if (packNum < totalPacks - 1) await sleep(3000);
    }

    await react(packsSent ? "✅" : "❌");
    return message.send(
      `╭━━〔 *DONE* 〕━━⬣\n┃ 📦 *Packs:* ${packsSent}/${totalPacks}\n┃ ✔️ *Stickers:* ${totalSent}\n┃ ❌ *Failed:* ${totalFailed}\n╰${line}⬣`,
    );
  } catch (err) {
    console.error("[TGS] ERROR:", err.message);
    await react("❌");
    return message.send(`❌ Error: ${tgErr(err)}`);
  }
});
