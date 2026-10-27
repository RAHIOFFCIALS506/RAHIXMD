import webp from "node-webpmux";
import fs from "node:fs";
import ffmpeg from "fluent-ffmpeg";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";

// ════════════

const canRun = (bin) => {
  try {
    execFileSync(bin, ["-version"], { stdio: "ignore", timeout: 8000 });
    return true;
  } catch {
    return false;
  }
};

async function resolveFfmpeg() {
  const envPath = process.env.FFMPEG_PATH;
  if (envPath && canRun(envPath)) return envPath;

  if (canRun("ffmpeg")) return "ffmpeg";

  for (const pkg of ["@ffmpeg-installer/ffmpeg", "ffmpeg-static"]) {
    try {
      const mod = await import(pkg);
      const p = mod.default?.path || mod.default || mod.path;
      if (typeof p === "string" && canRun(p)) return p;
    } catch {
      // package missing or "Unsupported platform/architecture" → try the next
    }
  }
  return null;
}

const FFMPEG_PATH = await resolveFfmpeg();
if (FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(FFMPEG_PATH);
  console.log(`[sticker] ffmpeg: ${FFMPEG_PATH}`);
} else {
  console.warn(
    "[sticker] ffmpeg NOT found. Install it:\n" +
      "  Termux : pkg install ffmpeg\n" +
      "  Ubuntu : sudo apt install ffmpeg\n" +
      "  or set FFMPEG_PATH=/path/to/ffmpeg",
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  SETTINGS
// ═════════════════════════════════════════════════════════════════════════════

const STICKER_SIZE = 512; // WhatsApp standard
const MAX_ANIMATED_BYTES = 500 * 1024; // WhatsApp animated sticker limit
const MAX_SECONDS = 6;

// Tried in order until the animated sticker fits under the size limit
const ANIMATED_PRESETS = [
  { size: 512, fps: 15, quality: 50 },
  { size: 512, fps: 12, quality: 35 },
  { size: 384, fps: 10, quality: 25 },
  { size: 320, fps: 8, quality: 15 },
];

const fitFilter = (size, mode) =>
  mode === "contain"
    ? `scale=${size}:${size}:force_original_aspect_ratio=decrease,` +
      `pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba`
    : `scale=${size}:${size}:force_original_aspect_ratio=increase,crop=${size}:${size}`;

// ═════════════════════════════════════════════════════════════════════════════
//  STICKER BUILDER
// ═════════════════════════════════════════════════════════════════════════════

class StickerBuilder {
  constructor() {
    this.tmp = tmpdir();
    fs.mkdirSync(this.tmp, { recursive: true });
  }

  get ffmpegPath() {
    return FFMPEG_PATH;
  }

  isReady() {
    return Boolean(FFMPEG_PATH);
  }

  _tmp(ext) {
    return path.join(
      this.tmp,
      `${crypto.randomBytes(6).toString("hex")}.${ext}`,
    );
  }

  _ensureFfmpeg() {
    if (!FFMPEG_PATH) {
      throw new Error(
        "ffmpeg not installed. Termux: `pkg install ffmpeg` | Linux: `sudo apt install ffmpeg`",
      );
    }
  }

  async _convert(input, output, configure) {
    this._ensureFfmpeg();
    await new Promise((resolve, reject) => {
      configure(ffmpeg(input))
        .on("error", (err) => reject(new Error(`ffmpeg: ${err.message}`)))
        .on("end", resolve)
        .save(output);
    });
    return fs.readFileSync(output);
  }

  // Runs fn, then deletes every temp file no matter what happened
  async _withTempFiles(files, fn) {
    try {
      return await fn();
    } finally {
      for (const file of files) {
        try {
          fs.unlinkSync(file);
        } catch {}
      }
    }
  }

  // ─── image / video → WebP sticker ──────────────────────────────────────────
  // options.fit: "crop" (default, fills the square) | "contain" (keeps full image)
  async toSticker(type, media, exif = null, options = {}) {
    const fit = options.fit === "contain" ? "contain" : "crop";
    const isImage = type === "image";
    const input = this._tmp(isImage ? "img" : "vid");
    fs.writeFileSync(input, media);

    const outputs = [];
    try {
      let buffer;

      if (isImage) {
        const output = this._tmp("webp");
        outputs.push(output);
        buffer = await this._convert(input, output, (cmd) =>
          cmd
            .addOutputOptions([
              "-vcodec", "libwebp",
              "-vf", fitFilter(STICKER_SIZE, fit),
              "-quality", "80",
              "-compression_level", "6",
            ])
            .toFormat("webp"),
        );
      } else {
        // animated: lower quality step by step until it fits 500 KB
        for (const p of ANIMATED_PRESETS) {
          const output = this._tmp("webp");
          outputs.push(output);
          buffer = await this._convert(input, output, (cmd) =>
            cmd
              .addOutputOptions([
                "-vcodec", "libwebp",
                "-vf", `${fitFilter(p.size, fit)},fps=${p.fps}`,
                "-loop", "0",
                "-t", String(options.maxSeconds || MAX_SECONDS),
                "-an",
                "-quality", String(p.quality),
                "-compression_level", "6",
                "-preset", "default",
              ])
              .toFormat("webp"),
          );
          if (buffer.length <= MAX_ANIMATED_BYTES) break;
        }
      }

      return exif ? await this.addExif(buffer, exif) : buffer;
    } finally {
      for (const f of [input, ...outputs]) {
        try {
          fs.unlinkSync(f);
        } catch {}
      }
    }
  }

  // ─── circle crop (PNG with transparent corners) ────────────────────────────
  async circleImage(media) {
    const input = this._tmp("img");
    const output = this._tmp("png");
    fs.writeFileSync(input, media);

    const mask =
      "format=yuva420p,geq=lum='p(X,Y)':cb='cb(X,Y)':cr='cr(X,Y)':" +
      "a='if(gt(pow(X-W/2,2)+pow(Y-H/2,2),pow(min(W,H)/2,2)),0,255)',format=rgba";

    return this._withTempFiles([input, output], () =>
      this._convert(input, output, (cmd) =>
        cmd
          .addOutputOptions(["-vf", `${fitFilter(STICKER_SIZE, "crop")},${mask}`])
          .toFormat("png"),
      ),
    );
  }

  async toCircleSticker(media, exif = null) {
    const circled = await this.circleImage(media);
    const input = this._tmp("png");
    const output = this._tmp("webp");
    fs.writeFileSync(input, circled);

    const buffer = await this._withTempFiles([input, output], () =>
      this._convert(input, output, (cmd) =>
        cmd
          .addOutputOptions([
            "-vcodec", "libwebp",
            "-vf", `scale=${STICKER_SIZE}:${STICKER_SIZE},format=rgba`,
            "-quality", "80",
            "-compression_level", "6",
          ])
          .toFormat("webp"),
      ),
    );

    return exif ? this.addExif(buffer, exif) : buffer;
  }

  // ─── EXIF (pack name / author) ─────────────────────────────────────────────
  async addExif(webpSticker, info = {}) {
    const img = new webp.Image();
    const { packname, author, categories } = info;
    const json = {
      "sticker-pack-id": info.packId || crypto.randomBytes(16).toString("hex"),
      "sticker-pack-name": packname || "",
      "sticker-pack-publisher": author || "",
      emojis: categories || ["💖"],
      "android-app-store-link": "https://github.com/nightx-rebel",
      "ios-app-store-link": "https://github.com/nightx-rebel",
    };

    const exifHeader = Buffer.from([
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
      0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
    ]);
    const jsonBuffer = Buffer.from(JSON.stringify(json), "utf8");
    const exif = Buffer.concat([exifHeader, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);

    await img.load(webpSticker);
    img.exif = exif;
    return img.save(null);
  }

  async getExif(sticker) {
    try {
      const img = new webp.Image();
      await img.load(sticker);
      const raw = img.exif?.slice(22).toString("utf8") || "";
      const json = JSON.parse(raw.slice(raw.indexOf("{")));
      return {
        packname: json["sticker-pack-name"] || "",
        author: json["sticker-pack-publisher"] || "",
      };
    } catch {
      return { packname: "", author: "" };
    }
  }

  // ─── WebP sticker → MP4 ────────────────────────────────────────────────────
  async toVideo(webpBuffer) {
    const input = this._tmp("webp");
    const output = this._tmp("mp4");
    fs.writeFileSync(input, webpBuffer);

    return this._withTempFiles([input, output], () =>
      this._convert(input, output, (cmd) =>
        cmd
          .outputOptions([
            "-movflags", "faststart",
            "-pix_fmt", "yuv420p",
            "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", // even size required
          ])
          .toFormat("mp4"),
      ),
    );
  }
}

const stickerBuilder = new StickerBuilder();

export default stickerBuilder;
export { StickerBuilder };
