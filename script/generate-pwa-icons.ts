import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

/**
 * Script pour générer les icônes PWA (192x192 et 512x512) à partir du logo.jpeg
 * 
 * Ce script nécessite que vous ayez installé sharp :
 * npm install --save-dev sharp @types/sharp
 * 
 * OU utilisez un outil en ligne comme :
 * - https://realfavicongenerator.net/
 * - https://www.pwabuilder.com/imageGenerator
 * 
 * Placez ensuite les fichiers icon-192.png et icon-512.png dans client/public/
 */

async function generatePWAIcons() {
  console.log("🎨 Génération des icônes PWA...\n");

  const publicDir = path.resolve(process.cwd(), "client/public");
  const logoPath = path.join(publicDir, "logo.jpeg");
  const icon192Path = path.join(publicDir, "icon-192.png");
  const icon512Path = path.join(publicDir, "icon-512.png");

  // Vérifier si le logo existe
  if (!fs.existsSync(logoPath)) {
    console.error("❌ logo.jpeg non trouvé dans client/public/");
    console.log("💡 Placez votre logo dans client/public/logo.jpeg");
    process.exit(1);
  }

  // Vérifier si sharp est installé
  let sharp: any;
  try {
    sharp = await import("sharp");
  } catch (error) {
    console.error("❌ Le module 'sharp' n'est pas installé.");
    console.log("\n📦 Pour installer sharp :");
    console.log("   npm install --save-dev sharp @types/sharp");
    console.log("\n💡 Alternative : Utilisez un outil en ligne pour générer les icônes :");
    console.log("   - https://realfavicongenerator.net/");
    console.log("   - https://www.pwabuilder.com/imageGenerator");
    console.log("\n📋 Créez ces fichiers dans client/public/ :");
    console.log("   - icon-192.png (192x192 pixels)");
    console.log("   - icon-512.png (512x512 pixels)");
    process.exit(1);
  }

  try {
    console.log("📷 Lecture du logo...");
    const logoBuffer = fs.readFileSync(logoPath);

    console.log("🔄 Génération icon-192.png (192x192)...");
    await sharp.default(logoBuffer)
      .resize(192, 192, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(icon192Path);

    console.log("✅ icon-192.png créé");

    console.log("🔄 Génération icon-512.png (512x512)...");
    await sharp.default(logoBuffer)
      .resize(512, 512, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(icon512Path);

    console.log("✅ icon-512.png créé");

    console.log("\n🎉 Icônes PWA générées avec succès !");
    console.log("\n📋 Prochaines étapes :");
    console.log("   1. Vérifiez que les icônes sont correctes");
    console.log("   2. Le manifest.json sera mis à jour automatiquement");
    console.log("   3. Redéployez l'application");
    console.log("   4. Sur Android : Désinstallez l'ancienne PWA et réinstallez-la");

  } catch (error: any) {
    console.error("❌ Erreur lors de la génération des icônes:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

generatePWAIcons();

