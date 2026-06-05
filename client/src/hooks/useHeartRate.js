import { useState, useRef, useCallback } from "react";

// Standard Bluetooth Heart Rate Service
const HR_SERVICE = 0x180D;
const HR_MEASUREMENT = 0x2A37;

export function useHeartRate() {
  const [heartRate, setHeartRate] = useState(null);
  const [status, setStatus] = useState("disconnected"); // disconnected | connecting | connected
  const deviceRef = useRef(null);

  const connect = useCallback(async () => {
    if (!navigator.bluetooth) {
      alert("Web Bluetooth is not supported in this browser. Use Chrome or Edge.");
      return;
    }

    setStatus("connecting");
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [HR_SERVICE] }],
        optionalServices: [HR_SERVICE],
      });

      deviceRef.current = device;

      device.addEventListener("gattserverdisconnected", () => {
        setStatus("disconnected");
        setHeartRate(null);
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(HR_SERVICE);
      const characteristic = await service.getCharacteristic(HR_MEASUREMENT);

      characteristic.addEventListener("characteristicvaluechanged", (evt) => {
        const value = evt.target.value;
        // Byte 0: flags. Bit 0 = 0 means HR is uint8, bit 0 = 1 means uint16.
        const flags = value.getUint8(0);
        const hr = flags & 0x1 ? value.getUint16(1, true) : value.getUint8(1);
        setHeartRate(hr);
      });

      await characteristic.startNotifications();
      setStatus("connected");
    } catch (err) {
      console.error("[bt] HR connection failed:", err);
      setStatus("disconnected");
    }
  }, []);

  const disconnect = useCallback(() => {
    deviceRef.current?.gatt?.disconnect();
    setStatus("disconnected");
    setHeartRate(null);
  }, []);

  return { heartRate, status, connect, disconnect };
}
