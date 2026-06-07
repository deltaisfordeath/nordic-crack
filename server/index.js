require("dotenv").config();

const http = require("http");
const dgram = require("dgram");
const fs = require("fs");
const path = require("path");
const { WebSocketServer, WebSocket } = require("ws");

const PORT = process.env.PORT || 3001;
const UDP_PORT_1 = parseInt(process.env.UDP_PORT_1 || "8002", 10);
const UDP_PORT_2 = parseInt(process.env.UDP_PORT_2 || "8003", 10);
const SIMULATE = process.env.SIMULATE === "true";
const LOGS_DIR = path.join(__dirname, "logs");

if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

const sessionTs = new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "");
const currentLogPath = path.join(LOGS_DIR, `telemetry-${sessionTs}.jsonl`);
const logStream = fs.createWriteStream(currentLogPath, { flags: "a" });
console.log(`[log] writing to ${currentLogPath}`);

// Replay state
let replayTimeouts = [];
let isReplaying = false;

function makeState() {
  return { speed: null, incline: null, heartRate: null, distance: 0, elapsed: 0, calories: null };
}

const treadmills = {
  1: { state: makeState(), lastTickMs: null, lastRaw: "", lastRawTime: 0 },
  2: { state: makeState(), lastTickMs: null, lastRaw: "", lastRawTime: 0 },
};

function tickDistance(t) {
  const now = Date.now();
  if (t.lastTickMs !== null && t.state.speed !== null && t.state.speed > 0) {
    const dtHours = (now - t.lastTickMs) / 3600000;
    t.state.distance = +(t.state.distance + t.state.speed * dtHours).toFixed(3);
    t.state.elapsed = Math.round(t.state.elapsed + (now - t.lastTickMs) / 1000);
  }
  t.lastTickMs = now;
}

function parseLogcatDatagram(raw, t) {
  const lines = raw.split("\n");
  let changed = false;

  for (const line of lines) {
    if (line.includes("Changed KPH") || line.includes("Changed Actual KPH")) {
      const kph = parseFloat(line.split(" ").pop());
      if (!isNaN(kph)) {
        tickDistance(t);
        t.state.speed = +(kph * 0.621371).toFixed(2);
        changed = true;
      }
    } else if (line.includes("Changed Grade")) {
      const grade = parseFloat(line.split(" ").pop());
      if (!isNaN(grade)) {
        t.state.incline = +grade.toFixed(1);
        changed = true;
      }
    } else if (line.includes("Changed Heart")) {
      const hr = parseInt(line.split(" ").pop(), 10);
      if (hr > 0 && hr < 250) {
        t.state.heartRate = hr;
        changed = true;
      }
    } else if (line.includes("Changed Distance")) {
      const km = parseFloat(line.split(" ").pop());
      if (!isNaN(km) && km >= 0) {
        t.state.distance = +(km * 0.621371).toFixed(3);
        changed = true;
      }
    }
  }

  return changed;
}

// ── HTTP + WebSocket server ────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

const httpServer = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  const url = req.url.split("?")[0];

  if (req.method === "GET" && url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("nordic-crack relay running\n");
  }

  if (req.method === "GET" && url === "/logs") {
    const files = fs.readdirSync(LOGS_DIR)
      .filter((f) => f.endsWith(".jsonl"))
      .sort()
      .reverse();
    return sendJson(res, 200, { files });
  }

  if (req.method === "POST" && url === "/replay") {
    const body = await readBody(req);
    if (!body.file) return sendJson(res, 400, { error: "missing file" });
    const ok = startReplay(body.file);
    return sendJson(res, ok ? 200 : 404, ok ? { started: body.file } : { error: "file not found" });
  }

  if (req.method === "POST" && url === "/replay/stop") {
    stopReplay();
    return sendJson(res, 200, { stopped: true });
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("not found\n");
});

const wss = new WebSocketServer({ server: httpServer });

function broadcastMsg(obj) {
  const str = JSON.stringify(obj);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(str);
  }
}

function broadcast(treadmillId, data) {
  if (!isReplaying) {
    logStream.write(JSON.stringify({ ts: Date.now(), treadmill: treadmillId, data }) + "\n");
  }
  broadcastMsg({ type: "telemetry", treadmill: treadmillId, data });
}

