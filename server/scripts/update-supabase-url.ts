/**
 * Script pour mettre à jour l'URL Supabase dans .env
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_REF = 'dizcnsohvipedeqlmecb';
const REGION = 'aws-1-eu-west-1';
const PORT = '6543'; // Port pooler (recommandé pour production, évite les problèmes de circuit breaker)
const envPath = path.join(process.cwd(), '.env');

async function updateSupabaseUrl() {
  try {
    console.log('\n[Update Supabase URL] 🔄 Mise à jour du fichier .env...\n');
    
    // Vérifier si le fichier .env existe
    if (!fs.existsSync(envPath)) {
      console.error('[Update Supabase URL] ❌ Le fichier .env n\'existe pas');
      console.error('💡 Solution: Créez un fichier .env à la racine du projet');
      process.exit(1);
    }
    
    // Lire le contenu actuel
    let envContent = fs.readFileSync(envPath, 'utf-8');
    
    // Demander le mot de passe (ou le prendre depuis les arguments)
    const password = process.argv[2];
    
    if (!password) {
      console.error('[Update Supabase URL] ❌ Mot de passe requis');
      console.error('\n💡 Usage: npm run db:update-supabase-url <PASSWORD>');
      console.error('   Exemple: npm run db:update-supabase-url "monMotDePasse123"');
      console.error('\n⚠️  Si le mot de passe contient des caractères spéciaux, encodez-les:');
      console.error('   @ → %40');
      console.error('   # → %23');
      console.error('   % → %25');
      console.error('   ? → %3F');
      process.exit(1);
    }
    
    // Encoder le mot de passe si nécessaire
    const encodedPassword = encodeURIComponent(password);
    
    // Construire l'URL Supabase
    const supabaseUrl = `postgresql://postgres.${PROJECT_REF}:${encodedPassword}@${REGION}.pooler.supabase.com:${PORT}/postgres?sslmode=require`;
    
    // Vérifier si DATABASE_URL existe
    const hasDatabaseUrl = envContent.includes('DATABASE_URL=');
    
    if (!hasDatabaseUrl) {
      console.log('[Update Supabase URL] ⚠️ DATABASE_URL n\'existe pas, ajout de la ligne...');
      envContent += `\nDATABASE_URL=${supabaseUrl}\n`;
    } else {
      // Mettre à jour DATABASE_URL
      const pattern = /DATABASE_URL=.*/;
      if (pattern.test(envContent)) {
        envContent = envContent.replace(pattern, `DATABASE_URL=${supabaseUrl}`);
        console.log('[Update Supabase URL] ✅ DATABASE_URL mis à jour avec l\'URL Supabase');
      } else {
        console.log('[Update Supabase URL] ⚠️ Impossible de trouver DATABASE_URL, ajout de la ligne...');
        envContent += `\nDATABASE_URL=${supabaseUrl}\n`;
      }
    }
    
    // Sauvegarder le fichier
    fs.writeFileSync(envPath, envContent, 'utf-8');
    
    console.log('[Update Supabase URL] ✅ Fichier .env mis à jour avec succès');
    console.log('[Update Supabase URL]    URL Supabase configurée');
    console.log('[Update Supabase URL]    Project REF:', PROJECT_REF);
    console.log('[Update Supabase URL]    Région:', REGION);
    console.log('\n💡 Testez la connexion avec: npm run db:check\n');
    
    process.exit(0);
  } catch (error: any) {
    console.error('[Update Supabase URL] ❌ Erreur:', error.message);
    process.exit(1);
  }
}

updateSupabaseUrl();
