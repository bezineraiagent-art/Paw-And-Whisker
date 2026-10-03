import { BlockList, isIP } from "node:net";

// Only infrastructure peers are trusted; never trust arbitrary CF-Connecting-IP.
// Express traverses X-Forwarded-For from the trusted socket inward and stops at
// the first untrusted address, so attacker-supplied prefixes cannot replace it.
const cloudflare = [
  "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22",
  "141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20",
  "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
  "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
  "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32",
  "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32",
];
// Replit's private reverse proxies are within the isolated managed network.
// Operators can narrow/replace private peer ranges for a different deployment.
export function createProxyTrust(privateCidrs = process.env.TRUSTED_PROXY_CIDRS ?? "127.0.0.0/8,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,fc00::/7") {
  const list = new BlockList();
  for (const cidr of [...cloudflare, ...privateCidrs.split(",").filter(Boolean)]) {
    const [ip, bits] = cidr.trim().split("/");
    const family = isIP(ip);
    if (!family || !/^\d+$/.test(bits ?? "") || Number(bits) > (family === 4 ? 32 : 128)) throw new Error("Invalid TRUSTED_PROXY_CIDRS");
    list.addSubnet(ip, Number(bits), family === 4 ? "ipv4" : "ipv6");
  }
  return (address: string) => {
    const ip = address.startsWith("::ffff:") ? address.slice(7) : address;
    const family = isIP(ip);
    return !!family && list.check(ip, family === 4 ? "ipv4" : "ipv6");
  };
}