# 🔧 Configuration Stripe sur Render

Ce guide vous explique comment configurer Stripe sur votre déploiement Render.

## 📋 Prérequis

- ✅ Votre application est déjà déployée sur Render
- ✅ Vous avez accès au Dashboard Render
- ✅ Vous avez vos clés Stripe (Test ou Live)

## 🎯 Étapes de configuration

### Étape 1 : Accéder aux variables d'environnement

1. Connectez-vous à [Render Dashboard](https://dashboard.render.com)
2. Cliquez sur votre service Web (ex: `tataouine-pizza`)
3. Dans le menu de gauche, cliquez sur **"Environment"** (ou **"Variables d'environnement"**)

### Étape 2 : Ajouter les clés Stripe

Dans la section **"Environment Variables"**, ajoutez ces deux variables :

#### Variable 1 : Clé publique Stripe (Frontend)

| Clé | Valeur |
|-----|--------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_votre_cle_publique_ici` |

**Important :**
- Pour tester en production : utilisez votre clé **Test** (`pk_test_...`)
- Pour les vrais paiements : utilisez votre clé **Live** (`pk_live_...`)

#### Variable 2 : Clé secrète Stripe (Backend)

| Clé | Valeur |
|-----|--------|
| `STRIPE_SECRET_KEY` | `sk_test_votre_cle_secrete_ici` |

**Important :**
- ⚠️ **NE JAMAIS** exposer cette clé publiquement
- Pour tester : utilisez votre clé **Test** (`sk_test_...`)
- Pour production : utilisez votre clé **Live** (`sk_live_...`)

### Étape 3 : Sauvegarder et redéployer

1. Cliquez sur **"Save Changes"** (ou **"Enregistrer"**)
2. Render redéploiera automatiquement votre application avec les nouvelles variables
3. ⏱️ Attendez 2-3 minutes que le redéploiement se termine

### Étape 4 : Vérifier la configuration

Une fois le redéploiement terminé :

1. Allez sur votre URL Render : `https://votre-app.onrender.com`
2. Connectez-vous à votre compte
3. Allez dans **Profil** → **Méthodes de paiement**
4. Essayez d'ajouter une carte de test :
   - Numéro : `4242 4242 4242 4242`
   - Date : `12/25` (ou toute date future)
   - CVC : `123`
   - Code postal : `12345`

Si la carte s'ajoute sans erreur, ✅ **Stripe est correctement configuré !**

## 🔄 Passer de Test à Live

Quand vous êtes prêt pour les vrais paiements :

1. Allez dans votre Dashboard Stripe → **Developers** → **API keys**
2. Basculez sur **"Live mode"** (en haut à droite)
3. Copiez vos clés Live (`pk_live_...` et `sk_live_...`)
4. Dans Render → **Environment** → Modifiez les deux variables :
   - Remplacez `pk_test_...` par `pk_live_...`
   - Remplacez `sk_test_...` par `sk_live_...`
5. Sauvegardez et attendez le redéploiement

## 📝 Variables d'environnement complètes sur Render

Voici toutes les variables que vous devriez avoir sur Render :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `NODE_ENV` | Environnement | `production` |
| `PORT` | Port du serveur | `10000` |
| `DATABASE_URL` | URL de la base de données | (automatique) |
| `JWT_SECRET` | Clé secrète JWT | (généré) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Clé publique Stripe | `pk_test_...` |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe | `sk_test_...` |
| `N8N_WEBHOOK_URL` | (Optionnel) Webhook n8n | `https://...` |

## 🆘 Dépannage

### Problème : "Invalid API Key provided"

**Solution :**
1. Vérifiez que `VITE_STRIPE_PUBLISHABLE_KEY` commence bien par `pk_test_` ou `pk_live_`
2. Vérifiez qu'il n'y a pas d'espaces avant/après la clé
3. Assurez-vous que le redéploiement est terminé
4. Videz le cache du navigateur (Ctrl+Shift+R)

### Problème : "STRIPE_SECRET_KEY is not defined"

**Solution :**
1. Vérifiez que `STRIPE_SECRET_KEY` est bien ajoutée dans Render
2. Vérifiez qu'elle commence par `sk_test_` ou `sk_live_`
3. Redéployez manuellement si nécessaire (Render → Manual Deploy)

### Problème : Les cartes ne s'enregistrent pas

**Solution :**
1. Vérifiez les logs Render (section "Logs")
2. Vérifiez que les deux clés (publique et secrète) sont du même mode (Test ou Live)
3. Vérifiez que vous utilisez une carte de test valide (4242 4242 4242 4242)

## ✅ Checklist de configuration

- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` ajoutée dans Render
- [ ] `STRIPE_SECRET_KEY` ajoutée dans Render
- [ ] Les deux clés sont du même mode (Test ou Live)
- [ ] Redéploiement terminé
- [ ] Test d'ajout de carte réussi
- [ ] Test de suppression de carte réussi

## 📚 Ressources

- [Documentation Stripe](https://stripe.com/docs)
- [Dashboard Stripe](https://dashboard.stripe.com/test/apikeys)
- [Guide Test vs Live](./STRIPE_TEST_VS_LIVE.md)
