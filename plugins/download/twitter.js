import axios from "axios";
import { Module } from "../../lib/plugins.js";

const UA = { "User-Agent": "Mozilla/5.0" };
const isTweetUrl = (u) => /^https?:\/\/(www\.|mobile\.)?(twitter|x)\.com\//i.test(u || "");

function extractMedia(d) {
  let mediaUrl =
    d?.video_hd || d?.hd || d?.video_sd || d?.sd || d?.video || d?.url;

  if (!mediaUrl && Array.isArray(d?.media) && d.media.length) {
    mediaUrl = d.media[0]?.url || d.media[0];
  }
  if (typeof mediaUrl !== "string" || !mediaUrl.startsWith("http")) return null;

  const isVideo =
    /\.mp4|video/i.test(mediaUrl) || Boolean(d?.video || d?.video_hd || d?.hd);

  const text = d?.desc || d?.title || d?.text || d?.description || d?.caption || "";
  return { mediaUrl, isVideo, text };
}

Module({
  command: "twitter",
  aliases: ["tw", "twdl", "x"],
  package: "downloader",
  description: "Download Twitter (X) videos/photos in HD",
})(async (message, match) => {
  const url = (match || "").trim().split(/\s+/)[0];

  if (!isTweetUrl(url)) {
    return message.send(
      "🐦 *Usage:* .twitter <tweet link>\n\nExample:\n.twitter https://x.com/user/status/123",
    );
  }

  try {
    await message.react("⏳");

    const res = await axios.get(
      `https://www.movanest.xyz/v2/ssstwitter?url=${encodeURIComponent(url)}`,
      { timeout: 20_000, headers: UA },
    );

    const data = res.data?.data || res.data?.result || res.data;
    const media = extractMedia(data);
    if (!media) throw new Error("Could not extract media link");

    const fileRes = await axios.get(media.mediaUrl, {
      responseType: "arraybuffer",
      timeout: 60_000,
      headers: UA,
    });
    const buffer = Buffer.from(fileRes.data);

    const caption = media.text
      ? `🐦 ${media.text}\n\n> _X Downloader_`
      : "> _X Downloader_";

    await message.conn.sendMessage(
      message.from,
      media.isVideo
        ? { video: buffer, mimetype: "video/mp4", caption }
        : { image: buffer, caption },
      { quoted: message.raw },
    );

    await message.react("✅");
  } catch (err) {
    console.error("[twitter] error:", err.message);
    await message.react("❌");
    await message.send(
      "❌ *Download failed!*\nMake sure the tweet has video/photo, or try again later.",
    );
  }
});
