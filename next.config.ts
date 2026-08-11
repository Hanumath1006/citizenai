import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Google Places photo endpoint
      { protocol: "https", hostname: "places.googleapis.com" },
      { protocol: "https", hostname: "maps.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Supabase storage (avatars, cached photos)
      { protocol: "https", hostname: "*.supabase.co" },
      // Unsplash fallback imagery used on the landing page
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
