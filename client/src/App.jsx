import React from "react";
import { useTreadmill } from "./hooks/useTreadmill.js";
import { SpeedWidget } from "./components/SpeedWidget.jsx";
import { HeartRateWidget } from "./components/HeartRateWidget.jsx";
import { InclineWidget } from "./components/InclineWidget.jsx";
import { DistanceWidget } from "./components/DistanceWidget.jsx";
import { ElapsedWidget } from "./components/ElapsedWidget.jsx";
import { ReplayControls } from "./components/ReplayControls.jsx";

function TreadmillPanel({ id }) {
  const { telemetry, connected } = useTreadmill(id);

  return (
    <div style={styles.panel}>
      <div style={styles.statusBar}>
        <span style={{ ...styles.dot, background: connected ? "#66bb6a" : "#ef5350" }} />
        <span style={styles.statusText}>
          {`treadmill ${id} `}
          {connected ? "connected" : "connecting…"}
        </span>
      </div>

      <div style={styles.widgetRow}>
        <SpeedWidget value={telemetry.speed} />
        <InclineWidget value={telemetry.incline} />
        <HeartRateWidget value={telemetry.heartRate} />
        <DistanceWidget value={telemetry.distance} />
        <ElapsedWidget value={telemetry.elapsed} />
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
      <TreadmillPanel id={1} />
      <TreadmillPanel id={2} />
    </div>
  );
}

const styles = {
  root: {
    position: "fixed",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    alignItems: "stretch",
    pointerEvents: "none",
    padding: "16px 0 32px",
    gap: 16,
  },
  replayRow: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "auto",
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
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
  widgetRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    alignItems: "flex-end",
    padding: "0 16px",
  },
};
