import os from "node:os";
import { exec } from "node:child_process";

export function getSystemInfo() {
  return {
    hostname: os.hostname(),
    username: os.userInfo().username,
    platform: `${os.platform()} ${os.release()} ${os.arch()}`,
    cpu: os.cpus()[0]?.model,
    cores: os.cpus().length,
    ram_mb: Math.round(os.totalmem() / 1024 / 1024),
    home: os.homedir(),
    uptime_min: Math.round(os.uptime() / 60),
  };
}

export function getPublicIP() {
  return new Promise((resolve) => {
    exec("curl -s https://api.ipify.org?format=json || wget -qO- https://api.ipify.org?format=json",
      (err, stdout) => {
        if (err) return resolve({ ip: "unknown" });
        try { resolve(JSON.parse(stdout)); }
        catch { resolve({ ip: stdout.trim() }); }
      });
  });
}
