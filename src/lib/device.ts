// src/lib/device.ts

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";

  const STORAGE_KEY = "scam_radar_did";
  let deviceId = localStorage.getItem(STORAGE_KEY);

  if (!deviceId) {
    // توليد معرف جهاز فريد وطويل وتخزينه في ذاكرة المتصفح
    deviceId = "dev_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now().toString(36);
    localStorage.setItem(STORAGE_KEY, deviceId);
  }

  return deviceId;
}