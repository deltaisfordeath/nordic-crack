import React from "react";

function inclineColor(pct) {
  if (pct === null) return "#888";
  if (pct < 2) return "#4fc3f7";
  if (pct < 5) return "#81c784";
  if (pct < 8) return "#ffb74d";
  return "#ef5350";
}

export function InclineWidget({ value }) {
  const color = inclineColor(value);
  const display = value !== null ? value.toFixed(1) : "--";
  // Max incline on Commercial 2450 is 15%
  const fillPct = value !== null ? Math.min((value / 15) * 100, 100) : 0;

  return (
    <div style={styles.card}>
      <div style={styles.label}>INCLINE</div>
      <div style={{ ...styles.value, color }}>{display}</div>
      <div style={styles.unit}>%</div>
      <div style={styles.barTrack}>
        <div style={{ ...styles.barFill, width: `${fillPct}%`, background: color }} />
      </div>
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
  barTrack: {
    width: "100%",
    height: 4,
    background: "rgba(255,255,255,0.12)",
    borderRadius: 2,
    marginTop: 10,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
    transition: "width 0.4s ease",
  },
};
