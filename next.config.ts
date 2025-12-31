import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["canvas", "@napi-rs/canvas", "pdfjs-dist"],
  trailingSlash: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "uploads.linear.app",
      },
    ],
  },
};

export default nextConfig;
