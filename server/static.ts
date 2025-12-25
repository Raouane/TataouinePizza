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

  // Servir les fichiers statiques (CSS, JS, images, etc.)
  app.use(express.static(actualDistPath));

  // IMPORTANT: En production sur Render, les fichiers de client/public sont copiés dans dist/public par Vite
  // Mais si les images ne sont pas trouvées dans dist/public, servir depuis client/public comme fallback
  const sourcePublicPath = path.resolve(projectRoot, "client", "public");
  if (fs.existsSync(sourcePublicPath)) {
    // Servir les images depuis le dossier source en fallback (pour Render)
    app.use("/images", express.static(path.join(sourcePublicPath, "images")));
    console.log(`[STATIC] ✅ Images servies depuis (fallback): ${path.join(sourcePublicPath, "images")}`);
  }

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
