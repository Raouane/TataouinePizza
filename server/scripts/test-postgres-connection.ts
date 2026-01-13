/**
 * Script pour tester la connexion PostgreSQL avec différents mots de passe
 */

import { Client } from 'pg';

const passwords = [
  '0lBVgjGgx1s41HuF',
  'postgres',
  'password',
  '',
];

async function testConnection() {
  console.log('\n[Test PostgreSQL] 🔍 Test de connexion avec différents mots de passe...\n');
  
  for (const password of passwords) {
    const client = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: password,
      database: 'postgres', // Essayer d'abord la base par défaut
      ssl: false,
    });
    
    try {
      await client.connect();
      console.log(`✅ Connexion réussie avec le mot de passe: ${password || '(vide)'}`);
      
      // Vérifier si la base tataouine_pizza existe
      const dbCheck = await client.query(`
        SELECT datname FROM pg_database WHERE datname = 'tataouine_pizza'
      `);
      
      if (dbCheck.rows.length > 0) {
        console.log('   ✅ Base de données "tataouine_pizza" existe');
      } else {
        console.log('   ⚠️  Base de données "tataouine_pizza" n\'existe pas');
        console.log('   💡 Créez-la avec: CREATE DATABASE tataouine_pizza;');
      }
      
      await client.end();
      process.exit(0);
    } catch (error: any) {
      if (error.code === '28P01') {
        console.log(`❌ Mot de passe incorrect: ${password || '(vide)'}`);
      } else {
        console.log(`❌ Erreur avec "${password || '(vide)'}": ${error.message}`);
      }
    }
  }
  
  console.log('\n❌ Aucun mot de passe n\'a fonctionné');
  console.log('💡 Vérifiez:');
  console.log('   1. PostgreSQL est démarré');
  console.log('   2. Le mot de passe de l\'utilisateur "postgres"');
  console.log('   3. Les permissions de connexion');
  process.exit(1);
}

testConnection();
