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
      // Force la résolution vers une seule instance physique de React
      // CRUCIAL pour éviter que react-leaflet crée sa propre bulle isolée
      "react": path.resolve(import.meta.dirname, "node_modules/react"),
      "react-dom": path.resolve(import.meta.dirname, "node_modules/react-dom"),
      "react-leaflet": path.resolve(import.meta.dirname, "node_modules/react-leaflet"),
    },
    // Forcer la déduplication de React pour éviter les conflits avec react-leaflet
    dedupe: ["react", "react-dom"],
  },
  // Empêche Vite de pré-optimiser Leaflet de façon isolée
  optimizeDeps: {
    include: ["react", "react-dom", "react-leaflet", "leaflet"],
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
          // ⚠️ NE PAS séparer react-leaflet dans un chunk isolé
          // Cela cause l'erreur createContext car React n'est pas dans le même contexte
          // react-leaflet doit rester avec React dans le bundle principal ou vendor
          
          // Séparer uniquement leaflet pur (sans react-leaflet) si nécessaire
          if (id.includes("node_modules/leaflet") && !id.includes("react-leaflet")) {
            return "leaflet-core";
          }
          
          // Séparer les dépendances UI lourdes
          if (id.includes("node_modules")) {
            // Séparer les grandes bibliothèques
            if (id.includes("@radix-ui") || id.includes("framer-motion")) {
              return "ui-libs";
            }
            // react-leaflet et autres dépendances restent dans vendor (avec React)
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
