# Authentification Simple - MVP

## 🎯 Vue d'ensemble

L'authentification simple permet aux clients de se connecter avec uniquement leur **prénom** et leur **numéro de téléphone**, sans OTP ni SMS. Cette approche réduit la friction pour le MVP local.

## ⚙️ Configuration

### Variable d'environnement

Ajoutez dans votre fichier `.env` :

```env
# Authentification OTP (désactivée par défaut pour le MVP)
ENABLE_SMS_OTP=false
```

### Modes d'authentification

| Mode | ENABLE_SMS_OTP | Comportement |
|------|----------------|--------------|
| **Simple (MVP)** | `false` ou non défini | Prénom + téléphone → connexion immédiate |
| **OTP** | `true` | Flow OTP classique avec SMS |

## 📡 API Endpoints

### POST /api/auth/login (Mode Simple)

Authentification simple avec prénom + téléphone.

**Request:**
```json
{
  "firstName": "Mohamed",
  "phone": "21653666945"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "customer": {
    "id": "uuid-here",
    "firstName": "Mohamed",
    "phone": "21653666945"
  }
}
```

**Comportement:**
- Si le client existe → connexion automatique
- Si le client n'existe pas → création automatique puis connexion
- Le prénom est mis à jour si différent

### POST /api/otp/send (Mode OTP - si activé)

Envoie un code OTP par SMS.

**Request:**
```json
{
  "phone": "21653666945"
}
```

**Response si OTP désactivé (400):**
```json
{
  "error": "OTP authentication is disabled. Please use /api/auth/login endpoint.",
  "message": "OTP désactivé pour le MVP. Utilisez /api/auth/login avec prénom + téléphone."
}
```

### POST /api/otp/verify (Mode OTP - si activé)

Vérifie le code OTP.

**Request:**
```json
{
  "phone": "21653666945",
  "code": "1234"
}
```

## 🔐 Gestion des sessions

### Token JWT

- **Durée de validité**: 7 jours
- **Contenu**: `{ id: customerId, email: phone }`
- **Stockage recommandé**: `localStorage` ou cookie HTTP-only

### Vérification du token

Utilisez `verifyCustomerToken()` du service `customer-auth-service.ts` :

```typescript
import { verifyCustomerToken } from "../services/customer-auth-service";

const customer = await verifyCustomerToken(token);
if (!customer) {
  // Token invalide ou expiré
}
```

## 📋 Checklist pour réactiver l'OTP

Si vous souhaitez réactiver l'authentification OTP plus tard :

### 1. Variable d'environnement

```env
ENABLE_SMS_OTP=true
```

### 2. Vérifier les routes OTP

Les routes `/api/otp/send` et `/api/otp/verify` sont déjà en place et fonctionnent automatiquement quand `ENABLE_SMS_OTP=true`.

### 3. Frontend

Modifier le frontend pour :
- Désactiver l'appel à `/api/auth/login`
- Réactiver le flow OTP (`/api/otp/send` → `/api/otp/verify`)

### 4. Code Twilio

Le code Twilio existant n'a **pas été supprimé**. Il est toujours présent dans :
- `server/services/sms-service.ts`
- Les routes OTP dans `server/routes/auth.ts`

### 5. Migration des données

Les clients créés via l'authentification simple peuvent continuer à utiliser l'OTP si nécessaire. Aucune migration de données n'est requise.

## 🏗️ Architecture

### Service centralisé

Toute la logique d'authentification est centralisée dans :
- `server/services/customer-auth-service.ts`

### Storage

Les méthodes customers sont dans :
- `server/storage.ts` : `getCustomerByPhone()`, `createCustomer()`, `updateCustomer()`

### Schéma de base de données

Table `customers` :
```sql
CREATE TABLE customers (
  id VARCHAR PRIMARY KEY,
  first_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔒 Sécurité

### MVP (Mode Simple)

- ✅ Validation des données (Zod)
- ✅ Normalisation du numéro de téléphone
- ✅ Token JWT sécurisé (7 jours)
- ⚠️ Pas de vérification SMS (acceptable pour MVP local)

### Production (Mode OTP)

- ✅ Toutes les sécurités du mode simple
- ✅ Vérification SMS via Twilio
- ✅ Rate limiting sur les endpoints OTP
- ✅ Expiration des codes OTP (5 minutes)

## 📝 Notes importantes

1. **Code Twilio préservé** : Le code SMS/Twilio n'a pas été supprimé, il est simplement désactivé via la variable d'environnement.

2. **Compatibilité** : Les deux modes peuvent coexister. Le système vérifie `ENABLE_SMS_OTP` à chaque requête.

3. **Migration automatique** : La table `customers` est créée automatiquement au démarrage via `migrate-on-startup.ts`.

4. **Commentaires dans le code** : Tous les endroits où l'OTP est conditionnel sont marqués avec :
   ```typescript
   // OTP DISABLED FOR MVP – ENABLE VIA ENABLE_SMS_OTP ENV FLAG
   ```

## 🚀 Exemple d'utilisation

### Frontend (React)

```typescript
// Authentification simple
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName: 'Mohamed',
    phone: '21653666945'
  })
});

const { token, customer } = await response.json();
localStorage.setItem('authToken', token);
```

### Backend (Middleware)

```typescript
import { verifyCustomerToken } from '../services/customer-auth-service';

async function authenticateCustomer(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  const customer = await verifyCustomerToken(token);
  if (!customer) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.customer = customer;
  next();
}
```

