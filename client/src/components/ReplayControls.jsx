import React, { useEffect, useRef, useState } from "react";

const SERVER_HTTP = "http://localhost:3001";
const SERVER_WS = "ws://localhost:3001";

export function ReplayControls() {
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState(null); // null | "started" | "ended" | "stopped"
  const [activeFile, setActiveFile] = useState("");
  const wsRef = useRef(null);

  // Listen for replay_status messages over a dedicated WS connection
  useEffect(() => {
    function connect() {
      const ws = new WebSocket(SERVER_WS);
      wsRef.current = ws;
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === "replay_status") {
            setStatus(msg.status);
            if (msg.file) setActiveFile(msg.file);
            if (msg.status === "ended" || msg.status === "stopped") setActiveFile("");
          }
        } catch {}
      };
      ws.onclose = () => setTimeout(connect, 3000);
      ws.onerror = () => ws.close();
    }
    connect();
    return () => wsRef.current?.close();
  }, []);

  async function fetchFiles() {
    try {
      const res = await fetch(`${SERVER_HTTP}/logs`);
      const json = await res.json();
      setFiles(json.files || []);
      if (!selected && json.files?.length) setSelected(json.files[0]);
    } catch {}
  }

  useEffect(() => { fetchFiles(); }, []);

  async function handlePlay() {
    if (!selected) return;
    await fetch(`${SERVER_HTTP}/replay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: selected }),
    });
  }

  async function handleStop() {
    await fetch(`${SERVER_HTTP}/replay/stop`, { method: "POST" });
  }

  const replaying = status === "started";

  // Format filename for display: strip "telemetry-" prefix and ".jsonl" suffix
  function formatLabel(f) {
    return f.replace(/^telemetry-/, "").replace(/\.jsonl$/, "").replace(/T/, " ");
  }

  return (
    <div style={styles.bar}>
      <select
        style={styles.select}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={replaying}
      >
        {files.length === 0 && <option value="">no logs</option>}
        {files.map((f) => (
          <option key={f} value={f}>{formatLabel(f)}</option>
        ))}
      </select>

      <button style={styles.btn} onClick={fetchFiles} title="Refresh log list" disabled={replaying}>
        ↺
      </button>

      {!replaying ? (
        <button style={{ ...styles.btn, ...styles.btnPlay }} onClick={handlePlay} disabled={!selected || files.length === 0}>
          ▶ Replay
        </button>
      ) : (
        <button style={{ ...styles.btn, ...styles.btnStop }} onClick={handleStop}>
          ■ Stop
        </button>
      )}

      {status && (
        <span style={styles.statusChip} data-status={status}>
          {status === "started" && `▶ replaying`}
          {status === "ended" && "✓ done"}
          {status === "stopped" && "■ stopped"}
        </span>
      )}
    </div>
  );
}

const styles = {
  bar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    padding: "6px 14px",
    backdropFilter: "blur(6px)",
    pointerEvents: "auto",
    flexWrap: "wrap",
  },
  select: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 8,
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    padding: "3px 8px",
    cursor: "pointer",
    maxWidth: 260,
  },
  btn: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 8,
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    padding: "3px 10px",
    cursor: "pointer",
  },
  btnPlay: {
    background: "rgba(102,187,106,0.25)",
    borderColor: "rgba(102,187,106,0.5)",
    color: "#a5d6a7",
  },
  btnStop: {
    background: "rgba(239,83,80,0.25)",
    borderColor: "rgba(239,83,80,0.5)",
    color: "#ef9a9a",
  },
  statusChip: {
    fontSize: 10,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: "0.06em",
  },
};
