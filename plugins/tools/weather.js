import { Module } from "../../lib/plugins.js";
import axios from "axios";

const DEFAULT_CITY = "Johannesburg";
const line = "━━━━━━━━━━━━━━━━━━";

// wttr.in weather code → emoji
const ICONS = [
  [[113], "☀️"],
  [[116], "⛅"],
  [[119, 122], "☁️"],
  [[143, 248, 260], "🌫️"],
  [[176, 263, 266, 293, 296, 299, 302, 305, 308, 353, 356, 359], "🌧️"],
  [[179, 182, 185, 227, 230, 281, 284, 311, 314, 317, 320, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377], "❄️"],
  [[200, 386, 389, 392, 395], "⛈️"],
];
const iconFor = (code) =>
  ICONS.find(([codes]) => codes.includes(Number(code)))?.[1] || "🌡️";

const dayName = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });

const uvLabel = (uv) => {
  uv = Number(uv);
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very high";
  return "Extreme";
};

Module({
  command: "weather",
  aliases: ["wttr", "forecast"],
  package: "info",
  description: "Weather forecast for any city",
})(async (message, match) => {
  const city = (match || "").trim() || DEFAULT_CITY;

  try {
    await message.react("🌤️");

    const { data } = await axios.get(
      `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
      { timeout: 20_000, headers: { "User-Agent": "Mozilla/5.0" } },
    );

    const cur = data?.current_condition?.[0];
    const area = data?.nearest_area?.[0];
    if (!cur || !area) {
      await message.react("❌");
      return message.send(`❌ City not found: *${city}*`);
    }

    const place = area.areaName?.[0]?.value || city;
    const country = area.country?.[0]?.value || "";
    const desc = cur.weatherDesc?.[0]?.value || "Unknown";
    const today = data.weather?.[0];
    const astro = today?.astronomy?.[0];

    let text =
      `╭━━〔 *WEATHER* 〕━━⬣\n` +
      `┃ 📍 *${place}${country ? ", " + country : ""}*\n` +
      `╰${line}⬣\n\n` +
      `${iconFor(cur.weatherCode)} *${desc}*\n` +
      `🌡️ *${cur.temp_C}°C* (feels like ${cur.FeelsLikeC}°C)\n\n` +
      `💧 Humidity: ${cur.humidity}%\n` +
      `💨 Wind: ${cur.windspeedKmph} km/h ${cur.winddir16Point}\n` +
      `☁️ Cloud cover: ${cur.cloudcover}%\n` +
      `🌧️ Rain: ${cur.precipMM} mm\n` +
      `👁️ Visibility: ${cur.visibility} km\n` +
      `🧭 Pressure: ${cur.pressure} hPa\n` +
      `🕶️ UV index: ${cur.uvIndex} (${uvLabel(cur.uvIndex)})\n`;

    if (astro) {
      text += `\n🌅 Sunrise: ${astro.sunrise}\n🌇 Sunset: ${astro.sunset}\n`;
    }

    text += `\n*📅 3-Day Forecast*\n${line}\n`;
    for (const d of data.weather || []) {
      const midday = d.hourly?.[4] || d.hourly?.[0];
      const rain = Math.max(...(d.hourly || []).map((h) => Number(h.chanceofrain || 0)), 0);
      text +=
        `${iconFor(midday?.weatherCode)} *${dayName(d.date)}*  ` +
        `${d.mintempC}° → ${d.maxtempC}°C  •  🌧️ ${rain}%\n`;
    }

    text += `\n> _Source: wttr.in_`;
    await message.send(text);
    await message.react("✅");
  } catch (err) {
    console.error("[weather] error:", err.message);
    await message.react("❌");
    await message.send(
      "❌ Could not fetch the weather. Check the city name or try again later.",
    );
  }
});
