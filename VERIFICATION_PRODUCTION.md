# ✅ Vérification après déploiement

## 🚀 Étapes de vérification

### 1. Attendre le déploiement Render

Après le push GitHub, Render va automatiquement redéployer votre application. Cela prend généralement **2-5 minutes**.

**Vérifiez sur Render Dashboard** :
- Allez sur votre service
- Regardez l'onglet **Events** ou **Logs**
- Attendez que le statut soit **Live** (vert)

### 2. Vider le cache du navigateur

**Important** : Le navigateur peut avoir mis en cache l'ancienne version.

**Méthode 1 : Hard Refresh**
- **Chrome/Edge** : `Ctrl + Shift + R` (Windows) ou `Cmd + Shift + R` (Mac)
- **Firefox** : `Ctrl + F5` (Windows) ou `Cmd + Shift + R` (Mac)
- **Safari** : `Cmd + Option + R`

**Méthode 2 : Navigation privée**
- Ouvrez une **fenêtre de navigation privée** (Ctrl + Shift + N)
- Visitez votre site en production
- Cela évite complètement le cache

### 3. Ouvrir la console du navigateur

1. Appuyez sur **F12** (ou clic droit → Inspecter)
2. Allez dans l'onglet **Console**
3. **Videz la console** (icône 🚫 ou Ctrl + L)
4. **Rechargez la page** (F5 ou Ctrl + R)

### 4. Vérifier les logs

Vous devriez voir des logs qui commencent par `[Home]` :

```
[Home] Début du chargement des restaurants...
[Home] Réponse API: 200 OK
[Home] Restaurants reçus: 8
[Home] Détails des restaurants: [...]
[Home] État du filtrage:
  - Total restaurants: 8
  - Recherche active: false
  - Restaurants filtrés: 8
  - Restaurants ouverts: 8
  - Restaurants fermés: 0
[Home] Chargement terminé
```

### 5. Si rien n'apparaît dans la console

**Causes possibles** :

#### A. Le site n'est pas encore redéployé
- ✅ Vérifiez sur Render Dashboard que le déploiement est terminé
- ✅ Attendez 2-3 minutes supplémentaires
- ✅ Rechargez la page

#### B. Erreur JavaScript qui bloque l'exécution
- ✅ Regardez s'il y a des **erreurs en rouge** dans la console
- ✅ Copiez toutes les erreurs et partagez-les

#### C. Le code n'est pas chargé
- ✅ Vérifiez l'onglet **Network** (Réseau) dans les DevTools
- ✅ Cherchez le fichier `home.tsx` ou le bundle JavaScript
- ✅ Vérifiez qu'il se charge avec un statut **200 OK**

#### D. Cache du navigateur trop agressif
- ✅ Essayez en **navigation privée**
- ✅ Essayez sur un **autre navigateur**
- ✅ Essayez sur un **autre appareil**

### 6. Tester l'API directement

Ouvrez directement l'URL de l'API dans votre navigateur :

```
https://votre-site-render.com/api/restaurants
```

**Résultat attendu** : Un tableau JSON avec les restaurants.

**Si vous voyez une erreur** :
- `404 Not Found` → L'API n'est pas accessible
- `500 Internal Server Error` → Erreur serveur, vérifiez les logs Render
- `CORS error` → Problème de configuration CORS

### 7. Vérifier les logs Render

Sur Render Dashboard :
1. Allez dans votre service
2. Cliquez sur **Logs**
3. Cherchez des erreurs lors du chargement de la page
4. Cherchez des erreurs lors des appels à `/api/restaurants`

## 🔍 Checklist de débogage

- [ ] Render Dashboard montre que le déploiement est terminé
- [ ] J'ai vidé le cache du navigateur (hard refresh)
- [ ] J'ai ouvert la console (F12)
- [ ] J'ai vidé la console avant de recharger
- [ ] Je vois des logs `[Home]` dans la console
- [ ] L'API `/api/restaurants` répond correctement
- [ ] Il n'y a pas d'erreurs JavaScript en rouge

## 📝 Si toujours rien n'apparaît

**Partagez-moi** :
1. Une capture d'écran de la console (vide ou avec erreurs)
2. Le résultat de `https://votre-site.com/api/restaurants` (ouvrez dans le navigateur)
3. Les logs Render (copiez les dernières lignes)
4. Le statut du déploiement sur Render Dashboard

## 💡 Astuce

Pour vérifier rapidement si le nouveau code est déployé :

1. Ouvrez le code source de la page (Ctrl + U)
2. Cherchez `[Home] Début du chargement` dans le code
3. Si vous le trouvez, le nouveau code est déployé
4. Si vous ne le trouvez pas, attendez encore le déploiement

