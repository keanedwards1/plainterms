import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const devScriptSrc = isDev ? "'unsafe-eval' " : "";
const vercelLiveSrc = "https://vercel.live ";

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      `script-src 'self' 'unsafe-inline' ${devScriptSrc}${vercelLiveSrc}https://js.stripe.com https://checkout.stripe.com https://www.googletagmanager.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https: https://www.google-analytics.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      `connect-src 'self' ${vercelLiveSrc}https://api.stripe.com https://checkout.stripe.com https://*.amazonaws.com https://*.execute-api.us-west-2.amazonaws.com https://www.google-analytics.com https://*.google-analytics.com`,
      `frame-src ${vercelLiveSrc}https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com`,
      "form-action 'self' https://checkout.stripe.com",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
