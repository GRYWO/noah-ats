import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Excel-bellijsten uit Jobdigger kunnen 2-5 MB worden bij grote zoekopdrachten —
  // Vercel default voor server-actions is 1 MB. Verhogen naar 10 MB.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
