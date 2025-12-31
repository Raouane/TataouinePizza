import express, { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    // Désactiver HMR pour éviter les erreurs WebSocket
    // Le rechargement manuel de la page fonctionne toujours
    hmr: false,
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // IMPORTANT: Servir les fichiers statiques depuis client/public AVANT le middleware Vite
  // Cela permet de servir les images, favicon, etc. en développement
  const publicPath = path.resolve(import.meta.dirname, "..", "client", "public");
  if (fs.existsSync(publicPath)) {
    // Middleware avec logs pour déboguer les requêtes d'images
    app.use((req, res, next) => {
      // Logger uniquement les requêtes d'images
      if (req.path.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i)) {
        const filePath = path.join(publicPath, req.path);
        const exists = fs.existsSync(filePath);
        console.log(`[STATIC] ${req.method} ${req.path} - ${exists ? '✅' : '❌'} ${exists ? 'Trouvé' : 'Non trouvé'}`);
        if (exists) {
          console.log(`[STATIC]   Chemin complet: ${filePath}`);
        }
      }
      next();
    });
    
    app.use(express.static(publicPath));
    console.log(`[VITE] ✅ Fichiers statiques servis depuis: ${publicPath}`);
    
    // Lister les fichiers images disponibles
    const imagesDir = path.join(publicPath, "images", "products");
    if (fs.existsSync(imagesDir)) {
      const imageFiles = fs.readdirSync(imagesDir).filter(f => f.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i));
      console.log(`[VITE] 📸 ${imageFiles.length} fichiers images trouvés dans products/`);
    }
  } else {
    console.warn(`[VITE] ⚠️  Dossier public non trouvé: ${publicPath}`);
  }

  // Middleware pour ignorer les routes API
  app.use((req, res, next) => {
    if (req.originalUrl?.startsWith("/api/") || req.url?.startsWith("/api/")) {
      return next();
    }
    // Ne pas intercepter les scripts modules - laisser Vite les gérer
    // L'interception des WebSocket HMR se fait au niveau du serveur HTTP
    
    vite.middlewares(req, res, next);
  });

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Ne pas intercepter les routes API
    if (url.startsWith("/api/")) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      
      // Désactiver complètement le HMR en supprimant les scripts WebSocket
      // Cela évite les erreurs de connexion WebSocket
      let pageWithoutHMR = page;
      
      // Supprimer tous les scripts @vite/client (toutes les variantes possibles)
      // Format: <script type="module" src="/@vite/client"></script>
      pageWithoutHMR = pageWithoutHMR.replace(/<script[^>]*\/@vite\/client[^>]*>[\s\S]*?<\/script>/gi, '');
      pageWithoutHMR = pageWithoutHMR.replace(/<script[^>]*@vite\/client[^>]*>[\s\S]*?<\/script>/gi, '');
      // Format auto-closing: <script type="module" src="/@vite/client" />
      pageWithoutHMR = pageWithoutHMR.replace(/<script[^>]*\/@vite\/client[^>]*\/?>/gi, '');
      pageWithoutHMR = pageWithoutHMR.replace(/<script[^>]*@vite\/client[^>]*\/?>/gi, '');
      
      // Ne pas supprimer les autres scripts ou références
      // Seulement supprimer les scripts @vite/client pour éviter le HMR
      
      res.status(200).set({ "Content-Type": "text/html" }).end(pageWithoutHMR);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
