import React from "react";

function formatTime(seconds) {
  if (seconds === null) return "--:--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ElapsedWidget({ value }) {
  return (
    <div style={styles.card}>
      <div style={styles.label}>TIME</div>
      <div style={styles.value}>{formatTime(value)}</div>
    </div>
  );
}

const styles = {
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "rgba(0,0,0,0.65)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: "14px 22px",
    minWidth: 130,
    backdropFilter: "blur(8px)",
  },
  label: {
    fontSize: 11,
    letterSpacing: "0.12em",
    color: "rgba(255,255,255,0.45)",
    marginBottom: 4,
  },
  value: {
    fontSize: 36,
    fontWeight: 700,
    lineHeight: 1.2,
    color: "rgba(255,255,255,0.85)",
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "0.04em",
  },
};
