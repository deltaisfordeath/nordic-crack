import React, { useEffect, useRef, useState } from "react";

// Standard 5-zone HR coloring (rough max HR ~185 for reference)
function hrColor(bpm) {
  if (bpm === null) return "#888";
  if (bpm < 115) return "#4fc3f7"; // zone 1 – easy
  if (bpm < 135) return "#81c784"; // zone 2 – fat burn
  if (bpm < 155) return "#ffb74d"; // zone 3 – aerobic
  if (bpm < 172) return "#ef5350"; // zone 4 – anaerobic
  return "#b71c1c";                // zone 5 – red-line
}

export function HeartRateWidget({ value }) {
  const color = hrColor(value);
  const display = value !== null ? Math.round(value) : "--";

  // Pulse animation tied to BPM
  const [beat, setBeat] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (value === null) return;
    const interval = (60 / value) * 1000;
    timerRef.current = setInterval(() => {
      setBeat(true);
      setTimeout(() => setBeat(false), 120);
    }, interval);
    return () => clearInterval(timerRef.current);
  }, [value]);

  return (
    <div style={styles.card}>
      <div style={styles.label}>HEART RATE</div>
      <div style={{ ...styles.value, color, transform: beat ? "scale(1.08)" : "scale(1)", transition: "transform 0.12s ease" }}>
        {display}
      </div>
      <div style={styles.unit}>bpm</div>
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
