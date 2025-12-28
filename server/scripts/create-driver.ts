import "dotenv/config";
import { db } from "../db.js";
import { drivers } from "@shared/schema";
import { hashPassword } from "../auth.js";
import { eq } from "drizzle-orm";

async function createDriver() {
  const phone = "+33783698509";
  const name = "Raouane";
  const password = "driver123"; // Mot de passe par défaut

  try {
    // Vérifier si le livreur existe déjà
    const existing = await db.select().from(drivers).where(eq(drivers.phone, phone));
    
    if (existing.length > 0) {
      console.log(`[CREATE DRIVER] ✅ Le livreur avec le numéro ${phone} existe déjà`);
      console.log(`[CREATE DRIVER] ID: ${existing[0].id}`);
      console.log(`[CREATE DRIVER] Nom: ${existing[0].name}`);
      console.log(`[CREATE DRIVER] Statut: ${existing[0].status}`);
      return;
    }

    // Créer le livreur
    const hashedPassword = await hashPassword(password);
    
    const [newDriver] = await db.insert(drivers).values({
      name,
      phone,
      password: hashedPassword,
      status: "available",
      lastSeen: new Date(),
    }).returning();

    console.log(`[CREATE DRIVER] ✅ Livreur créé avec succès !`);
    console.log(`[CREATE DRIVER] ID: ${newDriver.id}`);
    console.log(`[CREATE DRIVER] Nom: ${newDriver.name}`);
    console.log(`[CREATE DRIVER] Téléphone: ${newDriver.phone}`);
    console.log(`[CREATE DRIVER] Statut: ${newDriver.status}`);
    console.log(`[CREATE DRIVER] Mot de passe: ${password} (à changer via l'admin)`);
    
    process.exit(0);
  } catch (error: any) {
    console.error("[CREATE DRIVER] ❌ Erreur:", error.message);
    process.exit(1);
  }
}

createDriver();

