import { useEffect, useRef, useState } from "react";

const SERVER_URL = "ws://localhost:3001";

const INITIAL = {
  speed: null,
  incline: null,
  heartRate: null,
  distance: null,
  elapsed: null,
  calories: null,
};

export function useTreadmill(treadmillId) {
  const [telemetry, setTelemetry] = useState(INITIAL);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(SERVER_URL);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === "telemetry" && msg.treadmill === treadmillId) {
            setTelemetry((prev) => ({ ...prev, ...msg.data }));
          } else if (msg.type === "status" && msg.connected === false) {
            setTelemetry(INITIAL);
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [treadmillId]);

  return { telemetry, connected };
}
