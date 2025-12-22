# 🔧 Correction de l'erreur de build sur Render

## ❌ Erreur actuelle

```
sh : 1 : tsx : introuvable
==> Échec de la compilation 😞
```

## ✅ Solution : Modifier la commande de build

### Option 1 : Utiliser `npx tsx` (Recommandé)

Dans Render Dashboard → Votre service Web → **"Settings"** → **"Build Command"**

Changez :
```
npm install ; npm run build
```

Par :
```
npm install && npx tsx script/build.ts
```

### Option 2 : Utiliser `npm run build` avec npx

Ou changez par :
```
npm install && npm run build
```

Et modifiez le script dans `package.json` pour utiliser `npx` :

```json
"build": "npx tsx script/build.ts"
```

## 📋 Étapes pour corriger

1. Allez dans Render Dashboard
2. Cliquez sur votre service Web `TataouinePizza`
3. Allez dans **"Settings"** (Paramètres)
4. Trouvez **"Build Command"** (Commande de build)
5. Changez la commande en :
   ```
   npm install && npx tsx script/build.ts
   ```
6. Cliquez sur **"Save Changes"** (Enregistrer)
7. Render redéploiera automatiquement

## 🔄 Alternative : Déplacer tsx dans dependencies

Si vous préférez, vous pouvez aussi déplacer `tsx` de `devDependencies` vers `dependencies` dans `package.json`, mais `npx` est plus propre.

## ✅ Après la correction

Le build devrait maintenant fonctionner et vous verrez :
```
✅ Building client...
✅ Building server...
✅ Build completed successfully!
```

