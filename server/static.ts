import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // En production, __dirname pointe vers dist/ (où se trouve le fichier compilé)
  // Le dossier public est à dist/public
  const distPath = path.resolve(__dirname, "public");
  
  // Aussi essayer depuis la racine du projet (pour Render)
  const projectRoot = process.cwd();
  const distPathFromRoot = path.resolve(projectRoot, "dist", "public");
  
  let actualDistPath = distPath;
  if (!fs.existsSync(distPath) && fs.existsSync(distPathFromRoot)) {
    actualDistPath = distPathFromRoot;
  }
  
  if (!fs.existsSync(actualDistPath)) {
    throw new Error(
      `Could not find the build directory: ${actualDistPath}, make sure to build the client first`,
    );
  }

  console.log(`[STATIC] 📁 Servir les fichiers statiques depuis: ${actualDistPath}`);

  // IMPORTANT: En production sur Render, les fichiers de client/public sont copiés dans dist/public par Vite
  // Mais si les fichiers ne sont pas trouvés dans dist/public, servir depuis client/public comme fallback
  const sourcePublicPath = path.resolve(projectRoot, "client", "public");
  
  // Middleware pour servir depuis le fallback AVANT de servir depuis dist/public
  // Cela permet de servir logo.jpeg, favicon, etc. même s'ils ne sont pas dans dist/public
  if (fs.existsSync(sourcePublicPath)) {
    app.use((req, res, next) => {
      // Ne pas intercepter les routes API
      if (req.originalUrl?.startsWith("/api/") || req.url?.startsWith("/api/")) {
        return next();
      }
      
      // Ne pas servir index.html depuis le fallback (utiliser celui de dist)
      if (req.path === "/" || req.path === "/index.html") {
        return next();
      }
      
      // Vérifier d'abord si le fichier existe dans dist/public
      const distFilePath = path.join(actualDistPath, req.path);
      if (fs.existsSync(distFilePath) && fs.statSync(distFilePath).isFile()) {
        // Le fichier existe dans dist, laisser express.static() le servir
        return next();
      }
      
      // Sinon, vérifier dans le fallback
      const fallbackPath = path.join(sourcePublicPath, req.path);
      if (fs.existsSync(fallbackPath) && fs.statSync(fallbackPath).isFile()) {
        console.log(`[STATIC] 📦 Fichier servi depuis fallback: ${req.path}`);
        return res.sendFile(fallbackPath);
      }
      
      // Le fichier n'existe nulle part, passer au middleware suivant
      next();
    });
    console.log(`[STATIC] ✅ Fallback configuré pour: ${sourcePublicPath}`);
  }
  
  // Servir les fichiers statiques depuis dist/public
  app.use(express.static(actualDistPath));

  // fall through to index.html if the file doesn't exist
  // MAIS ignorer les routes API
  app.use("*", (req, res, next) => {
    // Ne pas intercepter les routes API
    if (req.originalUrl?.startsWith("/api/") || req.url?.startsWith("/api/")) {
      return next();
    }
    
    // Servir index.html pour toutes les autres routes (SPA routing)
    res.sendFile(path.resolve(actualDistPath, "index.html"));
  });
}
