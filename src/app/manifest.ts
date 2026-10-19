import type { MetadataRoute } from "next";

/** Installable web app (Add to Home Screen on phones and tablets) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nur Karim — кітап дүкені",
    short_name: "Nur Karim",
    description: "Діни, тарихи және танымдық кітаптар: қағаз және электронды нұсқалар, Қазақстан бойынша жеткізу.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1830",
    theme_color: "#0b1830",
    lang: "kk",
    categories: ["books", "shopping", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Каталог", url: "/catalog", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Менің кітаптарым", url: "/account/library", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Себет", url: "/cart", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
