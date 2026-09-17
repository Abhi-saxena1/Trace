/** Source identity, not a URL to fetch. Preserve original URLs on records for display. */
export function canonicalizeSourceUrl(value: string): string {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid source URL");
  url.protocol = "https:";
  url.hash = "";
  const host = url.hostname.toLowerCase();
  if (["x.com", "www.x.com", "mobile.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"].includes(host)) {
    const match = url.pathname.match(/^\/(?:[^/]+\/status|i\/web\/status|i\/status)\/(\d+)(?:\/(?:photo|video)\/\d+)?\/?$/i);
    if (match) return `https://x.com/i/status/${match[1]}`;
    url.hostname = "x.com";
  }
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) {
    const activity = url.pathname.match(/(?:activity-|urn:li:activity:)(\d+)/i);
    if (activity) return `https://www.linkedin.com/feed/update/urn:li:activity:${activity[1]}`;
    url.hostname = "www.linkedin.com";
  }
  // Only known aliases: do not collapse arbitrary www hosts or unknown query parameters.
  if (host === "sociallcapital.com") url.hostname = "www.sociallcapital.com";
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_/i.test(key) || /^(fbclid|gclid|dclid|msclkid|mc_cid|mc_eid)$/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  url.pathname = url.pathname.replace(/%[0-9a-f]{2}/gi, encoded => {
    const char = String.fromCharCode(parseInt(encoded.slice(1), 16));
    return /^[A-Za-z0-9._~-]$/.test(char) ? char : encoded.toUpperCase();
  }).replace(/\/+$/, "") || "/";
  return url.href;
}
