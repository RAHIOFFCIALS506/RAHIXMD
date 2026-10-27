import { Module } from "../../lib/plugins.js";
import axios from "axios";

// ───────────── helpers ─────────────
const http = axios.create({
  timeout: 15000,
  headers: { "User-Agent": "Mozilla/5.0 (anime-plugin)" },
});

const ENTITIES = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&#39;": "'", "&apos;": "'", "&nbsp;": " ", "&hellip;": "…",
};

// tiny replacement for the `he` package (no dependency needed)
const decode = (s = "") =>
  s
    .replace(/&(amp|lt|gt|quot|apos|nbsp|hellip|#39);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));

const clean = (s = "", max = 450) => {
  let t = decode(
    String(s || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
  if (t.length > max) t = t.slice(0, max).trim() + "…";
  return t || "No description available.";
};

const stars = (score10) => {
  if (!score10) return "N/A";
  const full = Math.round(score10 / 2);
  return "★".repeat(full) + "☆".repeat(5 - full) + ` ${(score10).toFixed(1)}/10`;
};

const anilist = async (query, variables) => {
  const { data } = await http.post("https://graphql.anilist.co", { query, variables });
  return data?.data;
};

const jikan = async (path) => (await http.get(`https://api.jikan.moe/v4${path}`)).data;

const sendCard = (message, image, caption) =>
  image
    ? message.send({ image: { url: image }, caption })
    : message.send(caption);

const guard = (fn) => async (message, match) => {
  try {
    await fn(message, (match || "").trim());
  } catch (e) {
    const status = e?.response?.status;
    await message.send(
      status === 429
        ? "⏳ API is rate-limited, try again in a few seconds."
        : "❌ Something went wrong, try again later."
    );
    console.error("[anime plugin]", e?.message);
  }
};

const line = "━━━━━━━━━━━━━━━";

// ───────────── anime (AniList) ─────────────
Module({
  command: "anime",
  package: "anime",
  description: "Search anime info (AniList)",
})(
  guard(async (message, match) => {
    if (!match) return message.send("📺 Usage: *anime <name>*");
    const d = await anilist(
      `query ($s: String) {
        Media(search: $s, type: ANIME, sort: SEARCH_MATCH) {
          title { romaji english native }
          format episodes duration status season seasonYear
          genres averageScore studios(isMain: true) { nodes { name } }
          description(asHtml: false) siteUrl coverImage { extraLarge }
        }
      }`,
      { s: match }
    );
    const a = d?.Media;
    if (!a) return message.send("❌ Anime not found.");
    const caption =
      `🎌 *${a.title.romaji || a.title.english}*\n` +
      (a.title.english && a.title.english !== a.title.romaji ? `_${a.title.english}_\n` : "") +
      `${line}\n` +
      `📺 Format: ${a.format || "?"}\n` +
      `🎞 Episodes: ${a.episodes || "?"} (${a.duration || "?"} min)\n` +
      `📡 Status: ${a.status}\n` +
      `📅 Season: ${a.season || "?"} ${a.seasonYear || ""}\n` +
      `🏢 Studio: ${a.studios.nodes.map((s) => s.name).join(", ") || "?"}\n` +
      `⭐ Score: ${a.averageScore ? (a.averageScore / 10).toFixed(1) + "/10" : "N/A"}\n` +
      `🎭 Genres: ${a.genres.join(", ") || "?"}\n${line}\n` +
      `${clean(a.description)}\n\n🔗 ${a.siteUrl}`;
    await sendCard(message, a.coverImage.extraLarge, caption);
  })
);

// ───────────── manga (AniList) ─────────────
Module({
  command: "manga",
  package: "anime",
  description: "Search manga info (AniList)",
})(
  guard(async (message, match) => {
    if (!match) return message.send("📖 Usage: *manga <name>*");
    const d = await anilist(
      `query ($s: String) {
        Media(search: $s, type: MANGA, sort: SEARCH_MATCH) {
          title { romaji english }
          format chapters volumes status genres averageScore
          description(asHtml: false) siteUrl coverImage { extraLarge }
        }
      }`,
      { s: match }
    );
    const m = d?.Media;
    if (!m) return message.send("❌ Manga not found.");
    const caption =
      `📖 *${m.title.romaji || m.title.english}*\n${line}\n` +
      `📚 Format: ${m.format || "?"}\n` +
      `🔖 Chapters: ${m.chapters || "?"} | Volumes: ${m.volumes || "?"}\n` +
      `📡 Status: ${m.status}\n` +
      `⭐ Score: ${m.averageScore ? (m.averageScore / 10).toFixed(1) + "/10" : "N/A"}\n` +
      `🎭 Genres: ${m.genres.join(", ") || "?"}\n${line}\n` +
      `${clean(m.description)}\n\n🔗 ${m.siteUrl}`;
    await sendCard(message, m.coverImage.extraLarge, caption);
  })
);

// ───────────── character (AniList) ─────────────
Module({
  command: "character",
  package: "anime",
  description: "Search anime character info (AniList)",
})(
  guard(async (message, match) => {
    if (!match) return message.send("👤 Usage: *character <name>*");
    const d = await anilist(
      `query ($s: String) {
        Character(search: $s) {
          name { full native } gender age favourites
          description(asHtml: false) siteUrl image { large }
          media(perPage: 3, sort: POPULARITY_DESC) { nodes { title { romaji } } }
        }
      }`,
      { s: match }
    );
    const c = d?.Character;
    if (!c) return message.send("❌ Character not found.");
    const caption =
      `👤 *${c.name.full}* ${c.name.native ? `(${c.name.native})` : ""}\n${line}\n` +
      `⚧ Gender: ${c.gender || "?"} | 🎂 Age: ${c.age || "?"}\n` +
      `❤️ Favourites: ${c.favourites ?? "?"}\n` +
      `🎬 Appears in: ${c.media.nodes.map((n) => n.title.romaji).join(", ") || "N/A"}\n${line}\n` +
      `${clean(c.description, 400)}\n\n🔗 ${c.siteUrl}`;
    await sendCard(message, c.image.large, caption);
  })
);

// ───────────── top anime (Jikan / MyAnimeList) ─────────────
Module({
  command: "topanime",
  package: "anime",
  description: "Top 10 anime on MyAnimeList",
})(
  guard(async (message) => {
    const { data } = await jikan("/top/anime?limit=10");
    const list = data
      .map((a, i) => `*${i + 1}.* ${a.title}\n     ⭐ ${a.score ?? "?"} • 🎞 ${a.episodes ?? "?"} eps`)
      .join("\n");
    await message.send(`🏆 *Top 10 Anime*\n${line}\n${list}`);
  })
);

// ───────────── currently airing (Jikan) ─────────────
Module({
  command: "airing",
  package: "anime",
  description: "Popular anime airing this season",
})(
  guard(async (message) => {
    const { data } = await jikan("/seasons/now?limit=10&sfw=true");
    const list = data
      .map((a, i) => `*${i + 1}.* ${a.title}\n     ⭐ ${a.score ?? "?"} • 📺 ${a.type || "?"}`)
      .join("\n");
    await message.send(`📡 *Airing This Season*\n${line}\n${list}`);
  })
);

// ───────────── schedule (Jikan) ─────────────
Module({
  command: "schedule",
  package: "anime",
  description: "Anime airing on a day (schedule monday)",
})(
  guard(async (message, match) => {
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    let day = (match || "").toLowerCase();
    if (!days.includes(day)) day = days[(new Date().getDay() + 6) % 7];
    const { data } = await jikan(`/schedules?filter=${day}&limit=12&sfw=true`);
    if (!data.length) return message.send("❌ Nothing found.");
    const list = data
      .map((a) => `• ${a.title}${a.broadcast?.time ? ` — ${a.broadcast.time} JST` : ""}`)
      .join("\n");
    await message.send(
      `🗓 *Schedule: ${day[0].toUpperCase() + day.slice(1)}*\n${line}\n${list}`
    );
  })
);

// ───────────── random anime (Jikan) ─────────────
Module({
  command: "randomanime",
  package: "anime",
  description: "Get a random anime suggestion",
})(
  guard(async (message) => {
    const { data: a } = await jikan("/random/anime?sfw=true");
    const caption =
      `🎲 *${a.title}*\n${line}\n` +
      `📺 ${a.type || "?"} • 🎞 ${a.episodes ?? "?"} eps • ${a.status}\n` +
      `⭐ ${stars(a.score)}\n` +
      `🎭 ${a.genres.map((g) => g.name).join(", ") || "?"}\n${line}\n` +
      `${clean(a.synopsis, 400)}\n\n🔗 ${a.url}`;
    await sendCard(message, a.images?.jpg?.large_image_url, caption);
  })
);

// ───────────── quotes (AnimeChan) ─────────────
Module({
  command: "animequote",
  package: "anime",
  description: "Random anime quote",
})(
  guard(async (message) => {
    const { data } = (await http.get("https://api.animechan.io/v1/quotes/random")).data;
    await message.send(
      `💬 _"${data.content}"_\n\n— *${data.character.name}*\n📺 ${data.anime.name}`
    );
  })
);

Module({
  command: "neko",
  package: "anime",
  description: "Random neko image (SFW)",
})(
  guard(async (message) => {
    const { data } = await http.get("https://nekos.best/api/v2/neko");
    const r = data.results[0];
    await message.send({
      image: { url: r.url },
      caption: `🐱 Neko\n🎨 Artist: ${r.artist_name || "Unknown"}`,
    });
  })
);
