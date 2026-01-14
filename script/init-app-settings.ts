/**
 * Script pour initialiser les settings de l'application
 * Usage: npm run init-settings
 */

import { db } from "../server/db.js";
import { appSettings } from "../shared/schema.js";
import { eq } from "drizzle-orm";

async function initAppSettings() {
  try {
    console.log("[Init Settings] 🚀 Initialisation des settings...");

    // Vérifier si le setting existe déjà
    const existing = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "delivery_modes_enabled"))
      .limit(1);

    if (existing.length > 0) {
      console.log("[Init Settings] ✅ Setting 'delivery_modes_enabled' existe déjà");
      console.log(`[Init Settings] 📋 Valeur actuelle: ${existing[0].value}`);
      return;
    }

    // Créer le setting par défaut
    await db.insert(appSettings).values({
      key: "delivery_modes_enabled",
      value: "true", // Par défaut, activé (affiche la page des modes de livraison)
      description: "Active ou désactive la page des modes de livraison sur la page d'accueil",
    });

    console.log("[Init Settings] ✅ Setting 'delivery_modes_enabled' créé avec succès");
    console.log("[Init Settings] 📋 Valeur par défaut: true (page des modes de livraison)");
  } catch (error) {
    console.error("[Init Settings] ❌ Erreur:", error);
    process.exit(1);
  }
}

initAppSettings()
  .then(() => {
    console.log("[Init Settings] ✅ Initialisation terminée");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[Init Settings] ❌ Erreur fatale:", error);
    process.exit(1);
  });
