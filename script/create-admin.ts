import "dotenv/config";
import { db } from "../server/db";
import { adminUsers } from "../shared/schema";
import { hashPassword } from "../server/auth";
import { eq } from "drizzle-orm";

async function createAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error("❌ Usage: npm run create-admin <email> <password>");
    console.error("   Exemple: npm run create-admin admin@example.com mypassword123");
    process.exit(1);
  }

  try {
    console.log(`🔐 Création d'un admin avec l'email: ${email}`);

    // Vérifier si l'admin existe déjà
    const existing = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);

    if (existing.length > 0) {
      console.log("⚠️  Un admin avec cet email existe déjà !");
      console.log("   Si vous voulez changer le mot de passe, supprimez d'abord l'admin existant.");
      process.exit(1);
    }

    // Hasher le mot de passe
    const hashedPassword = await hashPassword(password);

    // Créer l'admin
    const result = await db
      .insert(adminUsers)
      .values({
        email,
        password: hashedPassword,
      })
      .returning();

    if (result && result.length > 0) {
      console.log("✅ Admin créé avec succès !");
      console.log(`   ID: ${result[0].id}`);
      console.log(`   Email: ${result[0].email}`);
      console.log("\n💡 Vous pouvez maintenant vous connecter avec ces identifiants.");
    } else {
      console.error("❌ Erreur: L'admin n'a pas pu être créé");
      process.exit(1);
    }
  } catch (error: any) {
    console.error("❌ Erreur lors de la création de l'admin:", error.message);
    if (error.code === "23505") {
      console.error("   Un admin avec cet email existe déjà !");
    }
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createAdmin();


