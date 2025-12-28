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

if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
  console.log('[STARTUP] ✅ Twilio configuré');
  console.log('[STARTUP]   - Account SID:', twilioAccountSid.substring(0, 10) + '...');
  console.log('[STARTUP]   - Phone Number:', twilioPhoneNumber);
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
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'", 
          "'unsafe-inline'", // Tailwind nécessite unsafe-inline
          "https://fonts.googleapis.com", // Google Fonts CSS
        ],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Vite nécessite unsafe-eval en dev
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
          "ws://localhost:5000", // HMR WebSocket (même port que le serveur)
          "ws://localhost:5173", // HMR WebSocket (port Vite alternatif)
          "ws://127.0.0.1:5000",
          "ws://127.0.0.1:5173",
        ], // Pour les API externes et HMR WebSocket
        fontSrc: [
          "'self'", 
          "data:",
          "https://fonts.gstatic.com", // Google Fonts fichiers de polices
        ],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
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

      log(logLine, "api");
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (process.env.NODE_ENV !== "production") {
      console.error(err);
    }

    res.status(status).json({ message });
  });

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
