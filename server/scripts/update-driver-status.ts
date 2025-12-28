import "dotenv/config";
import { db } from "../db.js";
import { drivers } from "@shared/schema";
import { eq } from "drizzle-orm";

async function updateDriverStatus() {
  const phone = "+33783698509";
  const name = "Raouane";

  try {
    // Vérifier si le livreur existe
    const existing = await db.select().from(drivers).where(eq(drivers.phone, phone));
    
    if (existing.length === 0) {
      console.log(`[UPDATE DRIVER] ❌ Le livreur avec le numéro ${phone} n'existe pas`);
      console.log(`[UPDATE DRIVER] 💡 Création du livreur...`);
      
      // Créer le livreur avec statut available
      const { hashPassword } = await import("../auth.js");
      const { randomUUID } = await import("crypto");
      const password = "driver123"; // Mot de passe par défaut
      const hashedPassword = await hashPassword(password);
      
      const [newDriver] = await db.insert(drivers).values({
        id: randomUUID(),
        name,
        phone,
        password: hashedPassword,
        status: "available",
        lastSeen: new Date(),
      }).returning();

      console.log(`[UPDATE DRIVER] ✅ Livreur créé avec succès !`);
      console.log(`[UPDATE DRIVER] ID: ${newDriver.id}`);
      console.log(`[UPDATE DRIVER] Nom: ${newDriver.name}`);
      console.log(`[UPDATE DRIVER] Téléphone: ${newDriver.phone}`);
      console.log(`[UPDATE DRIVER] Statut: ${newDriver.status}`);
      console.log(`[UPDATE DRIVER] Mot de passe: ${password} (à changer via l'admin)`);
      return;
    }

    const driver = existing[0];
    console.log(`[UPDATE DRIVER] ✅ Le livreur existe déjà`);
    console.log(`[UPDATE DRIVER] ID: ${driver.id}`);
    console.log(`[UPDATE DRIVER] Nom: ${driver.name}`);
    console.log(`[UPDATE DRIVER] Téléphone: ${driver.phone}`);
    console.log(`[UPDATE DRIVER] Statut actuel: ${driver.status}`);
    console.log(`[UPDATE DRIVER] Last seen: ${driver.lastSeen}`);

    // Mettre à jour le statut à "available" et last_seen à maintenant
    const [updated] = await db
      .update(drivers)
      .set({ 
        status: "available",
        lastSeen: new Date(),
        name: name // Mettre à jour le nom aussi
      })
      .where(eq(drivers.phone, phone))
      .returning();

    console.log(`[UPDATE DRIVER] ✅ Livreur mis à jour avec succès !`);
    console.log(`[UPDATE DRIVER] Nouveau statut: ${updated.status}`);
    console.log(`[UPDATE DRIVER] Nouveau last_seen: ${updated.lastSeen}`);
    console.log(`[UPDATE DRIVER] ✅ Le livreur ${name} (${phone}) est maintenant AVAILABLE et recevra les notifications WhatsApp`);
    
    process.exit(0);
  } catch (error: any) {
    console.error("[UPDATE DRIVER] ❌ Erreur:", error.message);
    console.error("[UPDATE DRIVER] Stack:", error.stack);
    process.exit(1);
  }
}

updateDriverStatus();

