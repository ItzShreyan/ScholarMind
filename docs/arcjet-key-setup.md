# Arcjet Key Setup

ScholarMind can run without Arcjet, but the Mind Security Engine will use Arcjet automatically when `ARCJET_KEY` is configured.

## Is Mind Security Engine Better With Arcjet?

Yes. The local Mind Security Engine still adds useful protection when `ARCJET_KEY` is empty, including suspicious-request checks, upload validation, security headers, rate limits, and human verification. Arcjet makes it stronger because it adds a dedicated edge security layer for bot detection, shield rules, and distributed rate limiting that is harder to bypass than local in-memory checks alone.

Use both together for launch:

- Mind Security Engine handles ScholarMind-specific rules, source/upload safety, and app-level checks.
- Arcjet handles broader web abuse patterns, bot traffic, and request-level protection before traffic reaches sensitive routes.

## Get The Key

1. Go to https://app.arcjet.com.
2. Create a free account or sign in.
3. Create/add a site for ScholarMind.
4. Copy the site key. It usually starts with `ajkey_`.

Official docs:
- https://docs.arcjet.com/get-started/
- https://docs.arcjet.com/environment/
- https://docs.arcjet.com/reference/nextjs/

## Paste It Locally

Add this to `.env.local` in the project root:

```env
ARCJET_KEY=ajkey_your_site_key_here
ARCJET_ENV=development
```

Then restart:

```bash
npm run dev
```

## Paste It On Netlify

1. Open Netlify dashboard.
2. Go to your site.
3. Go to `Site configuration` or `Site settings`.
4. Open `Environment variables`.
5. Add:
   `ARCJET_KEY=ajkey_your_site_key_here`
6. Do not set `ARCJET_ENV=development` in production.
7. Redeploy the site.

## Current Code Path

The key is read in `middleware.ts`:

```ts
process.env.ARCJET_KEY
```

If the key is empty, ScholarMind still uses the local Mind Security Engine checks. If the key exists, Arcjet protection is layered on top.
