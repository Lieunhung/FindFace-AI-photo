// FindFace-AI - bo giam sat (Node): bat va giu song face service, web, worker, tunnel; sao luu CSDL moi ngay.
// Chay: node ff-giam-sat.mjs  (tu tach ra chay ngam; dung --foreground de xem log truc tiep)
// Nhat ky: logs/giam-sat.log. Bien moi truong FF_KHONG_TUNNEL=1 de chay khong tunnel.
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const LOGS = path.join(ROOT, "logs");
fs.mkdirSync(LOGS, { recursive: true });
const LOG_FILE = path.join(LOGS, "giam-sat.log");

// Tach khoi cua so goi (Task Scheduler / bat) de chay ngam
if (!process.argv.includes("--child") && !process.argv.includes("--foreground")) {
  spawn(process.execPath, [fileURLToPath(import.meta.url), "--child"], {
    detached: true, stdio: "ignore", windowsHide: true, cwd: ROOT, env: process.env,
  }).unref();
  process.exit(0);
}

function ghi(msg) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const dong = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} ${msg}\n`;
  try {
    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > 2 * 1024 * 1024) fs.renameSync(LOG_FILE, LOG_FILE + ".cu");
    fs.appendFileSync(LOG_FILE, dong);
  } catch { /* khong de loi ghi log lam chet bo giam sat */ }
  if (process.argv.includes("--foreground")) process.stdout.write(dong);
}

// Chi MOT bo giam sat: chiem mot cong cuc bo; cong da bi chiem thi thoat
const khoa = net.createServer();
khoa.on("error", () => process.exit(0));
khoa.listen(47321, "127.0.0.1", () => chay().catch((e) => ghi(`LOI NGHIEM TRONG: ${e?.stack ?? e}`)));

const NGU = (ms) => new Promise((r) => setTimeout(r, ms));

function dietCay(pid) {
  if (!pid) return;
  try { execFileSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" }); } catch { /* da chet */ }
}

function pidTheoCong(port) {
  try {
    const out = execFileSync("netstat.exe", ["-ano", "-p", "tcp"], { encoding: "utf8" });
    const pids = new Set();
    for (const l of out.split(/\r?\n/)) {
      if (!/LISTENING/i.test(l)) continue;
      const cot = l.trim().split(/\s+/);
      if (cot[1]?.endsWith(`:${port}`)) pids.add(cot[4]);
    }
    return [...pids];
  } catch { return []; }
}
const dietTheoCong = (port) => pidTheoCong(port).forEach(dietCay);

async function song(url) {
  // Song = co tra loi HTTP bat ky (ke ca 503 cua /api/suc-khoe khi mot phan khac dang chet)
  try { await fetch(url, { signal: AbortSignal.timeout(8000) }); return true; } catch { return false; }
}

function pidConSong(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function docEnv(file) {
  const kq = {};
  try {
    for (const l of fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
      const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) kq[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* khong co .env */ }
  return kq;
}

const tokenFile = path.join(ROOT, "TUNNEL-TOKEN.txt");
const dv = [
  { ten: "face", url: "http://127.0.0.1:8100/suc-khoe", cong: 8100,
    exe: path.join(ROOT, "apps", "dich-vu-khuon-mat", ".venv", "Scripts", "uvicorn.exe"),
    args: ["main:app", "--host", "127.0.0.1", "--port", "8100"],
    cwd: path.join(ROOT, "apps", "dich-vu-khuon-mat") },
  { ten: "web", url: "http://127.0.0.1:3002/api/suc-khoe", cong: 3002,
    exe: "cmd.exe", args: ["/c", "pnpm --filter @anh/tim-anh start"], cwd: ROOT, env: { NODE_ENV: "production" } },
  { ten: "worker", url: null, cong: null,
    exe: "cmd.exe", args: ["/c", "pnpm --filter @anh/worker dev"], cwd: ROOT },
];
if (fs.existsSync(tokenFile) && !process.env.FF_KHONG_TUNNEL) {
  dv.push({ ten: "tunnel", url: null, cong: null, exe: path.join(ROOT, "cloudflared.exe"),
    args: ["tunnel", "--no-autoupdate", "run"], cwd: ROOT, token: true });
} else {
  ghi("Khong bat tunnel (khong co TUNNEL-TOKEN.txt hoac FF_KHONG_TUNNEL=1).");
}
for (const d of dv) { d.pid = null; d.hong = 0; d.lanKhoiDong = []; }

function khoiDong(d) {
  const rot = (f) => { try { if (fs.statSync(f).size > 5 * 1024 * 1024) fs.renameSync(f, f + ".cu"); } catch { /* chua co */ } };
  const out = path.join(LOGS, `${d.ten}.out.log`), err = path.join(LOGS, `${d.ten}.err.log`);
  rot(out); rot(err);
  const env = { ...process.env, ...(d.env ?? {}) };
  if (d.token) env.TUNNEL_TOKEN = fs.readFileSync(tokenFile, "utf8").trim();
  const con = spawn(d.exe, d.args, {
    cwd: d.cwd, env, windowsHide: true, stdio: ["ignore", fs.openSync(out, "a"), fs.openSync(err, "a")],
  });
  con.on("error", (e) => ghi(`${d.ten}: khong chay duoc (${e.message})`));
  // Task Scheduler mac dinh chay o uu tien Below Normal va tien trinh con ke thua -> cham gap ~3 lan
  try { os.setPriority(con.pid, os.constants.priority.PRIORITY_NORMAL); } catch { /* khong dat duoc thi thoi */ }
  d.pid = con.pid;
  d.hong = 0;
  d.thoat = false;
  con.on("exit", (ma) => { if (d.pid === con.pid) { d.thoat = true; ghi(`${d.ten} thoat (ma ${ma})`); } });
  // Chong vong lap khoi dong lien tuc: >5 lan trong 10 phut thi nghi 5 phut
  const nay = Date.now();
  d.lanKhoiDong = d.lanKhoiDong.filter((t) => nay - t < 600_000).concat(nay);
  ghi(`Khoi dong ${d.ten} (pid ${con.pid})`);
}

// ---- Sao luu CSDL moi ngay (giu 14 ban) ----
const PG_DUMP = "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe";
const THU_MUC_SAO_LUU = path.join(ROOT, "du-lieu", "sao-luu");
function saoLuuNeuCan() {
  try {
    fs.mkdirSync(THU_MUC_SAO_LUU, { recursive: true });
    const ban = fs.readdirSync(THU_MUC_SAO_LUU).filter((f) => f.endsWith(".dump")).sort();
    const moiNhat = ban.length ? fs.statSync(path.join(THU_MUC_SAO_LUU, ban[ban.length - 1])).mtimeMs : 0;
    if (Date.now() - moiNhat < 23 * 3600_000) return;
    const url = Object.values(docEnv(path.join(ROOT, "apps", "tim-anh", ".env"))).find((v) => v.startsWith("postgresql://"));
    if (!url || !fs.existsSync(PG_DUMP)) { ghi("Khong sao luu duoc: thieu DATABASE_URL hoac pg_dump"); return; }
    const u = new URL(url);
    const d = new Date(), p = (n) => String(n).padStart(2, "0");
    const dich = path.join(THU_MUC_SAO_LUU, `anh_khoa_hoc-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.dump`);
    execFileSync(PG_DUMP, ["-h", u.hostname, "-p", u.port || "5432", "-U", decodeURIComponent(u.username), "-Fc", "-f", dich, u.pathname.slice(1)],
      { env: { ...process.env, PGPASSWORD: decodeURIComponent(u.password) }, stdio: "ignore", timeout: 300_000 });
    ghi(`Sao luu CSDL xong: ${path.basename(dich)} (${Math.round(fs.statSync(dich).size / 1024)} KB)`);
    const tatCa = fs.readdirSync(THU_MUC_SAO_LUU).filter((f) => f.endsWith(".dump")).sort();
    for (const f of tatCa.slice(0, Math.max(0, tatCa.length - 14))) fs.unlinkSync(path.join(THU_MUC_SAO_LUU, f));
  } catch (e) { ghi(`Sao luu CSDL loi: ${e.message}`); }
}

async function chay() {
  ghi("=== Bo giam sat (Node) bat dau ===");
  try { os.setPriority(0, os.constants.priority.PRIORITY_NORMAL); } catch { /* bo qua */ }
  // Don tien trinh mo coi cua lan truoc
  for (const d of dv) if (d.cong && !(await song(d.url))) dietTheoCong(d.cong);
  try {
    execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
      `Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'cloudflared.exe' -and $_.ExecutablePath -like '${ROOT}*') -or ($_.Name -eq 'node.exe' -and $_.CommandLine -like '*FindFace-AI*' -and $_.CommandLine -like '*worker*') } | ForEach-Object { taskkill /PID $_.ProcessId /T /F | Out-Null }`],
      { stdio: "ignore", timeout: 30_000 });
  } catch { /* khong sao */ }

  for (let vong = 0; ; vong++) {
    if (vong % 10 === 0) {
      if (pidTheoCong(5432).length === 0) ghi("CANH BAO: PostgreSQL (5432) khong chay - web va worker se loi cho den khi bat lai.");
    }
    if (vong % 180 === 0) saoLuuNeuCan(); // ~moi gio kiem tra, chi lam khi ban gan nhat > 23 gio

    for (const d of dv) {
      try {
        if (d.lanKhoiDong.length >= 5 && Date.now() - d.lanKhoiDong[d.lanKhoiDong.length - 1] < 300_000) continue; // dang nghi
        if (d.url) {
          if (await song(d.url)) { d.hong = 0; continue; }
          if (!d.pid || d.thoat || !pidConSong(d.pid)) { dietTheoCong(d.cong); khoiDong(d); continue; }
          if (++d.hong >= 3) {
            ghi(`${d.ten} khong tra loi ${d.hong} nhip - khoi dong lai`);
            dietCay(d.pid); dietTheoCong(d.cong);
            await NGU(2000);
            khoiDong(d);
          }
        } else if (!d.pid || d.thoat || !pidConSong(d.pid)) {
          ghi(`${d.ten} khong chay - khoi dong`);
          khoiDong(d);
        }
      } catch (e) { ghi(`Loi khi kiem tra ${d.ten}: ${e.message}`); }
    }
    await NGU(20_000);
  }
}
