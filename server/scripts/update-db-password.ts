/**
 * Script pour mettre à jour le mot de passe PostgreSQL dans .env
 */

import * as fs from 'fs';
import * as path from 'path';

const password = '0lBVgjGgx1s41HuF';
const envPath = path.join(process.cwd(), '.env');

async function updateEnvFile() {
  try {
    console.log('\n[Update DB Password] 🔄 Mise à jour du fichier .env...\n');
    
    // Vérifier si le fichier .env existe
    if (!fs.existsSync(envPath)) {
      console.error('[Update DB Password] ❌ Le fichier .env n\'existe pas');
      console.error('💡 Solution: Créez un fichier .env à la racine du projet');
      process.exit(1);
    }
    
    // Lire le contenu actuel
    let envContent = fs.readFileSync(envPath, 'utf-8');
    
    // Vérifier si DATABASE_URL existe
    const hasDatabaseUrl = envContent.includes('DATABASE_URL=');
    
    if (!hasDatabaseUrl) {
      console.log('[Update DB Password] ⚠️ DATABASE_URL n\'existe pas, ajout de la ligne...');
      envContent += `\nDATABASE_URL=postgresql://postgres:${password}@localhost:5432/tataouine_pizza\n`;
    } else {
      // Mettre à jour DATABASE_URL
      // Pattern pour trouver DATABASE_URL avec différents formats
      const patterns = [
        /DATABASE_URL=postgresql:\/\/postgres:[^@]+@localhost:5432\/[^\s\n]+/,
        /DATABASE_URL=postgresql:\/\/postgres:[^@]+@[^\s\n]+/,
        /DATABASE_URL=[^\s\n]+/,
      ];
      
      let updated = false;
      for (const pattern of patterns) {
        if (pattern.test(envContent)) {
          // Extraire l'URL actuelle pour garder le host et la base de données
          const match = envContent.match(pattern);
          if (match) {
            const oldUrl = match[0];
            // Parser l'URL pour extraire host, port, database
            const urlMatch = oldUrl.match(/postgresql:\/\/postgres:[^@]+@([^\/]+)\/([^\s\n\?]+)/);
            
            if (urlMatch) {
              const [, hostPort, database] = urlMatch;
              const newUrl = `DATABASE_URL=postgresql://postgres:${password}@${hostPort}/${database}`;
              envContent = envContent.replace(pattern, newUrl);
              updated = true;
              console.log('[Update DB Password] ✅ DATABASE_URL mis à jour');
              break;
            } else {
              // Format simple : localhost:5432/tataouine_pizza
              const newUrl = `DATABASE_URL=postgresql://postgres:${password}@localhost:5432/tataouine_pizza`;
              envContent = envContent.replace(pattern, newUrl);
              updated = true;
              console.log('[Update DB Password] ✅ DATABASE_URL mis à jour (format simple)');
              break;
            }
          }
        }
      }
      
      if (!updated) {
        console.log('[Update DB Password] ⚠️ Impossible de parser DATABASE_URL, remplacement manuel nécessaire');
        console.log('💡 Mettez à jour manuellement dans .env :');
        console.log(`   DATABASE_URL=postgresql://postgres:${password}@localhost:5432/tataouine_pizza`);
        process.exit(1);
      }
    }
    
    // Sauvegarder le fichier
    fs.writeFileSync(envPath, envContent, 'utf-8');
    
    console.log('[Update DB Password] ✅ Fichier .env mis à jour avec succès');
    console.log('[Update DB Password]    Mot de passe: 0lBVgjGgx1s41HuF');
    console.log('\n💡 Testez la connexion avec: npm run db:check\n');
    
    process.exit(0);
  } catch (error: any) {
    console.error('[Update DB Password] ❌ Erreur:', error.message);
    process.exit(1);
  }
}

updateEnvFile();
