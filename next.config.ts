import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Excel-bellijsten uit Jobdigger kunnen 2-5 MB worden bij grote zoekopdrachten —
  // Vercel default voor server-actions is 1 MB. Verhogen naar 10 MB.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async redirects() {
    return [
      { source: "/setters", destination: "/users", permanent: true },
      { source: "/setters/:path*", destination: "/users/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
