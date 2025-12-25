import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Charger le .env depuis la racine du projet
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, "..", ".env") });

import { db } from "../server/db";
import { pizzas } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkMargheritaImage() {
  console.log("🔍 Vérification de l'image Pizza Margherita...\n");

  try {
    // Trouver Pizza Margherita dans la base de données
    const allProducts = await db.select().from(pizzas);
    const margherita = allProducts.find(p => p.name.toLowerCase().includes("margherita"));
    
    if (!margherita) {
      console.log("❌ Pizza Margherita non trouvée dans la base de données\n");
      process.exit(1);
    }

    console.log(`✅ Pizza Margherita trouvée:`);
    console.log(`   Nom: ${margherita.name}`);
    console.log(`   ID: ${margherita.id}`);
    console.log(`   imageUrl actuelle: ${margherita.imageUrl || 'null'}\n`);

    // Vérifier les fichiers dans le dossier
    const imagesDir = path.resolve(process.cwd(), "client/public/images/products");
    const imageFiles = fs.existsSync(imagesDir) ? fs.readdirSync(imagesDir) : [];
    
    console.log(`📁 Fichiers images contenant "margherit" dans le nom:\n`);
    const margheritaFiles = imageFiles.filter(f => f.toLowerCase().includes("margherit"));
    
    if (margheritaFiles.length === 0) {
      console.log("   ❌ Aucun fichier trouvé\n");
    } else {
      margheritaFiles.forEach(file => {
        const filePath = path.join(imagesDir, file);
        const exists = fs.existsSync(filePath);
        console.log(`   ${exists ? '✅' : '❌'} ${file}`);
        console.log(`      Chemin: ${filePath}`);
        console.log(`      Existe: ${exists}\n`);
      });
    }

    // Vérifier l'URL attendue
    const expectedUrl = "/images/products/pizza-margherita.png";
    const expectedPath = path.join(imagesDir, "pizza-margherita.png");
    const expectedExists = fs.existsSync(expectedPath);
    
    console.log(`📋 URL attendue dans la base de données: ${expectedUrl}`);
    console.log(`   Fichier attendu: pizza-margherita.png`);
    console.log(`   Existe: ${expectedExists ? '✅' : '❌'}\n`);

    if (!expectedExists && margheritaFiles.length > 0) {
      console.log(`⚠️  PROBLÈME DÉTECTÉ:`);
      console.log(`   Le fichier existe mais avec un nom différent !\n`);
      console.log(`💡 SOLUTION:`);
      console.log(`   1. Renommez le fichier "${margheritaFiles[0]}" en "pizza-margherita.png"`);
      console.log(`   2. Ou mettez à jour l'URL dans la base de données vers: /images/products/${margheritaFiles[0]}\n`);
      
      // Proposer de renommer automatiquement
      if (margheritaFiles.length === 1) {
        const oldFile = margheritaFiles[0];
        const oldPath = path.join(imagesDir, oldFile);
        const newPath = path.join(imagesDir, "pizza-margherita.png");
        
        console.log(`🔄 Renommage automatique...\n`);
        try {
          fs.renameSync(oldPath, newPath);
          console.log(`✅ Fichier renommé: ${oldFile} → pizza-margherita.png\n`);
          
          // Mettre à jour l'URL dans la base de données
          await db.update(pizzas)
            .set({ imageUrl: expectedUrl })
            .where(eq(pizzas.id, margherita.id));
          
          console.log(`✅ URL mise à jour dans la base de données: ${expectedUrl}\n`);
        } catch (error: any) {
          console.error(`❌ Erreur lors du renommage: ${error.message}\n`);
        }
      }
    } else if (expectedExists) {
      // Le fichier existe avec le bon nom, vérifier l'URL dans la DB
      if (margherita.imageUrl !== expectedUrl) {
        console.log(`⚠️  L'URL dans la base de données ne correspond pas !\n`);
        console.log(`🔄 Mise à jour de l'URL...\n`);
        
        await db.update(pizzas)
          .set({ imageUrl: expectedUrl })
          .where(eq(pizzas.id, margherita.id));
        
        console.log(`✅ URL mise à jour: ${margherita.imageUrl} → ${expectedUrl}\n`);
      } else {
        console.log(`✅ Tout est correct ! L'image devrait s'afficher.\n`);
      }
    } else {
      console.log(`❌ Le fichier pizza-margherita.png n'existe pas.\n`);
      console.log(`💡 Vérifiez que l'image est bien dans: ${imagesDir}\n`);
    }

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

checkMargheritaImage();