wss.on("connection", (ws) => {
  console.log("[relay] client connected");
  for (const [id, t] of Object.entries(treadmills)) {
    ws.send(JSON.stringify({ type: "telemetry", treadmill: Number(id), data: { ...t.state } }));
  }
  // Inform new client of active replay
  if (isReplaying) {
    ws.send(JSON.stringify({ type: "replay_status", status: "started" }));
  }
  ws.on("close", () => console.log("[relay] client disconnected"));
});

httpServer.listen(PORT, () => {
  console.log(`[relay] listening on ws://localhost:${PORT}`);
});

// ── Replay ────────────────────────────────────────────────────────────────────

function stopReplay() {
  if (!isReplaying) return;
  replayTimeouts.forEach(clearTimeout);
  replayTimeouts = [];
  isReplaying = false;
  broadcastMsg({ type: "replay_status", status: "stopped" });
  console.log("[replay] stopped");
}

function startReplay(filename) {
  const filePath = path.join(LOGS_DIR, filename);
  if (!fs.existsSync(filePath)) return false;

  const lines = fs.readFileSync(filePath, "utf8").trim().split("\n").filter(Boolean);
  const entries = lines.map((l) => JSON.parse(l));
  if (entries.length === 0) return false;

  // Stop any current replay before starting a new one
  if (isReplaying) {
    replayTimeouts.forEach(clearTimeout);
    replayTimeouts = [];
    isReplaying = false;
  }

  isReplaying = true;
  const firstTs = entries[0].ts;

  broadcastMsg({ type: "replay_status", status: "started", file: filename, count: entries.length });
  console.log(`[replay] starting ${filename} (${entries.length} entries)`);

  entries.forEach((entry, i) => {
    const delay = entry.ts - firstTs;
    const t = setTimeout(() => {
      broadcastMsg({ type: "telemetry", treadmill: entry.treadmill, data: entry.data });
      if (i === entries.length - 1) {
        isReplaying = false;
        replayTimeouts = [];
        broadcastMsg({ type: "replay_status", status: "ended", file: filename });
        console.log("[replay] ended");
      }
    }, delay);
    replayTimeouts.push(t);
  });

  return true;
}

// ── UDP receivers ─────────────────────────────────────────────────────────────

function createUdpSocket(treadmillId, udpPort) {
  const t = treadmills[treadmillId];
  const sock = dgram.createSocket({ type: "udp4", reuseAddr: true });

  sock.on("message", (buf, rinfo) => {
    const raw = buf.toString("utf8");
    const now = Date.now();
    if (raw === t.lastRaw && now - t.lastRawTime < 100) return;
    t.lastRaw = raw;
    t.lastRawTime = now;

    console.log(`[udp:${treadmillId}] ${rinfo.address}:${rinfo.port} →`, raw.replace(/\n/g, " | ").slice(0, 200));

    const changed = parseLogcatDatagram(raw, t);
    if (changed) {
      broadcast(treadmillId, { ...t.state });
    }
  });

  sock.on("error", (err) => console.error(`[udp:${treadmillId}] error:`, err.message));

  sock.bind(udpPort, () => {
    console.log(`[udp:${treadmillId}] listening on 0.0.0.0:${udpPort}`);
  });
}

// ── Simulation ────────────────────────────────────────────────────────────────

function startSimulation() {
  [1, 2].forEach((id) => {
    const t = treadmills[id];
    let tick = 0;
    const offset = (id - 1) * 30;

    setInterval(() => {
      const now = Date.now();
      const dt = (now - (t.lastTickMs || now)) / 1000 / 3600;
      t.lastTickMs = now;
      tick += 1;

      const speed = +(7 + 5 * Math.sin((tick + offset) / 10)).toFixed(1);
      const incline = +(1.5 + 1.5 * Math.sin((tick + offset) / 20)).toFixed(1);
      const heartRate = Math.round(135 + 45 * Math.sin((tick + offset) / 15));
      t.state.distance = +(t.state.distance + speed * dt).toFixed(2);
      t.state.speed = speed;
      t.state.incline = incline;
      t.state.heartRate = heartRate;
      t.state.elapsed = tick;

      broadcast(id, { ...t.state });
    }, 1000);
  });
}

if (SIMULATE) {
  console.log("[sim] simulation mode — generating fake data for both treadmills");
  startSimulation();
} else {
  createUdpSocket(1, UDP_PORT_1);
  createUdpSocket(2, UDP_PORT_2);
}
