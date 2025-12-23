# Comment ajouter les restaurants manquants en production

## Problème
3 restaurants manquent en production :
- Boucherie Brahim
- Volaille Othman
- Bijouterie Ziyad

## Solution 1 : Via le Dashboard Admin (RECOMMANDÉ) ⭐

1. Allez sur https://tataouine-pizza.onrender.com/admin
2. Connectez-vous avec vos identifiants admin
3. Cliquez sur l'onglet **"Restaurants"**
4. Cliquez sur le bouton **"Créer Restaurants de Test"**
5. Attendez la confirmation

✅ Cette méthode est la plus simple et la plus sûre.

---

## Solution 2 : Via le script API

Si le bouton ne fonctionne pas, utilisez le script :

```bash
ADMIN_EMAIL='votre_email' ADMIN_PASSWORD='votre_password' npm run add-missing-restaurants
```

**Exemple :**
```bash
ADMIN_EMAIL='admin@tataouine.com' ADMIN_PASSWORD='admin123' npm run add-missing-restaurants
```

---

## Solution 3 : Via Render CLI (si vous avez accès)

Si vous avez installé Render CLI :

```bash
render psql dpg-d54ost5actks73aj2760-a
```

Puis exécutez les requêtes SQL directement.

---

## Vérification

Après avoir ajouté les restaurants, vérifiez avec :

```bash
npm run check-production-api
```

Vous devriez voir **10 restaurants** au lieu de 7.

