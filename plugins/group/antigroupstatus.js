// plugins/group/antigroupstatus.js
// Anti "group status mention": when a member posts a status that tags this group,
// WhatsApp drops a "this group was mentioned in a status" notice into the chat.
// This plugin removes that notice and punishes the sender (delete / warn / kick).
import { Module } from "../../lib/plugins.js";
import { db } from "../../lib/client.js";
import { getTheme } from "../../Themes/themes.js";

const theme = getTheme();
const MODES = ["delete", "warn", "kick"];

const enabledKey = (g) => `antigroupstatus:${g}:enabled`;
const modeKey = (g) => `antigroupstatus:${g}:mode`;
const readMode = (bot, g) => {
  const m = String(db.get(bot, modeKey(g), "delete") || "delete").toLowerCase();
  return MODES.includes(m) ? m : "delete";
};

// The notice can be top-level or nested in a wrapper (ephemeral, viewOnce, protocol…),
// so walk the message tree instead of trusting one fixed path.
function isGroupStatusMention(node, depth = 0) {
  if (!node || typeof node !== "object" || depth > 6) return false;
  if (node.groupStatusMentionMessage || node.statusMentionMessage) return true;
  const proto = node.protocolMessage;
  if (proto) {
    const t = proto.type;
    if (t === 25 || t === "STATUS_MENTION_MESSAGE") return true;
  }
  for (const k of Object.keys(node)) {
    if (k === "contextInfo" || k === "messageContextInfo") continue;
    const v = node[k];
    if (v && typeof v === "object" && isGroupStatusMention(v, depth + 1))
      return true;
  }
  return false;
}

// ---------- Command ----------
Module({
  command: "antigroupstatus",
  aliases: ["antigcstatus", "antistatusmention", "antigroupstatusmention"],
  package: "group",
  description:
    "Block group status mentions. .antigroupstatus on/off/delete/warn/kick",
})(async (message, match) => {
  try {
    if (!message.isGroup) return message.send(theme.isGroup);
    await message.loadGroupInfo?.();
    if (!message.isAdmin && !message.isfromMe)
      return message.send(theme.isAdmin);

    const bot = message.botnum;
    const g = message.from;
    const arg = (match || "").trim().toLowerCase();
    const enabled = db.get(bot, enabledKey(g), false) === true;

    if (!arg) {
      return message.send(
        `⚙️ *Anti Group Status Mention*\n• Status: ${enabled ? "✅ ON" : "❌ OFF"}\n• Mode: ${readMode(bot, g).toUpperCase()}\n\n` +
          `.antigroupstatus on\n.antigroupstatus off\n.antigroupstatus delete  _(only remove notice)_\n.antigroupstatus warn  _(remove + warn)_\n.antigroupstatus kick  _(remove + kick)_`,
      );
    }

    if (arg === "on") {
      if (enabled) return message.send("ℹ️ Already *ON* for this group.");
      db.setHot(bot, enabledKey(g), true);
      return message.send(
        `✅ Anti Group Status Mention *ENABLED*. Mode: *${readMode(bot, g).toUpperCase()}*\n_Bot must be admin to delete/kick._`,
      );
    }

    if (arg === "off") {
      if (!enabled) return message.send("ℹ️ Already *OFF* for this group.");
      db.setHot(bot, enabledKey(g), false);
      return message.send("✅ Anti Group Status Mention *DISABLED*.");
    }

    if (MODES.includes(arg)) {
      db.setHot(bot, modeKey(g), arg);
      db.setHot(bot, enabledKey(g), true);
      return message.send(
        `✅ Mode set to *${arg.toUpperCase()}* and feature is *ON*.`,
      );
    }

    return message.send("Usage: .antigroupstatus on | off | delete | warn | kick");
  } catch (err) {
    console.error("[antigroupstatus][command]", err);
    return message.send("❌ Something went wrong.");
  }
});

// ---------- Enforcement ----------
Module({
  on: "message",
  name: "antigroupstatus-enforce",
})(async (message) => {
  try {
    if (!message?.isGroup) return;
    const raw = message.raw?.message ?? message.raw;
    if (!isGroupStatusMention(raw)) return;

    const bot = message.botnum;
    const g = message.from;
    if (db.get(bot, enabledKey(g), false) !== true) return;

    await message.loadGroupInfo?.().catch(() => {});
    if (!message.isBotAdmin) return;
    if (message.isAdmin || message.isFromMe || message.isfromMe) return;

    const mode = readMode(bot, g);
    const sender = message.sender;
    const num = String(sender || "").split("@")[0];
    const mentions = sender ? [sender] : [];

    // 1) remove the notice
    await message.conn
      .sendMessage(g, { delete: message.key })
      .catch((e) => console.error("[antigroupstatus] delete failed:", e?.message));

    if (mode === "delete") return;

    if (mode === "warn") {
      return message.send(
        `⚠️ @${num}, mentioning this group in your status is not allowed here.`,
        { mentions },
      );
    }

    // kick
    await message
      .send(`🚫 @${num} mentioned this group in a status and is being removed.`, { mentions })
      .catch(() => {});
    await new Promise((r) => setTimeout(r, 600));
    try {
      if (typeof message.removeParticipant === "function")
        await message.removeParticipant([sender]);
      else await message.conn.groupParticipantsUpdate(g, [sender], "remove");
    } catch (e) {
      console.error("[antigroupstatus] kick failed:", e?.message);
      await message
        .send(`❌ Could not remove @${num}. Please remove manually.`, { mentions })
        .catch(() => {});
    }
  } catch (err) {
    console.error("[antigroupstatus] enforce error:", err);
  }
});
