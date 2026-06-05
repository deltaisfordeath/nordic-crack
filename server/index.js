require("dotenv").config();

const http = require("http");
const dgram = require("dgram");
const { WebSocketServer, WebSocket } = require("ws");

const PORT = process.env.PORT || 3001;
const UDP_PORT_1 = parseInt(process.env.UDP_PORT_1 || "8002", 10);
const UDP_PORT_2 = parseInt(process.env.UDP_PORT_2 || "8003", 10);
const SIMULATE = process.env.SIMULATE === "true";

function makeState() {
  return {
    speed: null,
    incline: null,
    heartRate: null,
    distance: 0,
    elapsed: 0,
    calories: null,
  };
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

// ── WebSocket relay ───────────────────────────────────────────────────────────

const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("nordic-crack relay running\n");
});

const wss = new WebSocketServer({ server: httpServer });

function broadcast(treadmillId, data) {
  const msg = JSON.stringify({ type: "telemetry", treadmill: treadmillId, data });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  }
}

wss.on("connection", (ws) => {
  console.log("[relay] client connected");
  // Send current state for both treadmills immediately on connect
  for (const [id, t] of Object.entries(treadmills)) {
    ws.send(JSON.stringify({ type: "telemetry", treadmill: Number(id), data: { ...t.state } }));
  }
  ws.on("close", () => console.log("[relay] client disconnected"));
});

httpServer.listen(PORT, () => {
  console.log(`[relay] listening on ws://localhost:${PORT}`);
});

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
    const offset = (id - 1) * 30; // stagger the two simulated treadmills

    setInterval(() => {
      const now = Date.now();
      const dt = (now - (t.lastTickMs || now)) / 1000 / 3600;
      t.lastTickMs = now;
      tick += 1;

      const speed = +(3 + 2 * Math.sin((tick + offset) / 30)).toFixed(1);
      const incline = +(1.5 + 1.5 * Math.sin((tick + offset) / 60)).toFixed(1);
      const heartRate = Math.round(130 + 20 * Math.sin((tick + offset) / 45));
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
