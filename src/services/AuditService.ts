/**
 * Audit Metadata Service
 * Collects client metrics (IP Address, User Agent, Session ID, Device Info)
 * to pass to backend API write operations for audit logging.
 */

export interface ClientMetadata {
  ip: string;
  userAgent: string;
  deviceInfo: string;
  sessionId: string;
  timestamp: string;
}

let cachedIp: string | null = null;
let isIpFetching = false;

// Generate or retrieve persistent Session ID
function getSessionId(): string {
  const KEY = 'purchasing_app_session_id';
  let sid = localStorage.getItem(KEY);
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
    localStorage.setItem(KEY, sid);
  }
  return sid;
}

// Extract human readable OS & Browser from userAgent
function parseDeviceInfo(): string {
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  if (ua.indexOf('Win') !== -1) os = 'Windows';
  else if (ua.indexOf('Mac') !== -1) os = 'Mac OS';
  else if (ua.indexOf('Linux') !== -1) os = 'Linux';
  else if (ua.indexOf('Android') !== -1) os = 'Android';
  else if (ua.indexOf('like Mac') !== -1) os = 'iOS';

  let browser = 'Unknown Browser';
  if (ua.indexOf('Chrome') !== -1 && ua.indexOf('Edg') === -1) browser = 'Chrome';
  else if (ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1) browser = 'Safari';
  else if (ua.indexOf('Firefox') !== -1) browser = 'Firefox';
  else if (ua.indexOf('Edg') !== -1) browser = 'Edge';

  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  return `${os} (${browser}) • ${screenResolution}`;
}

// Fetch public IP address with fast fallback
async function fetchClientIp(): Promise<string> {
  if (cachedIp) return cachedIp;
  if (isIpFetching) return cachedIp || 'Fetching...';

  isIpFetching = true;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s max timeout

    const res = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      cachedIp = data.ip;
      isIpFetching = false;
      return cachedIp || 'Unknown IP';
    }
  } catch (e) {
    // Fallback if blocked or offline
    cachedIp = 'Client IP';
  }
  isIpFetching = false;
  return cachedIp || 'Client IP';
}

// Proactively initiate IP fetch
fetchClientIp();

export class AuditService {
  /**
   * Get complete client metadata object
   */
  static async getClientMetadata(): Promise<ClientMetadata> {
    const ip = await fetchClientIp();
    return {
      ip,
      userAgent: navigator.userAgent,
      deviceInfo: parseDeviceInfo(),
      sessionId: getSessionId(),
      timestamp: new Date().toISOString(),
    };
  }
}
