import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Servir les fichiers statiques (CSS, JS, images, etc.)
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  // MAIS ignorer les routes API
  app.use("*", (req, res, next) => {
    // Ne pas intercepter les routes API
    if (req.originalUrl?.startsWith("/api/") || req.url?.startsWith("/api/")) {
      return next();
    }
    
    // Servir index.html pour toutes les autres routes (SPA routing)
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
