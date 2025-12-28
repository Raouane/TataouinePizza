# Configuration Twilio pour les notifications SMS et WhatsApp

## Variables d'environnement requises

Ajoutez ces variables dans votre fichier `.env` (ou dans les variables d'environnement de Render) :

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
TWILIO_VERIFIED_NUMBER=+33783698509
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

**Note** : 
- Remplacez les `x` par vos vraies valeurs depuis votre dashboard Twilio.
- `TWILIO_VERIFIED_NUMBER` : Votre numéro vérifié dans Twilio (obligatoire pour le compte Trial)
- `TWILIO_WHATSAPP_NUMBER` : Votre numéro WhatsApp Twilio (format: `whatsapp:+14155238886`)

## Comment ça fonctionne

Quand une nouvelle commande est créée :
1. Le système envoie une notification WebSocket (comme avant)
2. Le système envoie aussi un SMS à tous les livreurs disponibles
3. Le système envoie aussi un message WhatsApp à tous les livreurs disponibles (sonnerie garantie, même téléphone éteint)
4. Chaque livreur reçoit un SMS et un WhatsApp avec les détails de la commande
5. Le livreur ouvre l'app et accepte la commande

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

- **SMS** : ~0.01-0.05€ par SMS
- **WhatsApp** : ~0.005-0.01€ par message
- Si 5 livreurs disponibles = 5 SMS + 5 WhatsApp = 0.075€ par commande
- Si 20 commandes/jour = 1.50€/jour = ~45€/mois

**Avantage WhatsApp** : Sonnerie garantie même téléphone éteint (contrairement aux notifications push PWA)

## Configuration WhatsApp

### Étape 1 : Activer WhatsApp dans Twilio Console

1. Allez dans Twilio Console → **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Rejoignez le **Sandbox** (pour tester) ou demandez l'**approbation complète** (pour production)
3. Copiez votre numéro WhatsApp (format: `whatsapp:+14155238886`)

### Étape 2 : Ajouter les numéros de vos livreurs au Sandbox

En mode Sandbox, vous devez :
1. Ajouter les numéros de vos livreurs dans Twilio Console (Sandbox settings)
2. Chaque livreur doit envoyer le code du Sandbox à son numéro WhatsApp pour rejoindre

### Étape 3 : Variables d'environnement

Ajoutez `TWILIO_WHATSAPP_NUMBER` dans vos variables d'environnement :
```env
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

## Configuration sur Render

1. Allez dans votre service Render
2. Cliquez sur "Environment"
3. Ajoutez les variables :
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `TWILIO_WHATSAPP_NUMBER` (nouveau)
4. Redéployez le service

## Test

Pour tester :
1. Créez une commande depuis l'app
2. Vérifiez les logs : 
   - `[SMS] ✅ SMS envoyé à...`
   - `[WhatsApp] ✅ Message WhatsApp envoyé à...`
3. Vérifiez que le SMS et le WhatsApp arrivent sur le téléphone du livreur
4. Le WhatsApp doit sonner même si le téléphone est éteint (après redémarrage)

## Dépannage

### SMS ne sont pas envoyés :
1. Vérifiez que les variables d'environnement sont bien définies
2. Vérifiez les logs : `[SMS] ⚠️ Twilio non configuré` signifie que les variables manquent
3. Vérifiez que votre compte Twilio est crédité (pour envoyer à d'autres numéros que le vôtre)
4. Vérifiez le format des numéros de téléphone des livreurs (doit être au format international)

### WhatsApp ne sont pas envoyés :
1. Vérifiez que `TWILIO_WHATSAPP_NUMBER` est défini (format: `whatsapp:+14155238886`)
2. Vérifiez les logs : `[WhatsApp] ❌ Numéro WhatsApp Twilio non configuré`
3. En mode Sandbox : Vérifiez que le livreur a rejoint le Sandbox (a envoyé le code à son numéro)
4. Vérifiez les codes d'erreur dans les logs :
   - `21608` : Numéro non autorisé (ajoutez-le dans Twilio Console)
   - `63007` : Template requis (le livreur doit rejoindre le Sandbox)
   - `21610` : Message non autorisé (utilisez un template pour le premier message)

