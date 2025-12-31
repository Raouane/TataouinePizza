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
    
    // Vérifier si le dossier assets existe
    const assetsPath = path.join(actualDistPath, "assets");
    if (fs.existsSync(assetsPath)) {
      const assetsFiles = fs.readdirSync(assetsPath);
      console.log(`[STATIC] 📦 Dossier /assets/ trouvé avec ${assetsFiles.length} fichiers`);
      console.log(`[STATIC]   Fichiers: ${assetsFiles.slice(0, 20).join(', ')}${assetsFiles.length > 20 ? '...' : ''}`);
      
      // Vérifier si les fichiers JS et CSS spécifiques existent
      const jsFiles = assetsFiles.filter(f => f.endsWith('.js'));
      const cssFiles = assetsFiles.filter(f => f.endsWith('.css'));
      console.log(`[STATIC]   JS: ${jsFiles.length} fichiers, CSS: ${cssFiles.length} fichiers`);
      if (jsFiles.length > 0) {
        console.log(`[STATIC]   Exemples JS: ${jsFiles.slice(0, 3).join(', ')}`);
      }
      if (cssFiles.length > 0) {
        console.log(`[STATIC]   Exemples CSS: ${cssFiles.slice(0, 3).join(', ')}`);
      }
    } else {
      console.log(`[STATIC] ⚠️ Dossier /assets/ NON trouvé dans ${actualDistPath}`);
    }
  } catch (err) {
    console.error(`[STATIC] ⚠️ Erreur lecture dist/public:`, err);
  }

  // IMPORTANT: En production sur Render, les fichiers de client/public sont copiés dans dist/public par Vite
  // Mais si les fichiers ne sont pas trouvés dans dist/public, servir depuis client/public comme fallback
  const sourcePublicPath = path.resolve(projectRoot, "client", "public");
  
  // Middleware pour servir depuis le fallback UNIQUEMENT pour les fichiers de client/public
  // IMPORTANT: Ne pas intercepter les fichiers dans /assets/ (générés par Vite)
  // express.static() doit servir les fichiers depuis dist/public, y compris /assets/
  if (fs.existsSync(sourcePublicPath)) {
    app.use((req, res, next) => {
      // Ne pas intercepter les routes API
      if (req.originalUrl?.startsWith("/api/") || req.url?.startsWith("/api/")) {
        return next();
      }
      
      // Ne pas intercepter les fichiers dans /assets/ (générés par Vite)
      // Laisser express.static() les servir depuis dist/public/assets/
      if (req.path.startsWith("/assets/")) {
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
      
      // Sinon, vérifier dans le fallback (uniquement pour les fichiers de client/public)
      const fallbackPath = path.join(sourcePublicPath, req.path);
      if (fs.existsSync(fallbackPath)) {
        const stats = fs.statSync(fallbackPath);
        if (stats.isFile()) {
          console.log(`[STATIC] 📦 Fichier servi depuis fallback: ${req.path}`);
          // Définir le bon Content-Type pour les images et fichiers audio
          const ext = path.extname(fallbackPath).toLowerCase();
          const contentTypeMap: Record<string, string> = {
            '.jpeg': 'image/jpeg',
            '.jpg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.webp': 'image/webp',
            '.ico': 'image/x-icon',
            '.mp3': 'audio/mpeg',
            '.m4a': 'audio/mp4',
            '.ogg': 'audio/ogg',
            '.wav': 'audio/wav',
          };
          if (contentTypeMap[ext]) {
            res.setHeader('Content-Type', contentTypeMap[ext]);
          }
          return res.sendFile(fallbackPath);
        }
      }
      
      // Le fichier n'existe nulle part, passer au middleware suivant
      next();
    });
    console.log(`[STATIC] ✅ Fallback configuré pour: ${sourcePublicPath}`);
  }
  
  // Servir les fichiers statiques depuis dist/public
  // IMPORTANT: express.static() doit être appelé AVANT le catch-all
  // Il vérifie automatiquement si le fichier existe et le sert avec le bon Content-Type
  app.use((req, res, next) => {
    // Logger les requêtes pour /assets/ pour déboguer
    if (req.path.startsWith("/assets/")) {
      const filePath = path.join(actualDistPath, req.path);
      const exists = fs.existsSync(filePath);
      const isFile = exists ? fs.statSync(filePath).isFile() : false;
      console.log(`[STATIC] 📦 Requête /assets/: ${req.path}`);
      console.log(`[STATIC]   Chemin complet: ${filePath}`);
      console.log(`[STATIC]   Existe: ${exists ? '✅' : '❌'}, Est fichier: ${isFile ? '✅' : '❌'}`);
      
      // Si le fichier n'existe pas, vérifier si le dossier assets existe
      if (!exists) {
        const assetsDir = path.join(actualDistPath, "assets");
        const assetsExists = fs.existsSync(assetsDir);
        console.log(`[STATIC]   Dossier assets existe: ${assetsExists ? '✅' : '❌'}`);
        if (assetsExists) {
          try {
            const assetsFiles = fs.readdirSync(assetsDir);
            console.log(`[STATIC]   Fichiers dans assets (${assetsFiles.length}): ${assetsFiles.slice(0, 10).join(', ')}${assetsFiles.length > 10 ? '...' : ''}`);
          } catch (err) {
            console.error(`[STATIC]   Erreur lecture assets:`, err);
          }
        }
      }
    }
    next();
  });

  // Middleware pour servir manuellement les fichiers /assets/ si express.static() ne les trouve pas
  app.use((req, res, next) => {
    if (req.path.startsWith("/assets/")) {
      const filePath = path.join(actualDistPath, req.path);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        // Le fichier existe, le servir manuellement avec le bon Content-Type
        const ext = path.extname(filePath).toLowerCase();
        const contentTypeMap: Record<string, string> = {
          '.js': 'application/javascript',
          '.mjs': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
          '.ttf': 'font/ttf',
        };
        if (contentTypeMap[ext]) {
          res.setHeader('Content-Type', contentTypeMap[ext]);
        }
        console.log(`[STATIC] ✅ Fichier /assets/ servi manuellement: ${req.path}`);
        return res.sendFile(filePath);
      }
    }
    next();
  });

  app.use(express.static(actualDistPath, {
    // Ne pas servir index.html automatiquement pour les routes SPA
    index: false,
    // Définir les types MIME corrects
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      const contentTypeMap: Record<string, string> = {
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.mp3': 'audio/mpeg',
        '.m4a': 'audio/mp4',
        '.ogg': 'audio/ogg',
        '.wav': 'audio/wav',
      };
      if (contentTypeMap[ext]) {
        res.setHeader('Content-Type', contentTypeMap[ext]);
      }
    },
  }));

  // fall through to index.html if the file doesn't exist
  // MAIS ignorer les routes API et les fichiers statiques
  // IMPORTANT: Ce middleware ne s'exécute QUE si express.static() n'a pas trouvé le fichier
  // Utiliser app.use() au lieu de app.get() pour intercepter toutes les méthodes HTTP
  // mais seulement après que express.static() ait eu l'occasion de servir les fichiers
  app.use((req, res, next) => {
    // Ne pas intercepter les routes API
    if (req.originalUrl?.startsWith("/api/") || req.url?.startsWith("/api/")) {
      return next();
    }
    
    // Si la réponse a déjà été envoyée (par express.static()), ne rien faire
    if (res.headersSent) {
      return;
    }
    
    // Vérifier si c'est une requête pour un fichier statique
    const ext = path.extname(req.path).toLowerCase();
    const staticExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.css', '.js', '.mjs', '.woff', '.woff2', '.ttf', '.ico', '.json', '.mp3', '.m4a', '.ogg', '.wav'];
    
    if (staticExtensions.includes(ext)) {
      // Si c'est un fichier statique qui n'a pas été trouvé par express.static(),
      // vérifier s'il existe vraiment
      const filePath = path.join(actualDistPath, req.path);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        // Le fichier existe mais n'a pas été servi par express.static()
        // Cela ne devrait pas arriver, mais servir le fichier manuellement
        console.log(`[STATIC] ⚠️ Fichier statique existe mais non servi par express.static(): ${req.path}`);
        const ext = path.extname(filePath).toLowerCase();
        const contentTypeMap: Record<string, string> = {
          '.js': 'application/javascript',
          '.mjs': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
        };
        if (contentTypeMap[ext]) {
          res.setHeader('Content-Type', contentTypeMap[ext]);
        }
        return res.sendFile(filePath);
      }
      // Le fichier n'existe pas, retourner 404
      console.log(`[STATIC] ⚠️ Fichier statique non trouvé: ${req.path}`);
      return res.status(404).send('File not found');
    }
    
    // Pour les routes SPA (pas de fichier statique), servir index.html
    const indexPath = path.resolve(actualDistPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('index.html not found');
    }
  });
}
