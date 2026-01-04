# Guide de Test Stripe sur Localhost

## ✅ Prérequis

1. **Dépendances installées** :
   ```bash
   npm install @stripe/stripe-js @stripe/react-stripe-js stripe
   ```

2. **Variables d'environnement configurées** dans `.env` :
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_votre_cle_publique_ici
STRIPE_SECRET_KEY=sk_test_votre_cle_secrete_ici
```

3. **Feature flag activé** dans `client/src/pages/profile.tsx` :
   ```typescript
   const stripeEnabled = true; // Passer à true
   ```

## 🚀 Démarrer le serveur

```bash
# Terminal 1 : Démarrer le serveur backend
npm run dev

# Le serveur devrait démarrer sur http://localhost:5000
```

## 🧪 Étapes de test

### 1. Vérifier que le serveur démarre sans erreur

- Ouvrez la console du serveur
- Vérifiez qu'il n'y a pas d'erreur liée à `STRIPE_SECRET_KEY`
- Le serveur devrait afficher quelque chose comme : `serving on port 5000`

### 2. Accéder à l'application

- Ouvrez votre navigateur sur `http://localhost:5000`
- Connectez-vous ou créez un profil utilisateur
- Assurez-vous d'avoir un numéro de téléphone enregistré (nécessaire pour Stripe)

### 3. Tester l'ajout d'une carte

1. Allez sur la page **Profil** (`/profile`)
2. Vous devriez voir la section **"Méthodes de paiement"** (si `stripeEnabled = true`)
3. Cliquez sur "Méthodes de paiement"
4. Cliquez sur "Ajouter une carte"
5. Utilisez une **carte de test Stripe** :
   - **Numéro** : `4242 4242 4242 4242`
   - **Date d'expiration** : `12/34` (ou toute date future)
   - **CVC** : `123` (ou n'importe quel code à 3 chiffres)
   - **Code postal** : `12345` (ou n'importe quel code postal valide)
6. Cliquez sur "Enregistrer la carte"
7. Vous devriez voir un toast de succès
8. La carte devrait apparaître dans la liste

### 4. Tester l'affichage des cartes

- Après avoir ajouté une carte, elle devrait apparaître dans le dialog
- Vous devriez voir : "Visa •••• 4242" avec la date d'expiration

### 5. Tester la suppression d'une carte

1. Cliquez sur l'icône de poubelle (🗑️) à côté d'une carte
2. Confirmez la suppression
3. La carte devrait disparaître de la liste
4. Un toast de confirmation devrait s'afficher

## 🐛 Dépannage

### Erreur : "STRIPE_SECRET_KEY is not defined"

**Solution** : Vérifiez que le fichier `.env` contient bien `STRIPE_SECRET_KEY` et redémarrez le serveur.

### Erreur : "Customer with phone ... not found"

**Solution** : Assurez-vous d'avoir un numéro de téléphone enregistré dans votre profil (via onboarding ou panier).

### La section "Méthodes de paiement" n'apparaît pas

**Solution** : Vérifiez que `stripeEnabled = true` dans `client/src/pages/profile.tsx` et rechargez la page.

### Erreur : "Failed to create setup intent"

**Solution** : 
- Vérifiez que les clés Stripe sont correctes dans `.env`
- Vérifiez la console du serveur pour plus de détails
- Assurez-vous que le serveur a bien redémarré après l'ajout des variables

### Le formulaire de carte ne s'affiche pas

**Solution** :
- Vérifiez la console du navigateur (F12) pour les erreurs
- Vérifiez que `VITE_STRIPE_PUBLISHABLE_KEY` est bien défini dans `.env`
- Redémarrez le serveur de développement

## 📝 Cartes de test Stripe

Stripe fournit plusieurs cartes de test pour différents scénarios :

| Numéro de carte | Scénario |
|----------------|----------|
| `4242 4242 4242 4242` | Succès |
| `4000 0000 0000 0002` | Carte refusée |
| `4000 0000 0000 9995` | Fonds insuffisants |
| `4000 0000 0000 3220` | 3D Secure requis |

Pour tous les tests, utilisez :
- **Date d'expiration** : N'importe quelle date future
- **CVC** : N'importe quel code à 3 chiffres
- **Code postal** : N'importe quel code postal valide

## ✅ Checklist de vérification

- [ ] Dépendances installées (`npm install`)
- [ ] Variables d'environnement dans `.env`
- [ ] Serveur redémarré après modification de `.env`
- [ ] `stripeEnabled = true` dans `Profile.tsx`
- [ ] Numéro de téléphone enregistré dans le profil
- [ ] Section "Méthodes de paiement" visible dans le profil
- [ ] Formulaire de carte s'affiche correctement
- [ ] Ajout de carte fonctionne
- [ ] Affichage des cartes fonctionne
- [ ] Suppression de carte fonctionne

## 🎯 Résultat attendu

Après avoir suivi ces étapes, vous devriez pouvoir :
1. ✅ Voir la section "Méthodes de paiement" dans le profil
2. ✅ Ajouter une carte de test
3. ✅ Voir la carte ajoutée dans la liste
4. ✅ Supprimer une carte

Si tout fonctionne, l'intégration Stripe est opérationnelle ! 🎉
