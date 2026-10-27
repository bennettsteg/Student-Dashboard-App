import type { MetadataRoute } from "next";

/**
 * Web app manifest (served at /manifest.webmanifest). Colours mirror --background in
 * globals.css; the manifest can't read CSS variables, so keep them in sync by hand.
 * Icons are generated from the cap logo by scripts/generate-icons.mjs.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "StudyDesk",
    short_name: "StudyDesk",
    description: "Personal dashboard for courses, assignments, grades and Outlook mail.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#292727",
    theme_color: "#292727",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
