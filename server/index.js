require("dotenv").config();

const http = require("http");
const dgram = require("dgram");
const { WebSocketServer, WebSocket } = require("ws");

const PORT = process.env.PORT || 3001;
const UDP_PORT = parseInt(process.env.UDP_PORT || "8002", 10);
const SIMULATE = process.env.SIMULATE === "true";

// State accumulates across datagrams (not all metrics arrive in every packet)
const state = {
  speed: null,
  incline: null,
  heartRate: null,
  distance: 0,   // set from machine telemetry when available, else calculated from speed × time
  elapsed: 0,
  calories: null,
};

// Distance / elapsed time tracking
let lastTickMs = null;

function tickDistance() {
  const now = Date.now();
  if (lastTickMs !== null && state.speed !== null && state.speed > 0) {
    const dtHours = (now - lastTickMs) / 3600000;
    state.distance = +(state.distance + state.speed * dtHours).toFixed(3);
    state.elapsed = Math.round(state.elapsed + (now - lastTickMs) / 1000);
  }
  lastTickMs = now;
}

function parseLogcatDatagram(raw) {
  const lines = raw.split("\n");
  let changed = false;

  for (const line of lines) {
    if (line.includes("Changed KPH") || line.includes("Changed Actual KPH")) {
      const kph = parseFloat(line.split(" ").pop());
      if (!isNaN(kph)) {
        tickDistance();
        state.speed = +(kph * 0.621371).toFixed(2);
        changed = true;
      }
    } else if (line.includes("Changed Grade")) {
      const grade = parseFloat(line.split(" ").pop());
      if (!isNaN(grade)) {
        state.incline = +grade.toFixed(1);
        changed = true;
      }
    } else if (line.includes("Changed Heart")) {
      const hr = parseInt(line.split(" ").pop(), 10);
      if (hr > 0 && hr < 250) {
        state.heartRate = hr;
        changed = true;
      }
    } else if (line.includes("Changed Distance")) {
      const km = parseFloat(line.split(" ").pop());
      if (!isNaN(km) && km >= 0) {
        state.distance = +(km * 0.621371).toFixed(3);
        changed = true;
      }
    }
  }

  return changed;
}

// ── WebSocket relay for the React client ──────────────────────────────────────

const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("noric-crack relay running\n");
});

const wss = new WebSocketServer({ server: httpServer });

function broadcast(payload) {
  const msg = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  }
}

wss.on("connection", (ws) => {
  console.log("[relay] client connected");
  ws.on("close", () => console.log("[relay] client disconnected"));
});

httpServer.listen(PORT, () => {
  console.log(`[relay] listening on ws://localhost:${PORT}`);
});

// ── UDP receiver ──────────────────────────────────────────────────────────────

if (SIMULATE) {
  console.log("[sim] simulation mode — generating fake treadmill data");
  startSimulation();
} else {
  const sock = dgram.createSocket({ type: "udp4", reuseAddr: true });

  let lastRaw = "";
  let lastRawTime = 0;

  sock.on("message", (buf, rinfo) => {
    const raw = buf.toString("utf8");

    // QZ sends each datagram twice (broadcast + unicast) — deduplicate within 100 ms
    const now = Date.now();
    if (raw === lastRaw && now - lastRawTime < 100) return;
    lastRaw = raw;
    lastRawTime = now;

    console.log(`[udp] ${rinfo.address}:${rinfo.port} →`, raw.replace(/\n/g, " | ").slice(0, 200));

    const changed = parseLogcatDatagram(raw);
    if (changed) {
      broadcast({ type: "telemetry", data: { ...state } });
    }
  });

  sock.on("error", (err) => console.error("[udp] error:", err.message));

  sock.bind(UDP_PORT, () => {
    console.log(`[udp] listening on 0.0.0.0:${UDP_PORT}`);
    console.log(`[udp] → QZ Companion should send to this machine on port ${UDP_PORT}`);
  });
}

// ── Simulation ────────────────────────────────────────────────────────────────

function startSimulation() {
  let t = 0;
  let distance = 0;
  let lastTick = Date.now();

  setInterval(() => {
    const now = Date.now();
    const dt = (now - lastTick) / 1000 / 3600;
    lastTick = now;

    t += 1;
    const speed = +(3 + 2 * Math.sin(t / 30)).toFixed(1);
    const incline = +(1.5 + 1.5 * Math.sin(t / 60)).toFixed(1);
    const heartRate = Math.round(130 + 20 * Math.sin(t / 45));
    distance += speed * dt;

    broadcast({
      type: "telemetry",
      data: { speed, incline, heartRate, distance: +distance.toFixed(2), elapsed: t, calories: null },
    });
  }, 1000);
}
