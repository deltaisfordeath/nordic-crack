import React from "react";

export function DistanceWidget({ value }) {
  const display = value !== null ? value.toFixed(2) : "--";

  return (
    <div style={styles.card}>
      <div style={styles.label}>DISTANCE</div>
      <div style={styles.value}>{display}</div>
      <div style={styles.unit}>mi</div>
    </div>
  );
}

const styles = {
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "rgb(50,50,50)",
    border: "1px solid rgba(200,200,200)",
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
    color: "#ce93d8",
    fontVariantNumeric: "tabular-nums",
  },
  unit: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginTop: 4,
  },
};
