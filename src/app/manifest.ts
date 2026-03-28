import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "SYNCLOUDPOS — ERP & Gestion Commerciale",
        short_name: "SYNCLOUDPOS",
        description: "Système ERP complet de gestion commerciale, point de vente, facturation et conformité fiscale algérienne.",
        start_url: "/hub",
        display: "standalone",
        background_color: "#0f172a",
        theme_color: "#3b82f6",
        orientation: "any",
        categories: ["business", "finance", "productivity"],
        icons: [
            {
                src: "/icons/icon-192x192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/icon-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/icon-maskable-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
        ],
    }
}
