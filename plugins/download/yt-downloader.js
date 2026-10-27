import axios from "axios";
import yts from "yt-search";
import { Jimp, JimpMime } from "jimp";
import { File } from "megajs";
import { Module } from "../../lib/plugins.js";

// ═════════════════════════════════════════════════════════════════════════════
//  CONFIG
// ═════════════════════════════════════════════════════════════════════════════

const UA = { "User-Agent": "Mozilla/5.0" };
const e = encodeURIComponent;

const LIMITS = {
  audioDoc: 60 * 1024 * 1024, // audio above this → sent as document
  videoDoc: 100 * 1024 * 1024, // video above this → sent as document
  mega: 150 * 1024 * 1024, // max mega file size
  listenerMs: 5 * 60 * 1000, // how long the buttons stay active
};

const line = "━━━━━━━━━━━━━━━━━━";

// ═════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═════════════════════════════════════════════════════════════════════════════

async function getBuffer(url) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    maxRedirects: 10,
    timeout: 120_000,
    headers: UA,
  });
  return Buffer.from(res.data);
}

const isValidBuffer = (buf) => Buffer.isBuffer(buf) && buf.length > 10240;
const isMp4 = (b) =>
  b.length > 12 && b.slice(4, 8).toString("latin1") === "ftyp";
const isValidMedia = (buf, type) =>
  isValidBuffer(buf) && (type !== "video" || isMp4(buf));

const isHttp = (s) => /^https?:\/\/\S+$/i.test(s || "");
const safeName = (s) =>
  String(s || "file")
    .replace(/[^\w\s.-]/gi, "")
    .trim()
    .slice(0, 80) || "file";
const mb = (n) => (n / 1048576).toFixed(1);

const mkReact = (message) => (emoji) =>
  message.conn
    .sendMessage(message.from, { react: { text: emoji, key: message.key } })
    .catch(() => {});

