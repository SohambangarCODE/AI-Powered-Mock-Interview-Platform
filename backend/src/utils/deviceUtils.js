/**
 * Device / IP utilities.
 *
 * Lightweight UA parsing without a heavy external dependency — covers the
 * most common browser + OS combinations relevant for security-history display.
 */

/**
 * Extract a human-readable browser name from a User-Agent string.
 * @param {string} ua
 * @returns {string}
 */
const parseBrowser = (ua = "") => {
  if (!ua) return "Unknown";
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return "Opera";
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return "Chrome";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
  if (/MSIE|Trident/i.test(ua)) return "Internet Explorer";
  return "Other";
};

/**
 * Extract a human-readable OS name from a User-Agent string.
 * @param {string} ua
 * @returns {string}
 */
const parseOS = (ua = "") => {
  if (!ua) return "Unknown";
  if (/Windows NT 10/i.test(ua)) return "Windows 10/11";
  if (/Windows NT/i.test(ua)) return "Windows";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/iPhone|iPad/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Linux/i.test(ua)) return "Linux";
  return "Other";
};

/**
 * Parse useful device information from a request.
 * @param {string} ua
 * @returns {{ browser: string, os: string, device: string }}
 */
const parseDevice = (ua = "") => {
  const browser = parseBrowser(ua);
  const os = parseOS(ua);
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const device = isMobile ? "Mobile" : "Desktop";
  return { browser, os, device };
};

/**
 * Get the real client IP from a request, handling common proxy headers.
 * @param {import('express').Request} req
 * @returns {string}
 */
const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; the first is the client
    return forwarded.split(",")[0].trim();
  }
  return (
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "unknown"
  );
};

module.exports = { parseDevice, getClientIp };
