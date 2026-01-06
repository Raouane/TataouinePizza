# Adresses de Test pour Tataouine - Calcul des Frais de Livraison

Ce document contient des adresses à Tataouine avec leurs coordonnées GPS pour tester différents prix de livraison.

## Restaurant de Référence
**Rue Habib Bourguiba, Tataouine 3200**
- Latitude: 32.9297
- Longitude: 10.4511

## Adresses de Test (par distance croissante)

### 1. Proche (0-2 km) - Frais: 2.00 TND
**Rue Habib Bourguiba 3200, Tataouine**
- Latitude: 32.9297
- Longitude: 10.4511
- Distance estimée: ~0.1 km
- **Frais de livraison: 2.00 TND** (minimum)

**Avenue de la République, Tataouine**
- Latitude: 32.9300
- Longitude: 10.4515
- Distance estimée: ~0.5 km
- **Frais de livraison: 2.00 TND**

**Rue Mohamed Ali, Tataouine**
- Latitude: 32.9285
- Longitude: 10.4505
- Distance estimée: ~1.5 km
- **Frais de livraison: 2.00 TND**

### 2. Moyenne distance (2-5 km) - Frais: 2.00-4.50 TND
**Zone Industrielle, Tataouine**
- Latitude: 32.9350
- Longitude: 10.4550
- Distance estimée: ~2.5 km
- **Frais de livraison: 2.00 + (0.5 × 0.5) = 2.25 TND**

**Cité El Bassatine, Tataouine**
- Latitude: 32.9400
- Longitude: 10.4600
- Distance estimée: ~3.5 km
- **Frais de livraison: 2.00 + (1.5 × 0.5) = 2.75 TND**

**Route de Gabès, Tataouine**
- Latitude: 32.9450
- Longitude: 10.4650
- Distance estimée: ~4.5 km
- **Frais de livraison: 2.00 + (2.5 × 0.5) = 3.25 TND**

### 3. Longue distance (5-10 km) - Frais: 4.50-9.50 TND
**Douiret, Tataouine**
- Latitude: 32.9500
- Longitude: 10.4700
- Distance estimée: ~6.0 km
- **Frais de livraison: 4.50 + (1.0 × 1.0) = 5.50 TND**

**Chenini, Tataouine**
- Latitude: 32.9600
- Longitude: 10.4800
- Distance estimée: ~8.0 km
- **Frais de livraison: 4.50 + (3.0 × 1.0) = 7.50 TND**

**Ksar Ouled Soltane, Tataouine**
- Latitude: 32.9700
- Longitude: 10.4900
- Distance réelle calculée: ~5.77 km (depuis restaurant 32.9297, 10.4511)
- **Frais de livraison: 4.50 + (0.77 × 1.0) = 5.27 TND** ⚠️ CORRIGÉ

### 4. Très longue distance (>10 km) - Frais: >9.50 TND
**Ksar Haddada, Tataouine**
- Latitude: 33.0000
- Longitude: 10.5000
- Distance estimée: ~12.0 km
- **Frais de livraison: 9.50 + (2.0 × 1.5) = 12.50 TND**

**Ksar Ouled Debbab, Tataouine**
- Latitude: 33.0200
- Longitude: 10.5200
- Distance estimée: ~15.0 km
- **Frais de livraison: 9.50 + (5.0 × 1.5) = 17.00 TND**

## Comment Tester

1. **Dans le panier**, saisissez manuellement une des adresses ci-dessus
2. Attendez 1.5 secondes pour que le géocodage automatique se déclenche
3. Les coordonnées GPS seront automatiquement récupérées
4. Les frais de livraison seront calculés dynamiquement selon la distance
5. Vérifiez que les frais correspondent aux calculs ci-dessus

## Notes

- Les coordonnées sont approximatives et peuvent varier légèrement selon le géocodage
- Le géocodage automatique ajoute "Tataouine, Tunisie" si nécessaire
- Les frais sont calculés avec la formule de Haversine pour la distance réelle
- Le temps de livraison estimé est calculé: 15 min (préparation) + (distance / 30 km/h × 60)

## Formule de Calcul des Frais

```
Si distance <= 2 km    : 2.00 TND
Si distance <= 5 km    : 2.00 + (distance - 2) × 0.50 TND
Si distance <= 10 km   : 4.50 + (distance - 5) × 1.00 TND
Si distance > 10 km    : 9.50 + (distance - 10) × 1.50 TND
```