function extractVideoId(input) {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractButtonId(msg) {
  if (!msg) return null;
  if (msg.templateButtonReplyMessage?.selectedId)
    return msg.templateButtonReplyMessage.selectedId;
  if (msg.buttonsResponseMessage?.selectedButtonId)
    return msg.buttonsResponseMessage.selectedButtonId;
  if (msg.listResponseMessage?.singleSelectReply?.selectedRowId)
    return msg.listResponseMessage.singleSelectReply.selectedRowId;
  if (msg.interactiveResponseMessage) {
    const nf = msg.interactiveResponseMessage.nativeFlowResponseMessage;
    if (nf?.paramsJson) {
      try {
        const p = JSON.parse(nf.paramsJson);
        if (p.id) return p.id;
      } catch {}
    }
    return msg.interactiveResponseMessage.buttonId || null;
  }
  return null;
}

// Thumbnail via Jimp (works on Termux / android-arm64, no native deps)
async function makeThumb(url, size = 300) {
  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15_000,
      headers: UA,
    });
    const image = await Jimp.read(Buffer.from(res.data));
    image.resize({ w: size }); // height follows aspect ratio
    return await image.getBuffer(JimpMime.jpeg, { quality: 80 });
  } catch (err) {
    console.error("[thumb] error:", err.message);
    return Buffer.alloc(0);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  DOWNLOAD APIS
// ═════════════════════════════════════════════════════════════════════════════

const APIS = {
  audio: (url) => [
    { name: "kirax", url: `https://kiraxmd-api.vercel.app/api/play?query=${e(url)}` },
    { name: "xeno", url: `https://xenoytdl-2.vercel.app/api/youtube?url=${e(url)}` },
    { name: "jerry", url: `https://jerrycoder.oggyapi.workers.dev/down/ytmp3-v1?url=${e(url)}` },
    { name: "siputzx", url: `https://api.siputzx.my.id/api/d/ytmp3?url=${e(url)}` },
    { name: "elite", url: `https://eliteprotech-apis.zone.id/ytdown?format=mp3&url=${e(url)}` },
  ],
  // video endpoints are the mp4 versions of the audio ones (not tested)
  video: (url) => [
    { name: "xeno", url: `https://xenoytdl-2.vercel.app/api/youtube?url=${e(url)}` },
    { name: "jerry", url: `https://jerrycoder.oggyapi.workers.dev/down/ytmp4-v1?url=${e(url)}` },
    { name: "siputzx", url: `https://api.siputzx.my.id/api/d/ytmp4?url=${e(url)}` },
    { name: "elite", url: `https://eliteprotech-apis.zone.id/ytdown?format=mp4&url=${e(url)}` },
  ],
};

function pickCandidate(data) {
  return (
    data?.result?.mp3 ||
    data?.result?.mp4 ||
    data?.result?.video ||
    data?.data?.dl ||
    data?.data?.download ||
    data?.data?.mp4 ||
    data?.download ||
    data?.url ||
    data?.result?.download_url ||
    data?.result?.audio ||
    data?.result?.url ||
    (typeof data?.result === "string" ? data.result : null)
  );
}

// Returns { success, download_url, endpoint } or { success:false }
async function queryAPI(ytUrl, type, exclude = []) {
  for (const api of APIS[type](ytUrl)) {
    if (exclude.includes(api.name)) continue;
    try {
      const res = await axios.get(api.url, {
        timeout: 40_000,
        validateStatus: () => true,
      });
      const candidate = pickCandidate(res.data);
      if (typeof candidate !== "string" || !candidate.startsWith("http"))
        continue;

      // quick probe: make sure the link really serves a file
      const test = await axios.get(candidate, {
        responseType: "stream",
        timeout: 15_000,
        maxRedirects: 10,
        validateStatus: () => true,
        headers: UA,
      });
      try {
        test.data.destroy();
      } catch {}
      const ct = String(test.headers["content-type"] || "");
      if (/text|json|html/i.test(ct)) continue;
      if (test.status === 200 || test.status === 206) {
        return { success: true, download_url: candidate, endpoint: api.name };
      }
    } catch {}
  }
  return { success: false, error: "All endpoints failed" };
}

// Resolve url + download buffer, retrying other endpoints if the file is bad
async function getMedia(ytUrl, type) {
  const tried = [];
  const total = APIS[type](ytUrl).length;
  for (let i = 0; i < total; i++) {
    const r = await queryAPI(ytUrl, type, tried);
    if (!r.success) return null;
    tried.push(r.endpoint);
    try {
      const buf = await getBuffer(r.download_url);
      if (isValidMedia(buf, type)) return buf;
      console.log(`[${type}] ${r.endpoint} bad file:`, buf.slice(0, 12).toString("hex"));
    } catch {}
  }
  return null;
}

// ═════════════════════════════════════════════════════════════════════════════
//  YOUTUBE HELPERS
// ═════════════════════════════════════════════════════════════════════════════

async function findVideo(query) {
  const id = extractVideoId(query);
  if (id) {
    const info = await yts({ videoId: id }).catch(() => null);
    if (info)
      return { ...info, url: `https://www.youtube.com/watch?v=${id}`, id };
  }
  const s = await yts(query).catch(() => null);
  const v = s?.videos?.[0];
  return v ? { ...v, id: v.videoId } : null;
}

function buildCard(video, title) {
  const views = Number(video.views || 0).toLocaleString();
  return (
    `╭━━〔 *${title}* 〕━━⬣\n` +
    `┃ 🍉 *Title:* ${video.title}\n` +
    `┃ 🪀 *Channel:* ${video.author?.name || "Unknown"}\n` +
    `┃ 🍂 *Duration:* ${video.timestamp || "?"}\n` +
    `┃ 🍓 *Views:* ${views}\n` +
    `┃ 🍼 *Uploaded:* ${video.ago || "?"}\n` +
    `┃ 🏝️ *ID:* ${video.videoId || video.id}\n` +
    `╰${line}⬣\n\n` +
    `❄️ *Select download format below* 👇`
  );
}

async function sendFormatButtons(message, video, title, buttonId) {
  const sock = message.conn;
  const thumb = await makeThumb(video.thumbnail);
  const author = video.author?.name || "Unknown";

  await sock.relayMessage(
    message.from,
    {
      buttonsMessage: {
        buttons: [
          { buttonId: `audio_${buttonId}`, buttonText: { displayText: "🎵 Audio" }, type: 1 },
          { buttonId: `vid_${buttonId}`, buttonText: { displayText: "🎬 Video" }, type: 1 },
        ],
        contentText: buildCard(video, title),
        footerText: message.botFooter || "YOUTUBE",
        contextInfo: { mentionedJid: [], groupMentions: [], statusAttributions: [] },
        headerType: 6,
        locationMessage: {
          degreesLatitude: 0,
          degreesLongitude: 0,
          name: message.pushName || "User",
          address: `– ${author}`,
          jpegThumbnail: thumb,
        },
        viewOnce: true,
      },
    },
    {
      additionalNodes: [
        {
          tag: "biz",
          attrs: {},
          content: [
            {
              tag: "interactive",
              attrs: { type: "native_flow", v: "1" },
              content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }],
            },
          ],
        },
      ],
    },
  );
}

