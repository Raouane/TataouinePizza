# 🔧 Correction de l'erreur OTP 500

## ❌ Erreur actuelle

```
Failed to load resource: the server responded with a status of 500
[Onboarding] Erreur envoi OTP: Error: Failed to send OTP
```

## 🔍 Causes possibles

1. **Table `otp_codes` n'existe pas** dans la base de données
2. **Problème de connexion à la base de données**
3. **Variables d'environnement manquantes**

## ✅ Solution : Vérifier les logs Render

1. Allez dans Render Dashboard → Votre service Web
2. Cliquez sur **"Logs"**
3. Cherchez les erreurs récentes avec `[OTP]` ou `Erreur`
4. Copiez l'erreur exacte

## 🔧 Solutions selon l'erreur

### Si l'erreur est "relation otp_codes does not exist"

La table `otp_codes` n'a pas été créée. Exécutez les migrations :

1. Dans Render Dashboard → Votre service Web → **"Shell"**
2. Exécutez :
   ```bash
   npm run db:push
   ```

### Si l'erreur est "connection refused" ou "ECONNREFUSED"

La base de données n'est pas correctement liée :

1. Allez dans Render Dashboard → Votre service Web → **"Settings"**
2. Vérifiez que `DATABASE_URL` est bien définie
3. Si elle n'est pas là, cliquez sur **"Link Database"** et sélectionnez votre base de données

### Si l'erreur est autre

Vérifiez que toutes les variables d'environnement sont définies :
- `DATABASE_URL` (automatique si base liée)
- `NODE_ENV` = `production`
- `PORT` = `10000`
- `JWT_SECRET` (doit être défini)

## 📝 Note importante

Le code OTP est actuellement retourné dans la réponse JSON (pour le développement). En production, vous devriez :
- Soit utiliser un service SMS (Twilio)
- Soit masquer le code dans la réponse (ne le retourner que dans les logs)

Pour l'instant, le code fonctionne en mode développement : le code est retourné dans la réponse et peut être utilisé directement.

## ✅ Vérification rapide

Testez l'endpoint directement :

```bash
curl -X POST https://votre-app.onrender.com/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "21612345678"}'
```

Si ça fonctionne, vous devriez recevoir :
```json
{
  "message": "OTP sent",
  "code": "1234"
}
```


