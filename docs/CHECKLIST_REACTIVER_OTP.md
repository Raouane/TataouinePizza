# ✅ Checklist pour réactiver l'OTP

## 🎯 Objectif

Réactiver l'authentification OTP (SMS) après le MVP.

## 📋 Étapes

### 1. Variable d'environnement

Dans votre fichier `.env` ou sur Render :

```env
ENABLE_SMS_OTP=true
```

### 2. Redémarrer l'application

```bash
# Local
npm run dev

# Production (Render)
# Redéployer ou redémarrer le service
```

### 3. Vérifier les routes

Les routes suivantes sont automatiquement activées :
- ✅ `POST /api/otp/send` - Envoie le code OTP
- ✅ `POST /api/otp/verify` - Vérifie le code OTP
- ❌ `POST /api/auth/login` - Désactivé (retourne erreur 400)

### 4. Frontend

Modifier le frontend pour :

#### Avant (Mode Simple)
```typescript
// Authentification simple
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ firstName, phone })
});
```

#### Après (Mode OTP)
```typescript
// 1. Envoyer OTP
await fetch('/api/otp/send', {
  method: 'POST',
  body: JSON.stringify({ phone })
});

// 2. Vérifier OTP
const response = await fetch('/api/otp/verify', {
  method: 'POST',
  body: JSON.stringify({ phone, code })
});
```

### 5. Code Twilio

✅ **Aucune action requise** - Le code Twilio est déjà en place dans :
- `server/services/sms-service.ts`
- Les routes OTP dans `server/routes/auth.ts`

### 6. Migration des données

✅ **Aucune migration requise** - Les clients créés via l'authentification simple peuvent continuer à utiliser l'OTP.

### 7. Tests

Vérifier que :
- [ ] `POST /api/otp/send` envoie bien un SMS
- [ ] `POST /api/otp/verify` vérifie correctement le code
- [ ] `POST /api/auth/login` retourne une erreur 400 avec message approprié
- [ ] Les clients existants peuvent toujours se connecter

## 🔄 Retour au mode simple

Si vous voulez revenir au mode simple :

```env
ENABLE_SMS_OTP=false
```

Puis redémarrer l'application.

## 📝 Notes

- Les deux modes peuvent coexister (le système vérifie la variable à chaque requête)
- Le code Twilio n'a jamais été supprimé
- La table `customers` reste utilisable même avec l'OTP activé

