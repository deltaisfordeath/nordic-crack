import React from "react";

// Heart-rate-style color zones for pace
function speedColor(mph) {
  if (mph === null) return "#888";
  if (mph < 3.5) return "#4fc3f7"; // walk
  if (mph < 5.5) return "#81c784"; // jog
  if (mph < 7.5) return "#ffb74d"; // run
  return "#ef5350";                 // sprint
}

export function SpeedWidget({ value }) {
  const color = speedColor(value);
  const display = value !== null ? value.toFixed(1) : "--";

  return (
    <div style={styles.card}>
      <div style={styles.label}>SPEED</div>
      <div style={{ ...styles.value, color }}>{display}</div>
      <div style={styles.unit}>mph</div>
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
    minWidth: 110,
    backdropFilter: "blur(8px)",
  },
  label: {
    fontSize: 11,
    letterSpacing: "0.12em",
    color: "rgba(255,255,255,0.45)",
    marginBottom: 4,
  },
  value: {
    fontSize: 48,
    fontWeight: 700,
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },
  unit: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginTop: 4,
  },
};
