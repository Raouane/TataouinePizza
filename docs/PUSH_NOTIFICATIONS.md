# Notifications Push PWA pour les Livreurs

## 📋 Vue d'ensemble

Les notifications push PWA permettent d'envoyer des notifications aux livreurs **même quand l'application est fermée**. Cela garantit qu'aucune commande n'est manquée.

## 🔧 Configuration

### 1. Variables d'environnement

Ajoutez ces variables dans votre fichier `.env` :

```env
# Clés VAPID pour les notifications push (générées avec: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=BG3QiM5q-uSGOP_2W_Hl83Db6NLsa8Q-Ag26TzwLaBKtUhoWTNwnWKbG0vvFs7VL4Y1xHDqfhKaFKgpaJz6Ypzo
VAPID_PRIVATE_KEY=aj7cgstQa-DT16_mJcIX2lK6uIkPt6bCTgGwiidJ0xo
VAPID_SUBJECT=mailto:contact@tataouine-pizza.com
```

**⚠️ Important :** Remplacez les clés par celles générées pour votre projet.

### 2. Générer vos propres clés VAPID

```bash
npx web-push generate-vapid-keys
```

Copiez les clés générées dans votre `.env`.

## 🚀 Fonctionnement

### Pour le livreur

1. **Premier chargement** : L'application demande automatiquement la permission de notification
2. **Abonnement automatique** : Le livreur est automatiquement abonné aux push notifications
3. **Notifications** : Quand une nouvelle commande arrive, le livreur reçoit une notification :
   - ✅ Même si l'app est fermée
   - ✅ Même si le téléphone est en veille
   - ✅ Avec son + vibration

### Architecture

```
Nouvelle commande
    ↓
WebSocket (notifications temps réel si app ouverte)
    ↓
Push Notifications (notifications même si app fermée)
    ↓
SMS (fallback si push échoue)
```

## 📱 Support navigateur

- ✅ Chrome/Edge (Android & Desktop)
- ✅ Firefox (Android & Desktop)
- ✅ Safari (iOS 16.4+)
- ⚠️ Safari (iOS < 16.4) : Support limité

## 🔍 Dépannage

### Le livreur ne reçoit pas de notifications

1. **Vérifier la permission** : Le livreur doit avoir autorisé les notifications
2. **Vérifier la subscription** : Vérifier dans la DB que `push_subscription` n'est pas NULL
3. **Vérifier les logs** : Consulter les logs serveur pour voir les erreurs d'envoi
4. **Vérifier HTTPS** : Les push notifications nécessitent HTTPS (sauf localhost)

### Erreur "Subscription invalide"

- La subscription peut expirer ou devenir invalide
- Le système supprime automatiquement les subscriptions invalides
- Le livreur sera automatiquement réabonné au prochain chargement

## 🧪 Tester

1. Ouvrir le dashboard livreur
2. Attendre l'abonnement automatique (2 secondes)
3. Vérifier dans la console : `[Push] ✅ Abonnement réussi`
4. Créer une commande depuis le frontend
5. Vérifier que la notification apparaît même si l'app est fermée

## 📊 Monitoring

Les logs suivants sont disponibles :

- `[Push] ✅ Notification envoyée à livreur {id}` : Succès
- `[Push] ❌ Erreur envoi notification` : Erreur
- `[Push] 🗑️ Subscription invalide, suppression` : Subscription nettoyée

## 🔐 Sécurité

- Les clés VAPID sont uniques par application
- Les subscriptions sont stockées de manière sécurisée dans la DB
- Seuls les livreurs authentifiés peuvent s'abonner
- Les subscriptions invalides sont automatiquement supprimées

