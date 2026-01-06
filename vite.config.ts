import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    tailwindcss(),
    metaImagesPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  // Vite copie automatiquement les fichiers de client/public vers dist/public
  publicDir: "public",
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // S'assurer que les fichiers publics sont copiés
    copyPublicDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Séparer Leaflet dans son propre chunk (chargé uniquement quand nécessaire)
          if (id.includes("leaflet") || id.includes("react-leaflet")) {
            return "leaflet";
          }
          // Séparer les dépendances UI lourdes
          if (id.includes("node_modules")) {
            // Séparer les grandes bibliothèques
            if (id.includes("@radix-ui") || id.includes("framer-motion")) {
              return "ui-libs";
            }
            // Autres dépendances node_modules
            return "vendor";
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Augmenter la limite à 1MB pour éviter les warnings
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    // Pas de proxy nécessaire : Express sert Vite en mode middleware
    // Les routes /api sont gérées directement par Express
    // HMR désactivé pour éviter les erreurs WebSocket
    hmr: false,
  },
});
