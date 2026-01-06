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
  console.log(`[VITE] 🔍 Initialisation des fichiers statiques...`);
  console.log(`[VITE] 📁 Chemin public résolu: ${publicPath}`);
  console.log(`[VITE] 📁 Chemin public existe: ${fs.existsSync(publicPath) ? '✅ OUI' : '❌ NON'}`);
  
  if (fs.existsSync(publicPath)) {
    // Lister tous les fichiers dans public pour debug
    try {
      const publicFiles = fs.readdirSync(publicPath, { withFileTypes: true });
      console.log(`[VITE] 📂 Contenu de public/ (${publicFiles.length} éléments):`);
      publicFiles.forEach(file => {
        const fullPath = path.join(publicPath, file.name);
        if (file.isDirectory()) {
          console.log(`[VITE]   📁 ${file.name}/`);
          try {
            const subFiles = fs.readdirSync(fullPath);
            console.log(`[VITE]      ${subFiles.length} fichiers`);
          } catch (e) {
            console.log(`[VITE]      (erreur lecture)`);
          }
        } else {
          console.log(`[VITE]   📄 ${file.name}`);
        }
      });
    } catch (e) {
      console.error(`[VITE] ❌ Erreur lecture public/:`, e);
    }
    
    // Middleware avec logs TRÈS détaillés pour toutes les requêtes
    app.use((req, res, next) => {
      const isImage = req.path.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i);
      if (isImage) {
        console.log(`\n[STATIC] 🖼️  REQUÊTE IMAGE DÉTECTÉE`);
        console.log(`[STATIC]   Method: ${req.method}`);
        console.log(`[STATIC]   Path: ${req.path}`);
        console.log(`[STATIC]   OriginalUrl: ${req.originalUrl}`);
        console.log(`[STATIC]   Url: ${req.url}`);
        
        const filePath = path.join(publicPath, req.path);
        const exists = fs.existsSync(filePath);
        const isFile = exists ? fs.statSync(filePath).isFile() : false;
        
        console.log(`[STATIC]   Chemin recherché: ${filePath}`);
        console.log(`[STATIC]   Existe: ${exists ? '✅ OUI' : '❌ NON'}`);
        console.log(`[STATIC]   Est fichier: ${isFile ? '✅ OUI' : '❌ NON'}`);
        console.log(`[STATIC]   Public path: ${publicPath}`);
        
        if (!exists) {
          // Essayer de trouver des fichiers similaires
          const imagesDir = path.join(publicPath, "images", "products");
          if (fs.existsSync(imagesDir)) {
            const imageFiles = fs.readdirSync(imagesDir);
            console.log(`[STATIC]   📸 Fichiers disponibles dans images/products/ (${imageFiles.length}):`);
            imageFiles.slice(0, 10).forEach(f => console.log(`[STATIC]      - ${f}`));
            if (imageFiles.length > 10) {
              console.log(`[STATIC]      ... et ${imageFiles.length - 10} autres`);
            }
          }
        }
      }
      next();
    });
    
    // Middleware pour filtrer /src/ avant express.static()
    app.use((req, res, next) => {
      if (req.path.startsWith("/src/")) {
        if (req.path.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i)) {
          console.log(`[STATIC] ⏭️  Fichier /src/ ignoré (sera traité par Vite): ${req.path}`);
        }
        return next();
      }
      next();
    });
    
    // Wrapper autour de express.static() pour logger les réponses
    const staticMiddleware = express.static(publicPath, {
      index: false,
      maxAge: process.env.NODE_ENV === "production" ? "1y" : "0",
    });
    
    app.use((req, res, next) => {
      const isImage = req.path.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i);
      if (isImage) {
        console.log(`[STATIC] 🔄 Passage à express.static() pour: ${req.path}`);
        
        // Intercepter la réponse pour logger
        const originalEnd = res.end;
        const originalSend = res.send;
        const originalSendFile = res.sendFile;
        
        res.end = function(chunk?: any, encoding?: any) {
          if (isImage) {
            console.log(`[STATIC] 📤 express.static() a répondu avec end() - Status: ${res.statusCode}`);
          }
          return originalEnd.call(this, chunk, encoding);
        };
        
        res.send = function(body?: any) {
          if (isImage) {
            console.log(`[STATIC] 📤 express.static() a répondu avec send() - Status: ${res.statusCode}`);
          }
          return originalSend.call(this, body);
        };
        
        res.sendFile = function(filePath: string, options?: any, callback?: any) {
          if (isImage) {
            console.log(`[STATIC] 📤 express.static() a répondu avec sendFile() - Fichier: ${filePath}`);
          }
          return originalSendFile.call(this, filePath, options, callback);
        };
      }
      
      staticMiddleware(req, res, (err) => {
        if (isImage) {
          if (err) {
            console.log(`[STATIC] ❌ express.static() erreur: ${err.message}`);
          } else {
            console.log(`[STATIC] ✅ express.static() a terminé (status: ${res.statusCode}, headersSent: ${res.headersSent})`);
          }
        }
        next(err);
      });
    });
    
    console.log(`[VITE] ✅ Middleware express.static() monté sur: ${publicPath}`);
    
    // Lister les fichiers images disponibles
    const imagesDir = path.join(publicPath, "images", "products");
    if (fs.existsSync(imagesDir)) {
      const imageFiles = fs.readdirSync(imagesDir).filter(f => f.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i));
      console.log(`[VITE] 📸 ${imageFiles.length} fichiers images trouvés dans products/`);
      if (imageFiles.length > 0) {
        console.log(`[VITE] 📸 Exemples: ${imageFiles.slice(0, 5).join(', ')}`);
      }
    } else {
      console.warn(`[VITE] ⚠️  Dossier images/products/ non trouvé: ${imagesDir}`);
    }
  } else {
    console.error(`[VITE] ❌ Dossier public non trouvé: ${publicPath}`);
  }

  // Middleware pour ignorer les routes API et /accept/
  app.use((req, res, next) => {
    const isImage = req.path.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i);
    
    if (req.originalUrl?.startsWith("/api/") || req.url?.startsWith("/api/")) {
      return next();
    }
    // ✅ NOUVEAU : Ne pas intercepter les routes /accept/ et /refuse/ (gérées par le backend)
    if (req.originalUrl?.startsWith("/accept/") || req.url?.startsWith("/accept/") ||
        req.originalUrl?.startsWith("/refuse/") || req.url?.startsWith("/refuse/")) {
      if (isImage) {
        console.log(`[VITE] ⏭️ Route backend ignorée (ne devrait pas arriver pour images): ${req.originalUrl || req.url}`);
      }
      return next();
    }
    // ✅ IMPORTANT : Ne pas intercepter les fichiers statiques (images, etc.)
    // express.static() les sert déjà, on ne doit pas les passer à Vite
    // Mais laisser Vite traiter les fichiers CSS/JS dans /src/ (imports de modules)
    if (!req.path.startsWith("/src/") && req.path.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/i)) {
      if (isImage) {
        console.log(`[VITE] ⏭️ Fichier statique ignoré (déjà traité par express.static): ${req.path}`);
        console.log(`[VITE]    Status: ${res.statusCode}, headersSent: ${res.headersSent}`);
        if (!res.headersSent) {
          console.warn(`[VITE] ⚠️  ATTENTION: La réponse n'a pas été envoyée par express.static()!`);
        }
      }
      return next();
    }
    // Ne pas intercepter les scripts modules - laisser Vite les gérer
    // L'interception des WebSocket HMR se fait au niveau du serveur HTTP
    
    if (isImage) {
      console.log(`[VITE] 🔄 Passage à vite.middlewares() pour: ${req.path}`);
    }
    vite.middlewares(req, res, next);
  });

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    const isImage = url.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i);

    // Ne pas intercepter les routes API
    if (url.startsWith("/api/")) {
      return next();
    }
    
    // ✅ NOUVEAU : Ne pas intercepter les routes /accept/ et /refuse/ (gérées par le backend)
    if (url.startsWith("/accept/") || url.startsWith("/refuse/")) {
      return next();
    }
    
    // ✅ IMPORTANT : Ne pas intercepter les fichiers statiques (images, etc.)
    // express.static() les sert déjà, on ne doit pas les passer à Vite
    // Mais laisser Vite traiter les fichiers CSS/JS dans /src/ (imports de modules)
    if (!url.startsWith("/src/") && url.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/i)) {
      if (isImage) {
        console.log(`[VITE] ⏭️ Catch-all: Fichier statique ignoré: ${url}`);
        console.log(`[VITE]    Status: ${res.statusCode}, headersSent: ${res.headersSent}`);
        if (!res.headersSent) {
          console.error(`[VITE] ❌ ERREUR CRITIQUE: La réponse n'a PAS été envoyée pour ${url}!`);
        }
      }
      return next();
    }
    
    if (isImage) {
      console.log(`[VITE] ⚠️  Catch-all: Image passée à transformIndexHtml (ne devrait pas arriver): ${url}`);
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
