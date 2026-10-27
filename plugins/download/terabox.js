import axios from "axios";
import { Module } from "../../lib/plugins.js";
import config from "../../config.js";

const UA = { "User-Agent": "Mozilla/5.0" };
const MAX_SIZE = 150 * 1024 * 1024; // 150 MB safety limit
const e = encodeURIComponent;

const apisFor = (url) => [
  `https://jerrycoder.oggyapi.workers.dev/down/terabx?url=${e(url)}`,
  `https://jerrycoder.oggyapi.workers.dev/down/terabx-v1?url=${e(url)}`,
];

const pickFile = (d) =>
  d?.result?.download ||
  d?.result?.url ||
  d?.result?.dlink ||
  d?.data?.download ||
  d?.data?.url ||
  d?.data?.dlink ||
  d?.url;

const pickTitle = (d) =>
  d?.result?.title || d?.data?.title || d?.title || "Terabox File";

const safeName = (s) =>
  String(s || "Terabox File")
    .replace(/[^\w\s.-]/gi, "")
    .trim()
    .slice(0, 80) || "Terabox File";

// Try every API until one returns a usable download link
async function resolveLink(url) {
  for (const api of apisFor(url)) {
    try {
      const res = await axios.get(api, { timeout: 30_000, headers: UA });
      const file = pickFile(res.data);
      if (typeof file === "string" && file.startsWith("http")) {
        return { file, title: pickTitle(res.data) };
      }
    } catch {
      console.log("[terabox] API failed:", api);
    }
  }
  return null;
}

Module({
  command: "terabox",
  aliases: ["tera", "teradl", "tb"],
  package: "downloader",
  description: "Terabox Downloader",
})(async (message, match) => {
  const url = (match || "").trim().split(/\s+/)[0];

  if (!/^https?:\/\//i.test(url || "")) {
    return message.send(
      "📦 *Usage:* .terabox <link>\n\nExample:\n.terabox https://1024terabox.com/s/xxxxx",
    );
  }

  try {
    await message.react("⏳");

    const info = await resolveLink(url);
    if (!info) {
      await message.react("❌");
      return message.send("❌ Could not get a download link. Try again later.");
    }

    const fileRes = await axios.get(info.file, {
      responseType: "arraybuffer",
      timeout: 120_000,
      maxContentLength: MAX_SIZE,
      maxBodyLength: MAX_SIZE,
      headers: UA,
    });
    const buffer = Buffer.from(fileRes.data);
    const sizeMB = (buffer.length / 1048576).toFixed(1);
    const title = safeName(info.title);

    await message.conn.sendMessage(
      message.from,
      {
        document: buffer,
        mimetype: "application/octet-stream",
        fileName: `${title}.mp4`,
        caption:
          `╭━━〔 *TERABOX* 〕━━⬣\n` +
          `┃ 📦 *Title:* ${title}\n` +
          `┃ 💾 *Size:* ${sizeMB} MB\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
          `> *Downloaded by ${config.BOT_NAME || "Bot"}*`,
      },
      { quoted: message.raw },
    );

    await message.react("✅");
  } catch (err) {
    console.error("[terabox] error:", err.message);
    await message.react("❌");
    await message.send(
      /maxContentLength|exceeded/i.test(err.message)
        ? "❌ File is too big (limit 150 MB)."
        : "❌ Download failed. Try again later.",
    );
  }
});
