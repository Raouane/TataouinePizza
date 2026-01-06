# Guide de Debug - Géocodage et Frais de Livraison

## Problème : Frais de livraison à 2.00 TND au lieu du prix calculé

Si vous voyez toujours 2.00 TND même pour des adresses lointaines, voici comment diagnostiquer :

## 1. Vérifier le Géocodage

### Dans la Console du Navigateur

Quand vous saisissez une adresse (ex: "Ksar Ouled Soltane"), vous devriez voir :

```
[Cart] 🔍 Géocodage de l'adresse: Ksar Ouled Soltane
[Cart] ✅ Adresse géocodée avec succès:
[Cart]    Nom complet: Ksar Ouled Soltane, Tataouine, Tunisie
[Cart]    Coordonnées: 32.9700, 10.4900
[Cart]    Adresse: {...}
[Cart] ✅ Onboarding mis à jour avec les nouvelles coordonnées
```

**Si vous ne voyez pas ces logs :**
- Le géocodage n'a pas fonctionné
- Vérifiez la console pour des erreurs
- L'adresse peut ne pas être trouvée par Nominatim

## 2. Vérifier la Détection des Changements

Vous devriez voir :

```
[DeliveryFee] 🔄 Détection de changement de coordonnées
[DeliveryFee] 🔄 Changement détecté dans l'onboarding: {currentKey: "32.9700-10.4900", lastKey: "32.9297-10.4511"}
[DeliveryFee] 📍 Coordonnées client: {lat: 32.9700, lng: 10.4900}
[DeliveryFee] 🏪 Restaurant: Tataouine Pizza
[DeliveryFee]    Coordonnées: 32.9297, 10.4511
[DeliveryFee]    Distance: 5.77 km
[DeliveryFee]    Frais: 5.27 TND
```

**Si vous ne voyez pas ces logs :**
- Le hook ne détecte pas les changements
- Les coordonnées ne sont pas mises à jour dans l'onboarding

## 3. Vérifier les Coordonnées dans localStorage

Ouvrez la Console et tapez :

```javascript
JSON.parse(localStorage.getItem('tp_onboarding'))
```

Vous devriez voir :
```json
{
  "lat": 32.9700,
  "lng": 10.4900,
  "address": "Ksar Ouled Soltane, Tataouine, Tunisie"
}
```

**Si `lat` et `lng` sont null ou absents :**
- Le géocodage n'a pas fonctionné
- L'adresse n'a pas été trouvée

## 4. Solutions

### Solution 1 : Utiliser l'Adresse Complète

Au lieu de juste "Ksar Ouled Soltane", essayez :
- "Ksar Ouled Soltane, Tataouine, Tunisie"
- "Ksar Ouled Soltane, Gouvernorat de Tataouine"

### Solution 2 : Utiliser la Carte Interactive

1. Cliquez sur "Choisir sur la carte"
2. Déplacez le marqueur vers Ksar Ouled Soltane
3. Les coordonnées seront mises à jour automatiquement

### Solution 3 : Vérifier les Coordonnées Manuellement

Si le géocodage ne fonctionne pas, vous pouvez mettre à jour manuellement dans la console :

```javascript
const onboarding = JSON.parse(localStorage.getItem('tp_onboarding') || '{}');
onboarding.lat = 32.9700;
onboarding.lng = 10.4900;
onboarding.address = "Ksar Ouled Soltane, Tataouine, Tunisie";
localStorage.setItem('tp_onboarding', JSON.stringify(onboarding));
window.dispatchEvent(new Event('onboarding-updated'));
```

Puis rechargez la page du panier.

## 5. Test Rapide

Pour tester rapidement, utilisez cette adresse qui devrait fonctionner :

**"Rue Habib Bourguiba 3200, Tataouine"**
- Distance: ~0.1 km
- Frais attendus: 2.00 TND ✅

**"Zone Industrielle, Tataouine"**
- Distance: ~2.5 km  
- Frais attendus: 2.25 TND ✅

**"Douiret, Tataouine"**
- Distance: ~6.0 km
- Frais attendus: 5.50 TND ✅

## 6. Vérifier les Logs du Serveur

Si le problème persiste, vérifiez aussi les logs du serveur backend pour voir si les coordonnées sont bien reçues lors de la création de commande.
