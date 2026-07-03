import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@napi-rs/canvas",
    "@mozilla/readability",
    "jsdom",
    "mammoth",
    "pdf-parse",
    "pdfjs-dist",
    "tesseract.js",
    "xlsx",
    "jszip"
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co"
      }
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb"
    }
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://www.youtube.com https://www.gstatic.com https://open.spotify.com https://sdk.scdn.co https://w.soundcloud.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co https://i.ytimg.com https://i.scdn.co https://i1.sndcdn.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://openrouter.ai https://api.openrouter.ai https://api.spotify.com https://accounts.spotify.com https://*.spotify.com wss://*.spotify.com https://www.googleapis.com https://api.soundcloud.com https://generativelanguage.googleapis.com https://api.groq.com https://api.together.xyz https://api-inference.huggingface.co wss://api.groq.com",
      "media-src 'self' blob: https://*.sndcdn.com https://*.scdn.co",
      "frame-src 'self' https://*.supabase.co blob: https://open.spotify.com https://www.youtube.com https://www.youtube-nocookie.com https://w.soundcloud.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), display-capture=()" },
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Mind-Security", value: "Mind Security Engine" }
        ]
      }
    ];
  }
};

export default nextConfig;
