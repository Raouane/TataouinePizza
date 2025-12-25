import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import PgTypes from "pg-types";

// Custom types parser to correctly parse booleans
const BOOL_OID = 16; // PostgreSQL boolean type OID
PgTypes.setTypeParser(BOOL_OID, (val: string) => val === 't' || val === 'true' || val === '1');

// Parser pour les types NUMERIC (coordonnées GPS, prix, etc.)
// PostgreSQL retourne les NUMERIC comme des strings, on les convertit en numbers
const NUMERIC_OID = 1700; // PostgreSQL numeric type OID
PgTypes.setTypeParser(NUMERIC_OID, (val: string) => {
  if (val === null || val === undefined || val === '') return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
});

if (!process.env.DATABASE_URL) {
  console.error("[DB] ERREUR: DATABASE_URL n'est pas défini dans les variables d'environnement");
  throw new Error("DATABASE_URL is required");
}

// Log de débogage (masquer le mot de passe)
const dbUrl = process.env.DATABASE_URL;
const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@'); // Masquer le mot de passe
console.log("[DB] DATABASE_URL:", maskedUrl);

// Vérifier et corriger l'URL si le port manque pour Render
let connectionString = process.env.DATABASE_URL;
if (connectionString.includes('.render.com') && !connectionString.match(/:\d+\//)) {
  // Ajouter le port 5432 si manquant pour Render
  connectionString = connectionString.replace('.render.com/', '.render.com:5432/');
  console.log("[DB] Port 5432 ajouté automatiquement pour Render");
}

// Ajouter SSL pour Render PostgreSQL si pas déjà présent
if (connectionString.includes('.render.com') && !connectionString.includes('sslmode=')) {
  connectionString += (connectionString.includes('?') ? '&' : '?') + 'sslmode=require';
  console.log("[DB] SSL mode ajouté automatiquement pour Render");
}

const pool = new Pool({
  connectionString,
});

// Test de connexion
pool.on("error", (err) => {
  console.error("[DB] Erreur de connexion PostgreSQL:", err);
});

pool.on("connect", () => {
  console.log("[DB] Connexion PostgreSQL établie");
});

export const db = drizzle(pool);
