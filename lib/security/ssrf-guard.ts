import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const parts = ip.split('.').map(Number);
    const first = parts[0];
    const second = parts[1];
    
    return (
      first === 127 || // 127.0.0.0/8
      first === 10 || // 10.0.0.0/8
      first === 0 || // 0.0.0.0/8
      (first === 172 && second >= 16 && second <= 31) || // 172.16.0.0/12
      (first === 192 && second === 168) || // 192.168.0.0/16
      (first === 169 && second === 254) // 169.254.0.0/16
    );
  }

  if (isIP(ip) === 6) {
    const normalized = ip.toLowerCase();
    
    if (normalized === '::' || normalized === '::1') {
      return true;
    }
    
    // fc00::/7 (fc00... to fdff...)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true;
    }
    
    // fe80::/10 (fe80... to febf...)
    if (
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    ) {
      return true;
    }

    // Handle IPv4-mapped IPv6 addresses (::ffff:0:0/96 or similar)
    const [left, right = ""] = normalized.split("::");
    const leftGroups = left ? left.split(":") : [];
    const rightGroups = right ? right.split(":") : [];
    const groups = normalized.includes("::")
      ? [...leftGroups, ...Array(8 - leftGroups.length - rightGroups.length).fill("0"), ...rightGroups]
      : leftGroups;

    if (groups.length === 8 && groups.slice(0, 5).every((group) => group === "0") && groups[5] === "ffff") {
      const high = Number.parseInt(groups[6], 16);
      const low = Number.parseInt(groups[7], 16);
      if (Number.isFinite(high) && Number.isFinite(low)) {
        return isPrivateIp(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
      }
    }
  }

  return false;
}

export async function assertSafeUrl(url: string): Promise<void> {
  const parsed = new URL(url);

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported.');
  }

  const hostname = parsed.hostname;

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error(`URL resolves to a blocked private/reserved IP address: ${hostname}`);
    }
    return;
  }

  // Resolve hostname to all IPs
  const addresses = await lookup(hostname, { all: true });
  
  for (const record of addresses) {
    if (isPrivateIp(record.address)) {
      throw new Error(`URL resolves to a blocked private/reserved IP address: ${record.address}`);
    }
  }
}
