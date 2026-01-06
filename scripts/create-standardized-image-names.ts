/**
 * Script pour créer des copies des images avec des noms standardisés
 */

import fs from "fs";
import path from "path";

const imagesDir = path.resolve(process.cwd(), "client/public/images/products");

// Mapping des noms actuels vers les noms standardisés
const imageRenames: Record<string, string> = {
  "4fromage.png": "pizza-4-fromages.jpg",
  "pepperoni.png": "pizza-pepperoni.jpg",
  "calzone.png": "calzone-aux-oeufs.jpg",
  "eclair-chocolat.png": "eclair-au-chocolat.jpg",
  "baklawa tunisienne.png": "baklava.jpg",
  "macaron.png": "macarons.jpg",
  "makroudh.png": "maamoul.jpg",
  "mille-feuille.png": "mille-feuille.jpg",
  "Kaak Warka.png": "biscuits-blancs.jpg",
  "couscous-poulet.png": "couscous-au-poulet.jpg",
  "kamounia.png": "ragout-de-poulet.jpg",
  "ojja-merguez.png": "shakshuka.jpg",
  "sandwich tunisien .png": "sandwich-au-thon.jpg",
  "sandwich poulet chiken.png": "sandwich-poulet-frites.jpg",
  "frites.png": "frites.jpg",
  "makrouna-boeuf.png": "pates-a-la-viande.jpg",
};

async function createStandardizedNames() {
  console.log("📸 Création des noms d'images standardisés...\n");

  if (!fs.existsSync(imagesDir)) {
    console.error("❌ Le dossier d'images n'existe pas:", imagesDir);
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const [oldName, newName] of Object.entries(imageRenames)) {
    const oldPath = path.join(imagesDir, oldName);
    const newPath = path.join(imagesDir, newName);

    if (!fs.existsSync(oldPath)) {
      console.log(`⚠️  Fichier source non trouvé: ${oldName}`);
      skipped++;
      continue;
    }

    if (fs.existsSync(newPath)) {
      console.log(`⏭️  Fichier existe déjà: ${newName}`);
      skipped++;
      continue;
    }

    try {
      // Copier le fichier
      fs.copyFileSync(oldPath, newPath);
      console.log(`✅ ${oldName} → ${newName}`);
      created++;
    } catch (error: any) {
      console.error(`❌ Erreur pour ${oldName}:`, error.message);
      errors++;
    }
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log("📊 RÉSUMÉ:");
  console.log("=".repeat(70));
  console.log(`   ✅ Fichiers créés: ${created}`);
  console.log(`   ⏭️  Fichiers ignorés: ${skipped}`);
  console.log(`   ❌ Erreurs: ${errors}`);
  console.log(`\n✨ Terminé !`);
}

createStandardizedNames()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erreur fatale:", error);
    process.exit(1);
  });
