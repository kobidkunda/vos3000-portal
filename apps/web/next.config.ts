import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

function loadEnvFile() {
  const possiblePaths = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../../.env"),
    path.resolve(process.cwd(), "../.env"),
  ];
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (process.env[key] === undefined || process.env[key] === "") {
            process.env[key] = val;
          }
        }
      }
      break;
    }
  }
}
loadEnvFile();

const internalApi = process.env.API_INTERNAL_URL || "http://127.0.0.1:5026";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.88.81:5027",
    "192.168.88.81",
    "192.168.88.81:3000",
    "192.168.88.93",
    "192.168.88.93:5027",
    "localhost",
    "127.0.0.1",
    "100.116.26.14",
    "localhost:5027",
    "127.0.0.1:5027",
  ],
  async rewrites() {
    return process.env.NEXT_PUBLIC_API_URL
      ? []
      : [
          { source: "/api/:path*", destination: `${internalApi}/api/:path*` },
          { source: "/docs/:path*", destination: `${internalApi}/docs/:path*` },
        ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
