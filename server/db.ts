import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import PgTypes from "pg-types";
import dns from "dns";

// ✅ FIX ULTIME : Désactiver la vérification SSL au niveau Node.js pour Supabase
// FORCER la désactivation pour éviter les erreurs de certificats auto-signés
if (process.env.DATABASE_URL?.includes('supabase')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.log("[DB] ⚠️ NODE_TLS_REJECT_UNAUTHORIZED=0 FORCÉ pour Supabase - Vérification SSL désactivée au niveau Node.js");
}
// Aussi vérifier si c'est déjà défini
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
  console.log("[DB] ⚠️ NODE_TLS_REJECT_UNAUTHORIZED=0 détecté - Vérification SSL désactivée au niveau Node.js");
}

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
console.log("[DB] DATABASE_URL (masqué):", maskedUrl);
console.log("[DB] DATABASE_URL length:", dbUrl?.length || 0);
console.log("[DB] DATABASE_URL contient 'supabase':", dbUrl?.includes('supabase') || false);
console.log("[DB] DATABASE_URL contient '%' (encodé):", dbUrl?.includes('%') || false);

// ✅ FIX : Encoder correctement l'URL pour gérer les caractères spéciaux dans le mot de passe
let connectionString = process.env.DATABASE_URL;

// ✅ FIX : Vérifier si le mot de passe est déjà encodé (contient %)
// Si oui, ne pas le ré-encoder (éviter le double encodage)
const isPasswordEncoded = connectionString.includes('%');

if (!isPasswordEncoded) {
  // Si l'URL contient un mot de passe avec des caractères spéciaux non encodés, l'encoder
  try {
    // Parser l'URL pour extraire les composants
    const urlMatch = connectionString.match(/^postgresql:\/\/([^:]+):([^@]+)@(.+)$/);
    if (urlMatch) {
      const [, user, password, rest] = urlMatch;
      // Encoder le mot de passe si nécessaire (seulement s'il n'est pas déjà encodé)
      const encodedPassword = encodeURIComponent(password);
      // Reconstruire l'URL avec le mot de passe encodé
      connectionString = `postgresql://${user}:${encodedPassword}@${rest}`;
      console.log("[DB] Mot de passe encodé pour gérer les caractères spéciaux");
    }
  } catch (e) {
    // Si le parsing échoue, utiliser l'URL telle quelle
    console.log("[DB] Utilisation de l'URL telle quelle (déjà encodée ou format différent)");
  }
} else {
  console.log("[DB] Mot de passe déjà encodé dans l'URL, pas de ré-encodage");
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

// ✅ PRIORITÉ 1 : FORCER PGSSLMODE=no-verify pour Supabase si non défini
if (isSupabase && !process.env.PGSSLMODE) {
  process.env.PGSSLMODE = 'no-verify';
  console.log("[DB] 🔧 PGSSLMODE=no-verify FORCÉ pour Supabase");
}

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

// ✅ FIX ULTIME : S'assurer que SSL est TOUJOURS configuré pour Supabase
// Même si la détection a échoué, forcer SSL si l'URL contient "supabase"
if (!poolConfig.ssl && (connectionString.includes('supabase') || process.env.PGSSLMODE === 'no-verify')) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
  console.log("[DB] ⚠️ SSL FORCÉ en dernier recours (fallback)");
}

// ✅ LOG : Vérifier le format de l'URL finale avant création du Pool
const finalMaskedUrl = connectionString.replace(/:([^:@]+)@/, ':****@');
console.log("[DB] 🔍 ConnectionString finale (masqué):", finalMaskedUrl);
console.log("[DB] 🔍 ConnectionString length:", connectionString.length);
console.log("[DB] 🔍 ConnectionString contient 'postgresql://':", connectionString.startsWith('postgresql://'));
console.log("[DB] 🔍 ConnectionString contient '@':", connectionString.includes('@'));

// ✅ FIX CRITIQUE : Vérifier une dernière fois que SSL est configuré avant de créer le Pool
if (isSupabase && !poolConfig.ssl) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
  console.log("[DB] 🔧 SSL FORCÉ juste avant création du Pool (dernière vérification)");
}

const pool = new Pool(poolConfig);

// ✅ FIX : Vérifier que la configuration SSL est bien appliquée
console.log("[DB] 🔍 Configuration Pool finale - SSL:", poolConfig.ssl ? JSON.stringify(poolConfig.ssl) : "NON CONFIGURÉ");
console.log("[DB] 🔍 NODE_TLS_REJECT_UNAUTHORIZED:", process.env.NODE_TLS_REJECT_UNAUTHORIZED);
console.log("[DB] 🔍 PGSSLMODE:", process.env.PGSSLMODE);

// Test de connexion
pool.on("error", (err) => {
  console.error("[DB] Erreur de connexion PostgreSQL:", err);
});

pool.on("connect", () => {
  console.log("[DB] Connexion PostgreSQL établie");
});

export const db = drizzle(pool);
