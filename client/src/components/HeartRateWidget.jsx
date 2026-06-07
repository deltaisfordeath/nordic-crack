import React, { useEffect, useRef, useState } from "react";

const HR_MIN = 80;
const HR_MAX = 180;

// 5-zone color coding keyed to gradient zones
function hrColor(bpm) {
  if (bpm === null) return "#888";
  if (bpm < 95) return "#4fc3f7";
  if (bpm < 121) return "#81c784";
  if (bpm < 146) return "#fff176";
  if (bpm < 166) return "#ffb74d";
  return "#ef5350";
}

function hrPercent(bpm) {
  if (bpm === null) return null;
  const clamped = Math.max(HR_MIN, Math.min(HR_MAX, bpm));
  return ((clamped - HR_MIN) / (HR_MAX - HR_MIN)) * 100;
}

export function HeartRateWidget({ value }) {
  const color = hrColor(value);
  const display = value !== null ? Math.round(value) : "--";
  const pct = hrPercent(value);

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
      <div
        style={{
          ...styles.value,
          color,
          transform: beat ? "scale(1.08)" : "scale(1)",
          transition: "transform 0.12s ease, color 0.4s ease",
        }}
      >
        {display}
      </div>
      <div style={styles.unit}>bpm</div>

      <div style={styles.barWrapper}>
        <div style={styles.gradientBar} />
        {pct !== null && (
          <div
            style={{
              ...styles.indicator,
              left: `${pct}%`,
            }}
          />
        )}
      </div>

      <div style={styles.barLabels}>
        <span>{HR_MIN}</span>
        <span>{HR_MAX}</span>
      </div>
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
    padding: "14px 22px 10px",
    minWidth: 160,
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
  barWrapper: {
    position: "relative",
    width: "100%",
    height: 10,
    marginTop: 10,
  },
  gradientBar: {
    width: "100%",
    height: "100%",
    borderRadius: 5,
    background:
      "linear-gradient(to right, #4fc3f7, #81c784, #fff176, #ffb74d, #ef5350)",
  },
  indicator: {
    position: "absolute",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: "white",
    border: "2px solid rgba(0,0,0,0.55)",
    boxShadow: "0 0 6px rgba(0,0,0,0.6)",
    transition: "left 0.5s ease",
    pointerEvents: "none",
  },
  barLabels: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 3,
    fontSize: 9,
    color: "rgba(255,255,255,0.3)",
  },
};
