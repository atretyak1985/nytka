import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow opening the dev server from LAN devices (phone, another machine).
  allowedDevOrigins: ["192.168.5.24", "*.local"],
};

export default nextConfig;
