#!/usr/bin/env tsx
/**
 * Script pour détecter les traductions manquantes dans l'application
 * 
 * Usage: npx tsx script/check-translations.ts
 * 
 * Ce script :
 * 1. Scanne tous les fichiers .tsx et .ts dans client/src
 * 2. Détecte les chaînes hardcodées (entre guillemets)
 * 3. Vérifie si elles sont traduites dans i18n.tsx
 * 4. Génère un rapport avec les traductions manquantes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Patterns pour détecter les chaînes hardcodées
const STRING_PATTERNS = [
  /["']([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ][^"']{3,})["']/g, // Chaînes avec majuscule
  /["']([a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþ][^"']{5,})["']/g, // Chaînes avec minuscule (longues)
];

// Mots-clés à ignorer (variables, fonctions, etc.)
const IGNORE_PATTERNS = [
  /^(className|id|href|src|alt|type|name|value|placeholder|aria-label|data-)/,
  /^(http|https|tel|mailto|sms):/,
  /^(use|set|get|is|has|can|should|will|do|did|was|were|are|is|am|be|have|has|had)/,
  /^(true|false|null|undefined|NaN|Infinity)$/,
  /^[A-Z][a-zA-Z]*$/, // Noms de composants (PascalCase)
  /^[a-z]+[A-Z]/, // camelCase
  /^[A-Z_]+$/, // CONSTANTS
  /^\d+$/, // Nombres
  /^[#@$%&*+\-=\[\]{}|\\:;<>?\/.,!~`]/,
  /^(px|rem|em|%|vh|vw|deg|ms|s)$/,
  /^(flex|grid|block|inline|hidden|absolute|relative|fixed|sticky)$/,
  /^(bg-|text-|border-|rounded-|shadow-|hover:|focus:|active:)/,
];

// Charger les traductions existantes
function loadTranslations(): Set<string> {
  const i18nPath = path.join(projectRoot, 'client', 'src', 'lib', 'i18n.tsx');
  const content = fs.readFileSync(i18nPath, 'utf-8');
  
  // Extraire toutes les clés de traduction
  const keyPattern = /['"]([^'"]+)['"]:\s*\{/g;
  const keys = new Set<string>();
  let match;
  
  while ((match = keyPattern.exec(content)) !== null) {
    keys.add(match[1]);
  }
  
  return keys;
}

// Extraire les chaînes hardcodées d'un fichier
function extractHardcodedStrings(filePath: string): Array<{ line: number; text: string; context: string }> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const strings: Array<{ line: number; text: string; context: string }> = [];
  
  lines.forEach((line, index) => {
    // Ignorer les commentaires
    if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
      return;
    }
    
    // Ignorer les imports
    if (line.trim().startsWith('import ')) {
      return;
    }
    
    // Chercher les chaînes hardcodées
    for (const pattern of STRING_PATTERNS) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const text = match[1];
        
        // Ignorer si c'est un pattern à ignorer
        if (IGNORE_PATTERNS.some(ignorePattern => ignorePattern.test(text))) {
          continue;
        }
        
        // Ignorer si c'est déjà une clé de traduction (t('...'))
        if (line.includes(`t('${text}')`) || line.includes(`t("${text}")`)) {
          continue;
        }
        
        // Ignorer les chaînes trop courtes ou trop longues
        if (text.length < 3 || text.length > 100) {
          continue;
        }
        
        // Ignorer les chaînes qui sont clairement des valeurs (pas du texte UI)
        if (text.includes('@') || text.includes('://') || text.includes('.') && !text.includes(' ')) {
          continue;
        }
        
        strings.push({
          line: index + 1,
          text: text.trim(),
          context: line.trim().substring(0, 100),
        });
      }
    }
  });
  
  return strings;
}

// Scanner tous les fichiers
function scanFiles(): Map<string, Array<{ line: number; text: string; context: string }>> {
  const results = new Map<string, Array<{ line: number; text: string; context: string }>>();
  const srcDir = path.join(projectRoot, 'client', 'src');
  
  function walkDir(dir: string) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Ignorer node_modules et autres dossiers
        if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
          walkDir(filePath);
        }
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        // Ignorer les fichiers de configuration et types
        if (!file.includes('.d.ts') && !file.includes('i18n.tsx')) {
          const strings = extractHardcodedStrings(filePath);
          if (strings.length > 0) {
            results.set(filePath, strings);
          }
        }
      }
    }
  }
  
  walkDir(srcDir);
  return results;
}

// Générer le rapport
function generateReport(translations: Set<string>, hardcodedStrings: Map<string, Array<{ line: number; text: string; context: string }>>) {
  console.log('🔍 Vérification des traductions...\n');
  
  const missing: Array<{ file: string; line: number; text: string; context: string }> = [];
  const found: Array<{ file: string; line: number; text: string }> = [];
  
  hardcodedStrings.forEach((strings, filePath) => {
    strings.forEach(({ line, text, context }) => {
      // Vérifier si une traduction existe (recherche partielle)
      const foundTranslation = Array.from(translations).some(key => {
        // Extraire le texte de la traduction française
        // Pour simplifier, on cherche juste si le texte est similaire
        return false; // On ne peut pas facilement extraire les valeurs françaises
      });
      
      // Pour l'instant, on considère toutes les chaînes comme potentiellement manquantes
      // car on ne peut pas facilement mapper le texte français aux clés
      missing.push({
        file: path.relative(projectRoot, filePath),
        line,
        text,
        context,
      });
    });
  });
  
  console.log(`📊 Résumé:`);
  console.log(`   - Fichiers scannés: ${hardcodedStrings.size}`);
  console.log(`   - Chaînes hardcodées trouvées: ${missing.length}`);
  console.log(`   - Traductions disponibles: ${translations.size}\n`);
  
  if (missing.length > 0) {
    console.log('⚠️  Chaînes hardcodées détectées (potentiellement non traduites):\n');
    
    // Grouper par fichier
    const byFile = new Map<string, Array<{ line: number; text: string; context: string }>>();
    missing.forEach(({ file, line, text, context }) => {
      if (!byFile.has(file)) {
        byFile.set(file, []);
      }
      byFile.get(file)!.push({ line, text, context });
    });
    
    byFile.forEach((strings, file) => {
      console.log(`📄 ${file}:`);
      strings.forEach(({ line, text, context }) => {
        console.log(`   Ligne ${line}: "${text}"`);
        console.log(`   Contexte: ${context.substring(0, 80)}...`);
        console.log('');
      });
    });
    
    console.log('\n💡 Suggestions:');
    console.log('   1. Vérifiez manuellement si ces chaînes doivent être traduites');
    console.log('   2. Remplacez-les par des appels à t(\'ma.cle\')');
    console.log('   3. Ajoutez les traductions dans client/src/lib/i18n.tsx');
  } else {
    console.log('✅ Aucune chaîne hardcodée détectée !');
  }
  
  return { missing, found };
}

// Main
function main() {
  console.log('🚀 Démarrage de la vérification des traductions...\n');
  
  const translations = loadTranslations();
  console.log(`✅ ${translations.size} traductions chargées depuis i18n.tsx\n`);
  
  const hardcodedStrings = scanFiles();
  const report = generateReport(translations, hardcodedStrings);
  
  // Écrire le rapport dans un fichier
  const reportPath = path.join(projectRoot, 'docs', 'TRANSLATION_REPORT.md');
  const reportContent = `# Rapport de Vérification des Traductions

Généré le: ${new Date().toISOString()}

## Résumé
- Fichiers scannés: ${hardcodedStrings.size}
- Chaînes hardcodées trouvées: ${report.missing.length}
- Traductions disponibles: ${translations.size}

## Chaînes Potentiellement Non Traduites

${report.missing.map(({ file, line, text, context }) => 
  `### ${file}:${line}
- **Texte**: "${text}"
- **Contexte**: \`${context}\`
`).join('\n')}

## Instructions

Pour chaque chaîne détectée:
1. Vérifiez si elle doit être traduite (certaines peuvent être des valeurs techniques)
2. Si oui, remplacez-la par \`t('ma.cle')\`
3. Ajoutez la traduction dans \`client/src/lib/i18n.tsx\` avec les 3 langues (FR, EN, AR)
`;

  fs.writeFileSync(reportPath, reportContent);
  console.log(`\n📝 Rapport écrit dans: ${path.relative(projectRoot, reportPath)}`);
}

main();
