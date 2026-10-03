export function securityHeaders({ development = false, mapTilesUrl = process.env.VET_MAP_TILES_URL } = {}) {
  const tileSources = ["https://tile.openstreetmap.org", "https://*.tile.openstreetmap.org"];
  if (mapTilesUrl) {
    try { const u = new URL(mapTilesUrl.replaceAll("{z}", "0").replaceAll("{x}", "0").replaceAll("{y}", "0")); if (u.protocol === "https:") tileSources.push(u.origin); } catch { /* Invalid tile URLs still fail explicitly in the map. */ }
  }
  const directives = [
    "default-src 'self'", "base-uri 'self'", "object-src 'none'", "form-action 'self'",
    `script-src 'self'${development ? " 'unsafe-inline'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src 'self' data: blob: ${tileSources.join(" ")}`,
    `connect-src 'self'${development ? " ws: wss:" : ""}`,
    development ? "frame-ancestors 'self' https://replit.com https://*.replit.com https://*.replit.dev" : "frame-ancestors 'none'",
    "frame-src 'none'",
  ];
  return {
    "Content-Security-Policy": directives.join("; "),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(self), camera=(), microphone=(), payment=()",
    ...(development ? {} : { "X-Frame-Options": "DENY" }),
  };
}