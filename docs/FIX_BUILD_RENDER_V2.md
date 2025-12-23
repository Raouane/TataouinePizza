# 🔧 Correction de l'erreur de build sur Render - Version 2

## ❌ Erreur actuelle

```
Erreur [ERR_MODULE_NOT_FOUND] : Impossible de trouver le package « esbuild »
```

## 🔍 Cause

Render n'installe pas les `devDependencies` par défaut, mais on en a besoin pour le build (`esbuild`, `tsx`, `vite`).

## ✅ Solution : Modifier la commande de build

Dans Render Dashboard → Votre service Web → **"Settings"** → **"Build Command"**

Changez :
```
npm install ; npm run build
```

Par :
```
npm install && npm run build
```

**OU mieux encore** (pour s'assurer que les devDependencies sont installées) :

```
npm ci && npm run build
```

**OU** (si ça ne fonctionne toujours pas) :

```
npm install --include=dev && npm run build
```

## 📋 Étapes pour corriger

1. Allez dans Render Dashboard
2. Cliquez sur votre service Web `TataouinePizza`
3. Allez dans **"Settings"** (Paramètres)
4. Trouvez **"Build Command"** (Commande de build)
5. Changez la commande en :
   ```
   npm install --include=dev && npm run build
   ```
6. Cliquez sur **"Save Changes"** (Enregistrer)
7. Render redéploiera automatiquement

## 🔄 Alternative : Déplacer les dépendances de build

Si vous préférez, vous pouvez déplacer ces packages de `devDependencies` vers `dependencies` :
- `esbuild`
- `tsx`
- `vite`
- `@vitejs/plugin-react`

Mais la solution avec `--include=dev` est plus propre.

## ✅ Après la correction

Le build devrait maintenant fonctionner et vous verrez :
```
✅ Installing dependencies...
✅ Building client...
✅ Building server...
✅ Build completed successfully!
[DB] Seeding database with demo data...
[DB] Demo data seeded successfully!
serving on port 10000
```





