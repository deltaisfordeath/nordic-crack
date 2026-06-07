import React from "react";
import { useTreadmill } from "./hooks/useTreadmill.js";
import { SpeedWidget } from "./components/SpeedWidget.jsx";
import { HeartRateWidget } from "./components/HeartRateWidget.jsx";
import { InclineWidget } from "./components/InclineWidget.jsx";
import { DistanceWidget } from "./components/DistanceWidget.jsx";
import { ReplayControls } from "./components/ReplayControls.jsx";

function TreadmillPanel({ id, side }) {
  const { telemetry, connected } = useTreadmill(id);

  return (
    <div
      style={{
        ...styles.panel,
        alignItems: side === "left" ? "flex-start" : "flex-end",
      }}
    >
      {/* <div style={styles.statusBar}>
        <span style={{ ...styles.dot, background: connected ? "#66bb6a" : "#ef5350" }} />
        <span style={styles.statusText}>
          {`treadmill ${id} `}
          {connected ? "connected" : "connecting…"}
        </span>
      </div> */}

      <div style={styles.widgetStack}>
        {telemetry.incline !== 0 && <InclineWidget value={telemetry.incline} />}
        <DistanceWidget value={telemetry.distance} />
        <HeartRateWidget value={telemetry.heartRate} />
        <SpeedWidget value={telemetry.speed} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div style={styles.root}>
      <div style={styles.replayRow}>
        <ReplayControls />
      </div>
      <div style={styles.panelsRow}>
        <TreadmillPanel id={1} side="left" />
        <TreadmillPanel id={2} side="right" />
      </div>
    </div>
  );
}

const styles = {
  root: {
    position: "fixed",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    pointerEvents: "none",
    padding: "16px 32px 32px",
    background: "#FF00CC",
  },
  replayRow: {
    display: "flex",
    justifyContent: "center",
  },
  panelsRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  statusBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    padding: "5px 12px",
    backdropFilter: "blur(6px)",
    pointerEvents: "auto",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    display: "inline-block",
    flexShrink: 0,
  },
  statusText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: "0.06em",
  },
  widgetStack: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
};
