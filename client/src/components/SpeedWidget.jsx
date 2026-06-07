import React from "react";

const CX = 100;
const CY = 100;
const R = 72;
const TRACK_W = 11;
const START_DEG = 150;
const SWEEP_DEG = 240;
const MIN_SPEED = 3;
const MAX_SPEED = 9;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function pt(deg, r = R) {
  return [CX + r * Math.cos(toRad(deg)), CY + r * Math.sin(toRad(deg))];
}

function arc(fromDeg, toDeg, r = R) {
  const [sx, sy] = pt(fromDeg, r);
  const [ex, ey] = pt(toDeg, r);
  const sweep = (((toDeg - fromDeg) % 360) + 360) % 360;
  const large = sweep > 180 ? 1 : 0;
  return `M${sx.toFixed(2)},${sy.toFixed(2)} A${r},${r} 0 ${large},1 ${ex.toFixed(2)},${ey.toFixed(2)}`;
}

function speedColor(mph) {
  if (mph === null || mph < 3) return "#888";
  if (mph < 4.5) return "#4fc3f7";
  if (mph < 6) return "#81c784";
  if (mph < 8) return "#ffb74d";
  return "#ef5350";
}

function valueDeg(mph) {
  const ratio = Math.max(
    0,
    Math.min(1, (mph - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)),
  );
  return START_DEG + ratio * SWEEP_DEG;
}

const TICK_SPEEDS = [3, 4, 5, 6, 7, 8, 9];
const LABEL_SPEEDS = [3, 6, 9];

export function SpeedWidget({ value }) {
  const color = speedColor(value);
  const display = value !== null ? value.toFixed(1) : "--";

  const ratio =
    value !== null
      ? Math.max(0, Math.min(1, (value - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)))
      : 0;
  const valDeg = value !== null ? valueDeg(value) : START_DEG;
  const trackEnd = START_DEG + SWEEP_DEG;

  const trackPath = arc(START_DEG, trackEnd);
  const fillPath = value !== null && ratio > 0 ? arc(START_DEG, valDeg) : null;

  const [nx, ny] = pt(valDeg, R - 16);

  return (
    <div style={styles.card}>
      <div style={styles.label}>SPEED</div>
      <svg width="200" height="148" viewBox="0 0 200 148">
        {/* Background track */}
        <path
          d={trackPath}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={TRACK_W}
          strokeLinecap="round"
        />

        {/* Colored fill arc */}
        {fillPath && (
          <path
            d={fillPath}
            fill="none"
            stroke={color}
            strokeWidth={TRACK_W}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 5px ${color}88)` }}
          />
        )}

        {/* Tick marks */}
        {TICK_SPEEDS.map((mph) => {
          const deg = valueDeg(mph);
          const isMajor = LABEL_SPEEDS.includes(mph);
          const [ox, oy] = pt(deg, R + (isMajor ? 7 : 5));
          const [ix, iy] = pt(deg, R - (isMajor ? 5 : 3));
          return (
            <line
              key={mph}
              x1={ix.toFixed(2)}
              y1={iy.toFixed(2)}
              x2={ox.toFixed(2)}
              y2={oy.toFixed(2)}
              stroke={
                isMajor ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.25)"
              }
              strokeWidth={isMajor ? 2 : 1}
            />
          );
        })}

        {/* Needle */}
        {value !== null && (
          <>
            <line
              x1={CX}
              y1={CY}
              x2={nx.toFixed(2)}
              y2={ny.toFixed(2)}
              stroke="white"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <circle cx={CX} cy={CY} r={6} fill={color} />
            <circle cx={CX} cy={CY} r={3} fill="white" />
          </>
        )}

        {/* Value readout */}
        <text
          x={CX}
          y={CY + 22}
          textAnchor="middle"
          fill={color}
          fontSize={30}
          fontWeight={700}
          fontFamily="system-ui, -apple-system, sans-serif"
          dominantBaseline="middle"
        >
          {display}
        </text>
        <text
          x={CX}
          y={CY + 40}
          textAnchor="middle"
          fill="rgba(255,255,255,0.4)"
          fontSize={10}
          fontFamily="system-ui, -apple-system, sans-serif"
          dominantBaseline="middle"
        >
          mph
        </text>
      </svg>
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
    padding: "14px 16px 6px",
    backdropFilter: "blur(8px)",
  },
  label: {
    fontSize: 11,
    letterSpacing: "0.12em",
    color: "rgba(255,255,255,0.45)",
    marginBottom: 2,
  },
};
