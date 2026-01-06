import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

// Vérifier la configuration Twilio au démarrage
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
  console.log('[STARTUP] ✅ Twilio configuré');
  console.log('[STARTUP]   - Account SID:', twilioAccountSid.substring(0, 10) + '...');
  console.log('[STARTUP]   - Phone Number:', twilioPhoneNumber);
  
  // Vérifier la configuration WhatsApp
  if (twilioWhatsAppNumber) {
    console.log('[STARTUP] ✅ WhatsApp configuré');
    console.log('[STARTUP]   - WhatsApp Number:', twilioWhatsAppNumber);
  } else {
    console.warn('[STARTUP] ⚠️ WhatsApp non configuré');
    console.warn('[STARTUP]   - TWILIO_WHATSAPP_NUMBER manquant');
    console.warn('[STARTUP]   Les notifications WhatsApp ne seront pas envoyées');
  }
} else {
  console.warn('[STARTUP] ⚠️ Twilio non configuré');
  console.warn('[STARTUP]   Variables manquantes:', {
    TWILIO_ACCOUNT_SID: !!twilioAccountSid,
    TWILIO_AUTH_TOKEN: !!twilioAuthToken,
    TWILIO_PHONE_NUMBER: !!twilioPhoneNumber,
  });
  console.warn('[STARTUP]   Les SMS ne seront pas envoyés');
}

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody?: Buffer;
  }
}

// Sécurité : Helmet pour les headers HTTP sécurisés
// Configuration CSP pour autoriser les images externes (nécessaire pour les images de restaurants)
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'", 
          "'unsafe-inline'", // Tailwind nécessite unsafe-inline
          "https://fonts.googleapis.com", // Google Fonts CSS
        ],
        scriptSrc: [
          "'self'", 
          "'unsafe-inline'", // Tailwind nécessite unsafe-inline
          "'unsafe-eval'", // Vite nécessite unsafe-eval en dev
          "https://js.stripe.com", // Stripe.js
          "https://js.clover.com", // Stripe Clover (utilisé par Stripe.js)
        ],
        scriptSrcElem: [
          "'self'",
          "'unsafe-inline'",
          "https://js.stripe.com", // Stripe.js (pour les éléments <script>)
          "https://js.clover.com", // Stripe Clover
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:", // Autoriser toutes les images HTTPS (pour les images externes)
          "http:", // Autoriser HTTP en dev (peut être retiré en production)
        ],
        connectSrc: [
          "'self'", 
          "https:", 
          "http:",
          "https://api.stripe.com", // API Stripe
          "ws://localhost:5000", // WebSocket serveur (même port que le serveur)
          "ws://localhost:5173", // HMR WebSocket (port Vite alternatif)
          "ws://localhost:24678", // WebSocket serveur (port alternatif - peut être utilisé par Vite ou autres services)
          "ws://127.0.0.1:5000",
          "ws://127.0.0.1:5173",
          "ws://127.0.0.1:24678", // WebSocket serveur (port alternatif)
          // En développement, autoriser aussi les ports communs pour Vite et autres services
          ...(process.env.NODE_ENV === "development" ? [
            "ws://localhost:3000",
            "ws://localhost:3001",
            "ws://localhost:8080",
            "ws://localhost:8081",
            "ws://127.0.0.1:3000",
            "ws://127.0.0.1:3001",
            "ws://127.0.0.1:8080",
            "ws://127.0.0.1:8081",
          ] : []),
        ], // Pour les API externes et HMR WebSocket
        fontSrc: [
          "'self'", 
          "data:",
          "https://fonts.gstatic.com", // Google Fonts fichiers de polices
        ],
        workerSrc: [
          "'self'",
          "blob:", // Nécessaire pour canvas-confetti qui utilise des workers blob
        ],
        objectSrc: ["'none'"],
        mediaSrc: [
          "'self'",
          "data:", // Nécessaire pour les fichiers audio en base64 (notifications sonores)
        ],
        frameSrc: [
          "'self'",
          "https://js.stripe.com", // Stripe iframes (CardElement, etc.)
          "https://hooks.stripe.com", // Stripe webhooks iframes
        ],
      },
    } : false, // Désactiver CSP en développement pour éviter les problèmes avec Stripe.js et Vite
  })
);

// CORS : Permet les requêtes cross-origin (peut être restreint plus tard)
app.use(cors());

app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Log toutes les requêtes API pour diagnostiquer
  if (path.startsWith("/api")) {
    console.log(`\n[API REQUEST] 🔵 ${req.method} ${path}`);
    console.log(`[API REQUEST]    URL complète: ${req.originalUrl || req.url}`);
    if (path.includes('/menu')) {
      console.log(`[API REQUEST]    ⚠️  REQUÊTE MENU DÉTECTÉE - Cela devrait déclencher les logs du menu!`);
    }
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse && process.env.NODE_ENV !== "production") {
        const jsonString = JSON.stringify(capturedJsonResponse);
        // Limiter la taille du log à 500 caractères pour éviter les logs trop volumineux
        logLine += ` :: ${jsonString.slice(0, 500)}${jsonString.length > 500 ? "..." : ""}`;
      }

      console.log(`[API RESPONSE] ✅ ${req.method} ${path} ${res.statusCode} in ${duration}ms`);
      if (path.includes('/menu') && capturedJsonResponse) {
        const isArray = Array.isArray(capturedJsonResponse);
        const count = isArray ? capturedJsonResponse.length : (capturedJsonResponse ? 1 : 0);
        console.log(`[API RESPONSE]    Menu: ${count} produit(s) retourné(s)`);
        if (isArray && capturedJsonResponse.length > 0) {
          const firstProduct = capturedJsonResponse[0];
          console.log(`[API RESPONSE]    Premier produit: "${firstProduct.name}"`);
          console.log(`[API RESPONSE]    Premier produit imageUrl: ${firstProduct.imageUrl || 'NULL'}`);
        }
      }
      log(logLine, "api");
    }
  });

  next();
});

(async () => {
  // ✅ IMPORTANT : Enregistrer les routes publiques AVANT tout autre middleware
  // Cela garantit que /accept/:orderId et /refuse/:orderId sont accessibles
  await registerRoutes(httpServer, app);

  // ✅ Middleware global de gestion des erreurs (doit être APRÈS toutes les routes)
  const { errorMiddleware } = await import("./middlewares/error-handler.js");
  app.use(errorMiddleware);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
