# Configuration Twilio pour les notifications SMS

## Variables d'environnement requises

Ajoutez ces variables dans votre fichier `.env` (ou dans les variables d'environnement de Render) :

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
TWILIO_VERIFIED_NUMBER=+33783698509
```

**Note** : 
- Remplacez les `x` par vos vraies valeurs depuis votre dashboard Twilio.
- `TWILIO_VERIFIED_NUMBER` : Votre numéro vérifié dans Twilio (obligatoire pour le compte Trial)

## Comment ça fonctionne

Quand une nouvelle commande est créée :
1. Le système envoie une notification WebSocket (comme avant)
2. Le système envoie aussi un SMS à tous les livreurs disponibles
3. Chaque livreur reçoit un SMS avec les détails de la commande
4. Le livreur ouvre l'app et accepte la commande

## Format des SMS

Le SMS envoyé contient :
```
🔔 Nouvelle commande disponible!
Restaurant: [Nom du restaurant]
Client: [Nom du client]
Total: [Montant] TND
ID: [8 premiers caractères de l'ID]
```

## Limitation du compte Trial

Avec un compte Twilio Trial :
- Vous pouvez envoyer des SMS uniquement vers votre numéro vérifié
- Parfait pour tester
- Pour envoyer à vos livreurs, il faut créditer le compte (minimum ~10-20$)

## Coût

- SMS : ~0.01-0.05€ par SMS
- Si 5 livreurs disponibles = 5 SMS × 0.01€ = 0.05€ par commande
- Si 20 commandes/jour = 1€/jour = ~30€/mois

## Configuration sur Render

1. Allez dans votre service Render
2. Cliquez sur "Environment"
3. Ajoutez les 3 variables :
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
4. Redéployez le service

## Test

Pour tester :
1. Créez une commande depuis l'app
2. Vérifiez les logs : `[SMS] ✅ SMS envoyé à...`
3. Vérifiez que le SMS arrive sur le téléphone du livreur

## Dépannage

Si les SMS ne sont pas envoyés :
1. Vérifiez que les variables d'environnement sont bien définies
2. Vérifiez les logs : `[SMS] ⚠️ Twilio non configuré` signifie que les variables manquent
3. Vérifiez que votre compte Twilio est crédité (pour envoyer à d'autres numéros que le vôtre)
4. Vérifiez le format des numéros de téléphone des livreurs (doit être au format international)

