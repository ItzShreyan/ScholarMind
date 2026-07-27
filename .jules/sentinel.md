## 2026-07-27 - Centralized SSRF Prevention for External Web Fetching
**Vulnerability:** Server-Side Request Forgery (SSRF) when fetching user-provided web URLs for search previews and content extraction.
**Learning:** Local SSRF protection was implemented in the browse proxy endpoint (`app/api/browse-proxy/route.ts`), but other web resource fetching functions in `lib/sources/web.ts` lacked these checks, allowing users to potentially trigger requests to internal loopback addresses or private local networks.
**Prevention:** Centralized the SSRF validation logic into `lib/security/ssrf.ts` with `assertSafeTarget` and integrated it across all external web fetching utilities (`fetchReadablePreview` and `extractWebSourceText`) to enforce defense-in-depth across the system.
