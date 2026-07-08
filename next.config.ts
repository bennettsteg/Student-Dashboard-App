import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["node-ical", "rrule-temporal", "temporal-polyfill"],
};

export default nextConfig;
