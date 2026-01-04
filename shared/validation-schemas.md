# Schémas de Validation Spécialisés

Ce fichier documente les schémas Zod spécialisés pour la validation métier de **Tataouine Pizza**.

## 📋 Schémas disponibles

### `phoneSchema`

Validation des numéros de téléphone tunisiens.

**Format accepté :**
- 8 chiffres (sans indicatif)
- Commence par **2, 4, 5, ou 9**
- Exemples valides : `"21234567"`, `"41234567"`, `"51234567"`, `"91234567"`

**Normalisation automatique :**
- Supprime les espaces, tirets, points, parenthèses
- Supprime les préfixes internationaux (`+216`, `00216`, `216`)
- Retourne le numéro normalisé (8 chiffres)

**Exemple d'utilisation :**

```typescript
import { phoneSchema } from "@shared/validation-schemas";

// Dans un schéma Zod
const userSchema = z.object({
  phone: phoneSchema,
  name: z.string(),
});

// Validation
const result = userSchema.parse({
  phone: "+216 21 234 567", // ✅ Normalisé en "21234567"
  name: "Ahmed",
});
```

---

### `latitudeSchema` et `longitudeSchema`

Validation des coordonnées GPS pour la zone Tunisie.

**Plages acceptées :**
- **Latitude** : 30.0°N à 37.5°N (Tunisie)
- **Longitude** : 7.0°E à 12.0°E (Tunisie)

**Exemple d'utilisation :**

```typescript
import { latitudeSchema, longitudeSchema } from "@shared/validation-schemas";

const locationSchema = z.object({
  lat: latitudeSchema,
  lng: longitudeSchema,
});

// ✅ Valide
locationSchema.parse({ lat: 32.9297, lng: 10.4511 }); // Tataouine

// ❌ Rejeté
locationSchema.parse({ lat: 48.8566, lng: 2.3522 }); // Paris (hors zone)
```

---

### `locationSchema`

Schéma complet pour une localisation GPS (optionnel).

**Exemple d'utilisation :**

```typescript
import { locationSchema } from "@shared/validation-schemas";

const orderSchema = z.object({
  address: z.string(),
  location: locationSchema, // Optionnel
});
```

---

### `orderLocationSchema`

Schéma spécialisé pour les coordonnées GPS dans les commandes.

**Validation :**
- Si `customerLat` est fourni, `customerLng` doit l'être aussi (et vice versa)
- Les deux coordonnées doivent être dans la zone Tunisie

**Exemple d'utilisation :**

```typescript
import { orderLocationSchema } from "@shared/validation-schemas";

const orderSchema = z.object({
  customerName: z.string(),
  phone: phoneSchema,
  ...orderLocationSchema.shape, // customerLat, customerLng
});
```

---

### `amountSchema`

Validation des montants en TND (Dinar tunisien).

**Validation :**
- Montant positif
- Maximum 10 000 TND
- Maximum 2 décimales

**Exemple d'utilisation :**

```typescript
import { amountSchema } from "@shared/validation-schemas";

const paymentSchema = z.object({
  amount: amountSchema,
  currency: z.literal("TND"),
});
```

---

### `addressSchema`

Validation des adresses tunisiennes.

**Validation :**
- Minimum 5 caractères
- Maximum 200 caractères
- Ne peut pas être vide ou contenir uniquement des espaces

**Exemple d'utilisation :**

```typescript
import { addressSchema } from "@shared/validation-schemas";

const deliverySchema = z.object({
  address: addressSchema,
  addressDetails: z.string().max(200).optional(),
});
```

---

### `nameSchema`

Validation des noms (clients, livreurs, restaurants).

**Validation :**
- Minimum 2 caractères
- Maximum 100 caractères
- Uniquement lettres, espaces, tirets, apostrophes
- Trim automatique

**Exemple d'utilisation :**

```typescript
import { nameSchema } from "@shared/validation-schemas";

const driverSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
});
```

---

## 🔧 Helpers

### `createPhoneSchema(customMessage?)`

Crée un schéma de téléphone avec un message d'erreur personnalisé.

```typescript
import { createPhoneSchema } from "@shared/validation-schemas";

const customPhoneSchema = createPhoneSchema(
  "Veuillez entrer un numéro de téléphone tunisien valide"
);
```

### `createLocationSchema(centerLat, centerLng, radiusKm?)`

Crée un schéma de localisation avec validation de zone (rayon).

**Paramètres :**
- `centerLat` : Latitude du centre (défaut : 32.9297 - Tataouine)
- `centerLng` : Longitude du centre (défaut : 10.4511 - Tataouine)
- `radiusKm` : Rayon en kilomètres (défaut : 50km)

**Exemple :**

```typescript
import { createLocationSchema } from "@shared/validation-schemas";

// Validation dans un rayon de 30km autour de Tataouine
const tataouineLocationSchema = createLocationSchema(32.9297, 10.4511, 30);

// ✅ Valide (dans le rayon)
tataouineLocationSchema.parse({ lat: 32.95, lng: 10.46 });

// ❌ Rejeté (hors du rayon)
tataouineLocationSchema.parse({ lat: 36.8, lng: 10.1 }); // Tunis (trop loin)
```

---

## 📚 Intégration dans les routes

### Exemple : Route de création de commande

```typescript
import { validate } from "../../middlewares/validate";
import { insertOrderSchema } from "@shared/schema"; // Utilise déjà phoneSchema, nameSchema, etc.

app.post(
  "/api/orders",
  validate(insertOrderSchema), // ✅ Validation automatique avec schémas spécialisés
  asyncHandler(async (req, res) => {
    // req.body.phone est normalisé (8 chiffres)
    // req.body.customerLat/lng sont validés (zone Tunisie)
    const result = await OrderCreationService.createOrder(req.body);
    res.json(result);
  })
);
```

### Exemple : Route avec validation personnalisée

```typescript
import { z } from "zod";
import { phoneSchema, createLocationSchema } from "@shared/validation-schemas";
import { validate } from "../../middlewares/validate";

const customOrderSchema = z.object({
  phone: phoneSchema,
  location: createLocationSchema(32.9297, 10.4511, 20), // 20km autour de Tataouine
});

app.post(
  "/api/orders/local",
  validate(customOrderSchema),
  asyncHandler(async (req, res) => {
    // Validation automatique
  })
);
```

---

## 🎯 Avantages

1. **Sécurité renforcée** : Rejet immédiat des données invalides
2. **Normalisation automatique** : Les numéros de téléphone sont normalisés
3. **Messages d'erreur clairs** : Messages en français pour le frontend
4. **Réutilisabilité** : Un seul schéma pour tout le projet
5. **Maintenance facilitée** : Changement de règle = un seul endroit à modifier

---

## 🔍 Tests

Pour tester les schémas :

```typescript
import { phoneSchema } from "@shared/validation-schemas";

// ✅ Valide
phoneSchema.parse("21234567");
phoneSchema.parse("+216 21 234 567");
phoneSchema.parse("00216 21 234 567");

// ❌ Invalide
phoneSchema.parse("12345678"); // Ne commence pas par 2, 4, 5 ou 9
phoneSchema.parse("2123456"); // Moins de 8 chiffres
phoneSchema.parse("abc12345"); // Contient des lettres
```
