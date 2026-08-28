const DEVICE_ID_KEY = "practicecraft.hmrc.device-id";

function getDeviceId(): string {
  let value = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!value) {
    value = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, value);
  }
  return value;
}

/** Browser facts used by the server to construct HMRC fraud headers. */
export function collectHmrcFraudContext() {
  const screenDetails = window.screen;
  return {
    deviceId: getDeviceId(),
    userAgent: navigator.userAgent,
    screens: `width=${screenDetails.width}&height=${screenDetails.height}&scaling-factor=${window.devicePixelRatio}&colour-depth=${screenDetails.colorDepth}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    windowSize: `width=${window.innerWidth}&height=${window.innerHeight}`,
  };
}
