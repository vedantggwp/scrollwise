import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Scrollwise",
    short_name: "Scrollwise",
    description: "Your library as a TikTok-style feed. Never lose your place.",
    start_url: "/feed",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#2563eb",
    // Add icons to public/ (icon-192.png, icon-512.png) when ready
  };
}
