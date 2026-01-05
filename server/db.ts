import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import PgTypes from "pg-types";
import dns from "dns";

// ✅ FIX : Forcer IPv4 pour éviter les problèmes ENETUNREACH avec IPv6
dns.setDefaultResultOrder('ipv4first');

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

// ✅ FIX : Encoder correctement l'URL pour gérer les caractères spéciaux dans le mot de passe
let connectionString = process.env.DATABASE_URL;

// Si l'URL contient un mot de passe avec des caractères spéciaux non encodés, l'encoder
try {
  // Parser l'URL pour extraire les composants
  const urlMatch = connectionString.match(/^postgresql:\/\/([^:]+):([^@]+)@(.+)$/);
  if (urlMatch) {
    const [, user, password, rest] = urlMatch;
    // Encoder le mot de passe si nécessaire
    const encodedPassword = encodeURIComponent(password);
    // Reconstruire l'URL avec le mot de passe encodé
    connectionString = `postgresql://${user}:${encodedPassword}@${rest}`;
    console.log("[DB] Mot de passe encodé pour gérer les caractères spéciaux");
  }
} catch (e) {
  // Si le parsing échoue, utiliser l'URL telle quelle
  console.log("[DB] Utilisation de l'URL telle quelle (déjà encodée ou format différent)");
}

// Vérifier et corriger l'URL si le port manque pour Render
if (connectionString.includes('.render.com') && !connectionString.match(/:\d+\//)) {
  // Ajouter le port 5432 si manquant pour Render
  connectionString = connectionString.replace('.render.com/', '.render.com:5432/');
  console.log("[DB] Port 5432 ajouté automatiquement pour Render");
}

// ✅ FIX : Configurer SSL pour Supabase (gérer les certificats)
const isSupabase = connectionString.includes('.supabase.co') || 
                   connectionString.includes('.supabase.com') || 
                   connectionString.includes('pooler.supabase.com') ||
                   connectionString.includes('supabase');
const isRender = connectionString.includes('.render.com');

// Ajouter SSL pour Supabase et Render PostgreSQL si pas déjà présent
if ((isSupabase || isRender) && !connectionString.includes('sslmode=')) {
  connectionString += (connectionString.includes('?') ? '&' : '?') + 'sslmode=require';
  console.log("[DB] SSL mode ajouté automatiquement");
}

// ✅ FIX : Configuration SSL pour Supabase (accepter les certificats)
// IMPORTANT : Toujours appliquer rejectUnauthorized: false pour Supabase
const poolConfig: any = {
  connectionString,
};

// ✅ FIX FORCÉ : Pour Supabase, TOUJOURS configurer SSL pour accepter les certificats
// Même si sslmode est déjà dans l'URL, on doit configurer rejectUnauthorized dans l'objet Pool
console.log("[DB] 🔍 Détection connexion - isSupabase:", isSupabase, "isRender:", isRender, "PGSSLMODE:", process.env.PGSSLMODE);

// ✅ PRIORITÉ 1 : Si PGSSLMODE=no-verify est défini, l'utiliser pour TOUTES les connexions
if (process.env.PGSSLMODE === 'no-verify') {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
  console.log("[DB] ✅✅✅ Configuration SSL via PGSSLMODE=no-verify (PRIORITÉ)");
} else if (isSupabase) {
  // ✅ PRIORITÉ 2 : Pour Supabase, TOUJOURS configurer SSL pour accepter les certificats
  poolConfig.ssl = {
    rejectUnauthorized: false, // Accepter les certificats Supabase (auto-signés)
  };
  console.log("[DB] ✅✅✅ Configuration SSL Supabase FORCÉE (rejectUnauthorized: false)");
  console.log("[DB] ✅ URL Supabase détectée:", connectionString.includes('pooler') ? 'Pooler' : 'Direct');
  console.log("[DB] ✅ Certificats auto-signés acceptés");
} else if (isRender) {
  // ✅ PRIORITÉ 3 : Pour Render PostgreSQL, on peut aussi avoir besoin de cette config
  poolConfig.ssl = {
    rejectUnauthorized: false, // Accepter les certificats Render
  };
  console.log("[DB] ✅ Configuration SSL Render appliquée (rejectUnauthorized: false)");
}

// Log final de la configuration SSL
if (poolConfig.ssl) {
  console.log("[DB] ✅✅✅ Configuration SSL finale appliquée:", JSON.stringify(poolConfig.ssl));
} else {
  console.log("[DB] ⚠️ Aucune configuration SSL appliquée - risque d'erreur SSL");
}

const pool = new Pool(poolConfig);

// Test de connexion
pool.on("error", (err) => {
  console.error("[DB] Erreur de connexion PostgreSQL:", err);
});

pool.on("connect", () => {
  console.log("[DB] Connexion PostgreSQL établie");
});

export const db = drizzle(pool);