// Sends the finished buffer in the right form (audio / video / document)
async function deliver(sock, jid, type, buf, video, quoted) {
  const name = safeName(video.title);

  if (type === "audio") {
    if (buf.length > LIMITS.audioDoc) {
      return sock.sendMessage(
        jid,
        {
          document: buf,
          mimetype: "audio/mpeg",
          fileName: `${name}.mp3`,
          caption: `🎵 *${video.title}*\n⏱ ${video.timestamp}\n\n_Too large for audio, sent as document_`,
        },
        { quoted },
      );
    }
    return sock.sendMessage(jid, { audio: buf, mimetype: "audio/mpeg" }, { quoted });
  }

  if (buf.length > LIMITS.videoDoc) {
    return sock.sendMessage(
      jid,
      {
        document: buf,
        mimetype: "video/mp4",
        fileName: `${name}.mp4`,
        caption: `🎬 *${video.title}*\n⏱ ${video.timestamp}\n\n_Too large for video, sent as document_`,
      },
      { quoted },
    );
  }
  return sock.sendMessage(
    jid,
    {
      video: buf,
      mimetype: "video/mp4",
      fileName: `${name}.mp4`,
      caption: `🎬 *${video.title}*`,
    },
    { quoted },
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  SHARED PLAY / VIDEO FLOW
//  Search → show card with buttons → download only the format that is tapped
// ═════════════════════════════════════════════════════════════════════════════

async function youtubeFlow(message, match, { title, prompt }) {
  const sock = message.conn;
  const react = mkReact(message);

  if (!match) return message.send(prompt);

  try {
    await react("🔍");
    const video = await findVideo(match.trim());
    if (!video) {
      await react("❌");
      return message.send("❌ No video found for your query.");
    }

    const stamp = Date.now().toString();
    await sendFormatButtons(message, video, title, `${video.id}_${stamp}`);
    await react("✅");

    // one download per format, even if the button is tapped many times
    const pending = {};
    const fetchOnce = (type) =>
      (pending[type] ??= getMedia(video.url, type).catch(() => null));

    const handleResponse = async (event) => {
      const data = event.messages?.[0];
      if (!data?.message) return;
      if (data.key?.remoteJid !== message.from) return;

      const id = extractButtonId(data.message);
      if (!id || !id.includes(stamp)) return;

      const type = id.startsWith("audio_")
        ? "audio"
        : id.startsWith("vid_")
          ? "video"
          : null;
      if (!type) return;

      await react("⬇️");
      try {
        const buf = await fetchOnce(type);
        if (!buf) {
          delete pending[type]; // allow retry
          await react("❌");
          return message.send(
            `❌ ${type === "audio" ? "Audio" : "Video"} download failed. Try again later.`,
          );
        }
        if (type === "video" && buf.length > 20 * 1048576)
          await message.send(`📦 Big file (${mb(buf.length)} MB), sending...`);

        await deliver(sock, message.from, type, buf, video, data);
        await react("✅");
      } catch (err) {
        console.error("[yt] send error:", err);
        await react("❌");
        await sock.sendMessage(
          message.from,
          { text: "❌ Failed to send media. Please try again." },
          { quoted: data },
        );
      }
    };

    sock.ev.on("messages.upsert", handleResponse);
    setTimeout(() => sock.ev.off("messages.upsert", handleResponse), LIMITS.listenerMs);
  } catch (err) {
    console.error("[yt] flow error:", err);
    await react("❌");
    return message.send("❌ Oops! Something went wrong. Please try again.");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  COMMANDS
// ═════════════════════════════════════════════════════════════════════════════

// ─── YouTube play ───────────────────────────────────────────────────────────
Module({
  command: "play",
  aliases: ["ytmp3", "yta", "song"],
  package: "downloader",
  description: "Download audio / video from YouTube",
})(async (message, match) =>
  youtubeFlow(message, match, {
    title: "YOUTUBE PLAY",
    prompt: "🎵 Usage: *play <song name | YouTube url>*",
  }),
);

// ─── YouTube video ──────────────────────────────────────────────────────────
Module({
  command: "video",
  aliases: ["mp4", "ytmp4"],
  package: "downloader",
  description: "Download video / audio from YouTube",
})(async (message, match) =>
  youtubeFlow(message, match, {
    title: "YOUTUBE VIDEO",
    prompt: "🎬 Usage: *video <name | YouTube url>*",
  }),
);

// ─── Direct audio url ───────────────────────────────────────────────────────
Module({
  command: "sendaudio",
  aliases: ["dlmp3", "dlaudio"],
  package: "downloader",
  description: "Download audio from a direct url",
})(async (message, match) => {
  const react = mkReact(message);
  const url = (match || "").trim();
  if (!isHttp(url)) return message.send("🎵 Usage: *sendaudio <audio url>*");

  try {
    await react("⏳");
    const buffer = await getBuffer(url);
    await message.conn.sendMessage(
      message.from,
      { audio: buffer, mimetype: "audio/mpeg" },
      { quoted: message },
    );
    await react("✅");
  } catch (err) {
    console.error("[sendaudio] error:", err.message);
    await react("❌");
    return message.send("❌ Failed to download that audio.");
  }
});

// ─── Direct video url ───────────────────────────────────────────────────────
Module({
  command: "sendvideo",
  aliases: ["dlmp4", "dvideo"],
  package: "downloader",
  description: "Download video from a direct url",
})(async (message, match) => {
  const react = mkReact(message);
  const url = (match || "").trim();
  if (!isHttp(url)) return message.send("🎬 Usage: *sendvideo <video url>*");

  try {
    await react("⏳");
    const buffer = await getBuffer(url);
    const asDoc = buffer.length > LIMITS.videoDoc || !isMp4(buffer);
    await message.conn.sendMessage(
      message.from,
      asDoc
        ? { document: buffer, fileName: "Video.mp4", mimetype: "video/mp4" }
        : { video: buffer, mimetype: "video/mp4" },
      { quoted: message },
    );
    await react("✅");
  } catch (err) {
    console.error("[sendvideo] error:", err.message);
    await react("❌");
    return message.send("❌ Failed to download that video.");
  }
});

// ─── YouTube search ─────────────────────────────────────────────────────────
Module({
  command: "yts",
  package: "search",
  description: "Search YouTube videos",
})(async (message, match) => {
  const query = (match || "").trim();
  if (!query) return message.send("🔎 Usage: *yts <search query>*");

  let videos = [];
  try {
    const res = await yts(query);
    videos = (res?.videos || []).slice(0, 8);
  } catch {}

  if (!videos.length) return message.send("❌ No results found.");

  let reply = `╭━━〔 *YOUTUBE SEARCH* 〕━━⬣\n┃ 🔎 _${query}_\n╰${line}⬣\n\n`;
  videos.forEach((v, i) => {
    reply +=
      `*${i + 1}.* ${v.title}\n` +
      `   🪀 ${v.author?.name || "Unknown"}  •  ⏱ ${v.timestamp || "?"}\n` +
      `   🍼 ${v.ago || "?"}\n` +
      `   🔗 ${v.url}\n\n`;
  });
  reply += `_Tip: use_ *play <url>* _to download_`;

  await message.send({ image: { url: videos[0].thumbnail }, caption: reply });
});

// ─── GitHub clone (zip) ─────────────────────────────────────────────────────
Module({
  command: "gitclone",
  package: "downloader",
  description: "Download a GitHub repository as zip",
})(async (message, match) => {
  const react = mkReact(message);
  const arg = (match || "").trim();
  if (!arg)
    return message.send(
      "🐙 Usage: *gitclone <github link>*\n\nExample:\n.gitclone https://github.com/username/repository",
    );

  try {
    const m = arg.split(/\s+/)[0].match(/github\.com\/([^\/]+)\/([^\/\s#?]+)/i);
    if (!m) return message.send("⚠️ Invalid GitHub repository link.");

    const username = m[1];
    const repo = m[2].replace(/\.git$/i, "");
    const zipUrl = `https://api.github.com/repos/${username}/${repo}/zipball`;

    await react("⏳");
    const head = await fetch(zipUrl, { method: "HEAD", headers: UA });
    if (!head.ok) {
      await react("❌");
      return message.send("❌ Repository not found or private.");
    }

    await message.conn.sendMessage(
      message.from,
      {
        document: { url: zipUrl },
        fileName: `${repo}.zip`,
        mimetype: "application/zip",
        caption: `🐙 *${username}/${repo}*`,
      },
      { quoted: message },
    );
    await react("✅");
  } catch (err) {
    console.error("[gitclone] error:", err);
    await react("❌");
    return message.send("❌ Failed to download repository. Try again later.");
  }
});

// ─── APK downloader ─────────────────────────────────────────────────────────
Module({
  command: "apk",
  package: "downloader",
  description: "Download APK files",
})(async (message, match) => {
  const react = mkReact(message);
  const appName = (match || "").trim();
  if (!appName) return message.send("📱 Usage: *apk <app name>*");

  try {
    await react("⏳");
    const res = await axios
      .get("https://api.nexoracle.com/downloader/apk", {
        params: { apikey: "free_key@maher_apis", q: appName },
        timeout: 30_000,
      })
      .catch(() => null);

    if (res?.data?.status !== 200 || !res.data.result) {
      await react("❌");
      return message.send("❌ APK not found. Try another name.");
    }

    const { name, lastup, package: pkg, size, icon, dllink } = res.data.result;

    await message.conn.sendMessage(
      message.from,
      {
        image: { url: icon },
        caption:
          `╭━━〔 *APK DOWNLOADER* 〕━━⬣\n` +
          `┃ 📱 *Name:* ${name}\n` +
          `┃ 🗓 *Updated:* ${lastup}\n` +
          `┃ 📦 *Package:* ${pkg}\n` +
          `┃ 💾 *Size:* ${size}\n` +
          `╰${line}⬣\n\n⏳ _Sending APK..._`,
      },
      { quoted: message },
    );

    const apkRes = await axios
      .get(dllink, { responseType: "arraybuffer", timeout: 180_000, headers: UA })
      .catch(() => null);
    if (!apkRes?.data) {
      await react("❌");
      return message.send("❌ Failed to download the APK file.");
    }

    await message.conn.sendMessage(
      message.from,
      {
        document: Buffer.from(apkRes.data),
        mimetype: "application/vnd.android.package-archive",
        fileName: `${safeName(name)}.apk`,
      },
      { quoted: message },
    );
    await react("✅");
  } catch (err) {
    console.error("[apk] error:", err);
    await react("❌");
    return message.send("❌ Unable to fetch APK details.");
  }
});

// ─── Mega.nz downloader ─────────────────────────────────────────────────────
Module({
  command: "mega",
  package: "downloader",
  description: "Download files from Mega.nz",
})(async (message, match) => {
  const react = mkReact(message);
  const link = (match || "").trim();
  if (!link) return message.send("☁️ Usage: *mega <mega.nz link>*");

  try {
    await react("⏳");
    const file = File.fromURL(link);
    await file.loadAttributes();

    if (file.size && file.size > LIMITS.mega) {
      await react("❌");
      return message.send(
        `❌ File too big (${mb(file.size)} MB). Limit is ${mb(LIMITS.mega)} MB.`,
      );
    }

    const data = await file.downloadBuffer(); // straight to memory, no temp file
    const fileName = safeName(file.name || `mega_file_${Date.now()}`);

    await message.conn.sendMessage(
      message.from,
      {
        document: data,
        fileName,
        mimetype: "application/octet-stream",
        caption: `☁️ *${fileName}*\n💾 ${mb(data.length)} MB`,
      },
      { quoted: message },
    );
    await react("✅");
  } catch (err) {
    console.error("[mega] error:", err);
    await react("❌");
    return message.send("❌ Failed to download from Mega.nz.");
  }
});
