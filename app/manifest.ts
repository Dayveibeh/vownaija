import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Smitten",
    short_name: "Smitten",
    description: "Find trusted wedding vendors across Nigeria and plan your celebration with confidence.",
    start_url: "/",
    display: "standalone",
    background_color: "#EDF1E2",
    theme_color: "#000000",
    icons: [
      { src: "/smitten-icon.png", sizes: "1024x1024", type: "image/png" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
