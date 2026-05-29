import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/setters", destination: "/users", permanent: true },
      { source: "/setters/:path*", destination: "/users/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
