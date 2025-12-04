import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Meu JW",
    short_name: "Meu JW",
    description: "Gerenciar tarefas e responsabilidades congregacionais.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6d0ee9ff",
    lang: "pt-BR",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48 72x72 96x96 128x128 256x256",
        type: "image/x-icon",
      },
      {
        src: "/icons/kingdom-hall.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  }
}
