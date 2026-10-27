import axios from "axios";
import { Module } from "../../lib/plugins.js";

const UA = { "User-Agent": "Mozilla/5.0" };
const e = encodeURIComponent;

const apisFor = (url) => [
  `https://kiraxmd-api.vercel.app/api/tiktok?url=${e(url)}`,
  `https://api-aswin-sparky.koyeb.app/api/downloader/tiktok?url=${e(url)}`,
  `https://jerrycoder.oggyapi.workers.dev/down/tiktok?url=${e(url)}`,
  `https://jerrycoder.oggyapi.workers.dev/down/tiktok-v1?url=${e(url)}`,
];

function extractUrl(text) {
  const m = (text || "").match(/https?:\/\/[^\s]+/i);
  return m ? m[0] : null;
}

const pickVideo = (d) =>
  d?.result?.no_watermark ||
  d?.result?.nowm ||
  d?.data?.no_watermark ||
  d?.data?.nowm ||
  d?.data?.play ||
  d?.result?.video ||
  d?.result?.download ||
  d?.result?.url ||
  d?.data?.video ||
  d?.data?.download ||
  d?.data?.url ||
  d?.video ||
  d?.url;

const pickCaption = (d) =>
  d?.result?.title ||
  d?.result?.caption ||
  d?.result?.desc ||
  d?.data?.title ||
  d?.data?.caption ||
  d?.data?.desc ||
  d?.title ||
  d?.caption ||
  "";

// Try every API until one actually returns a video link
async function resolveVideo(url) {
  for (const api of apisFor(url)) {
    try {
      const res = await axios.get(api, { timeout: 20_000, headers: UA });
      const video = pickVideo(res.data);
      if (typeof video === "string" && video.startsWith("http")) {
        return { video, caption: pickCaption(res.data) };
      }
    } catch {
      console.log("[tiktok] API failed:", api);
    }
  }
  return null;
}

Module({
  command: "tiktok",
  aliases: ["tt", "ttdl"],
  package: "downloader",
  description: "Download TikTok videos (no watermark)",
})(async (message, match) => {
  let url = (match || "").trim();

  if (!url) {
    // fall back to a replied message that contains a link
    const quoted =
      message.raw?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted) {
      url = extractUrl(
        quoted.conversation ||
          quoted.extendedTextMessage?.text ||
          quoted.imageMessage?.caption ||
          quoted.videoMessage?.caption ||
          quoted.documentMessage?.caption ||
          "",
      );
    }
  } else {
    url = extractUrl(url) || url;
  }

  if (!url || !/^https?:\/\//i.test(url)) {
    return message.send(
      "🎵 *Usage:* .tt <TikTok link>\n\nExample:\n.tt https://vt.tiktok.com/xxxxx\n\n_or reply to a TikTok link with_ .tt",
    );
  }

  try {
    await message.react("⏳");

    const info = await resolveVideo(url);
    if (!info) throw new Error("All APIs failed to fetch this TikTok video.");

    const videoRes = await axios.get(info.video, {
      responseType: "arraybuffer",
      timeout: 60_000,
      headers: UA,
    });
    const buffer = Buffer.from(videoRes.data);

    const caption = info.caption
      ? `🎵 ${info.caption}\n\n> _TikTok Downloader_`
      : "> _TikTok Downloader_";

    await message.conn.sendMessage(
      message.from,
      { video: buffer, mimetype: "video/mp4", caption },
      { quoted: message.raw },
    );

    await message.react("✅");
  } catch (err) {
    console.error("[tiktok] error:", err.message);
    await message.react("❌");
    await message.send(
      `❌ *Download failed*\n\n⚠️ ${err.message || "Unknown error"}`,
    );
  }
});
