/**
 * Script de diagnostic pour vérifier la connexion à la base de données
 */

import { db } from "../db";

async function checkConnection() {
  try {
    console.log("\n[DB Check] 🔍 Vérification de la connexion à la base de données...\n");
    
    // Vérifier les variables d'environnement
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error("[DB Check] ❌ DATABASE_URL n'est pas défini dans les variables d'environnement");
      console.error("\n💡 Solution:");
      console.error("   1. Créez un fichier .env à la racine du projet");
      console.error("   2. Ajoutez: DATABASE_URL=postgresql://user:password@host:port/database");
      console.error("   3. Remplacez user, password, host, port, database par vos valeurs");
      process.exit(1);
    }
    
    // Masquer le mot de passe dans les logs
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
    console.log("[DB Check] ✅ DATABASE_URL est défini");
    console.log("[DB Check]    URL (masquée):", maskedUrl);
    console.log("[DB Check]    Longueur:", dbUrl.length);
    console.log("[DB Check]    Contient 'supabase':", dbUrl.includes('supabase'));
    console.log("[DB Check]    Contient 'render':", dbUrl.includes('render'));
    
    // Tester la connexion avec une requête simple
    console.log("\n[DB Check] 🔄 Test de connexion...");
    const result = await db.execute(`
      SELECT 
        current_database() as database,
        current_user as user,
        version() as version,
        (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count
    `);
    
    if (result.rows && result.rows.length > 0) {
      const info = result.rows[0] as any;
      console.log("\n[DB Check] ✅ Connexion réussie!");
      console.log("[DB Check]    Base de données:", info.database);
      console.log("[DB Check]    Utilisateur:", info.user);
      console.log("[DB Check]    Version PostgreSQL:", info.version?.split('\n')[0]);
      console.log("[DB Check]    Nombre de tables:", info.table_count);
      
      // Vérifier si la table restaurants existe
      const restaurantsCheck = await db.execute(`
        SELECT COUNT(*) as count FROM restaurants
      `);
      const restaurantCount = (restaurantsCheck.rows?.[0] as any)?.count || 0;
      console.log("[DB Check]    Restaurants dans la base:", restaurantCount);
      
      if (restaurantCount === 0) {
        console.log("\n⚠️  Aucun restaurant trouvé dans la base de données");
        console.log("💡 Solution: Exécutez le script de seed pour créer des restaurants de démonstration");
      }
    }
    
    console.log("\n[DB Check] ✅ Diagnostic terminé avec succès\n");
    process.exit(0);
  } catch (error: any) {
    console.error("\n[DB Check] ❌ Erreur de connexion:", error.message);
    
    if (error.code === '28P01') {
      console.error("\n💡 Erreur 28P01: Identifiants PostgreSQL invalides");
      console.error("\nSolutions possibles:");
      console.error("   1. Vérifiez que DATABASE_URL contient le bon utilisateur et mot de passe");
      console.error("   2. Si le mot de passe contient des caractères spéciaux, assurez-vous qu'il est encodé");
      console.error("   3. Vérifiez que l'utilisateur PostgreSQL a les permissions nécessaires");
      console.error("   4. Vérifiez que le serveur PostgreSQL est accessible depuis votre machine");
    } else if (error.code === 'ECONNREFUSED') {
      console.error("\n💡 Erreur ECONNREFUSED: Impossible de se connecter au serveur");
      console.error("   Vérifiez que:");
      console.error("   - Le serveur PostgreSQL est démarré");
      console.error("   - L'URL de connexion est correcte (host, port)");
      console.error("   - Le pare-feu autorise la connexion");
    } else if (error.code === '3D000') {
      console.error("\n💡 Erreur 3D000: La base de données n'existe pas");
      console.error("   Créez la base de données avec: CREATE DATABASE nom_de_la_base;");
    }
    
    process.exit(1);
  }
}

checkConnection();
