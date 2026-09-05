function normalizeUrl(value?: string | null) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withProtocol).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function getSiteUrl() {
  return (
    normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeUrl(process.env.URL) ||
    normalizeUrl(process.env.DEPLOY_PRIME_URL) ||
    normalizeUrl(process.env.APP_URL !== 'http://localhost:3000' ? process.env.APP_URL : undefined) ||
    "https://scholarmindai.netlify.app"
  );
}
