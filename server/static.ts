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
  
  // Lister les fichiers dans dist/public pour déboguer
  try {
    const files = fs.readdirSync(actualDistPath);
    console.log(`[STATIC] 📋 Fichiers dans dist/public (${files.length}):`, files.slice(0, 20).join(', '));
    const logoExists = files.includes('logo.jpeg');
    console.log(`[STATIC] ${logoExists ? '✅' : '❌'} logo.jpeg ${logoExists ? 'trouvé' : 'NON trouvé'} dans dist/public`);
  } catch (err) {
    console.error(`[STATIC] ⚠️ Erreur lecture dist/public:`, err);
  }

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
      console.log(`[STATIC] 🔍 Vérification fallback pour: ${req.path}`);
      console.log(`[STATIC]   Chemin fallback: ${fallbackPath}`);
      console.log(`[STATIC]   Existe: ${fs.existsSync(fallbackPath)}`);
      if (fs.existsSync(fallbackPath)) {
        const stats = fs.statSync(fallbackPath);
        console.log(`[STATIC]   Est fichier: ${stats.isFile()}`);
        if (stats.isFile()) {
          console.log(`[STATIC] 📦 Fichier servi depuis fallback: ${req.path}`);
          // Définir le bon Content-Type pour les images
          const ext = path.extname(fallbackPath).toLowerCase();
          const contentTypeMap: Record<string, string> = {
            '.jpeg': 'image/jpeg',
            '.jpg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.webp': 'image/webp',
            '.ico': 'image/x-icon',
          };
          if (contentTypeMap[ext]) {
            res.setHeader('Content-Type', contentTypeMap[ext]);
            console.log(`[STATIC]   Content-Type défini: ${contentTypeMap[ext]}`);
          }
          return res.sendFile(fallbackPath);
        }
      } else {
        console.log(`[STATIC] ⚠️ Fichier non trouvé dans fallback: ${req.path}`);
      }
      
      // Le fichier n'existe nulle part, passer au middleware suivant
      next();
    });
    console.log(`[STATIC] ✅ Fallback configuré pour: ${sourcePublicPath}`);
  }
  
  // Servir les fichiers statiques depuis dist/public
  app.use(express.static(actualDistPath));

  // fall through to index.html if the file doesn't exist
  // MAIS ignorer les routes API et les fichiers statiques
  app.use("*", (req, res, next) => {
    // Ne pas intercepter les routes API
    if (req.originalUrl?.startsWith("/api/") || req.url?.startsWith("/api/")) {
      return next();
    }
    
    // Ne pas intercepter les fichiers statiques (images, CSS, JS, audio, etc.)
    // Si c'est un fichier statique qui n'a pas été trouvé, retourner 404 au lieu de index.html
    const ext = path.extname(req.path).toLowerCase();
    const staticExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.css', '.js', '.woff', '.woff2', '.ttf', '.ico', '.json', '.mp3', '.m4a', '.ogg', '.wav'];
    if (staticExtensions.includes(ext)) {
      console.log(`[STATIC] ⚠️ Fichier statique non trouvé: ${req.path}`);
      return res.status(404).send('File not found');
    }
    
    // Servir index.html pour toutes les autres routes (SPA routing)
    res.sendFile(path.resolve(actualDistPath, "index.html"));
  });
}
