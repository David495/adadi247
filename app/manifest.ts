import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ADADI | Discover. Shop. Sell.",
    short_name: "ADADI",
    description:
      "Discover products, shop from local businesses, and grow your business online with ADADI.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FAF8F6",
    theme_color: "#8B1E3F",
    orientation: "portrait",
    icons: [
      {
        src: "/adadi-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/adadi-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}