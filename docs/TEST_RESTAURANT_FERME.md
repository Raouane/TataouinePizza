# 🧪 Guide de test : Restaurant fermé

## 🎯 Fonctionnalité testée

Afficher un message clair au client si le restaurant est fermé et désactiver la possibilité de commander.

## 📋 Comment tester en développement local

### 1. Démarrer l'application

```bash
npm run dev
```

L'application sera accessible sur : `http://localhost:5000`

### 2. Tester avec un restaurant fermé

#### Option A : Fermer un restaurant via la base de données

1. Ouvrez **pgAdmin 4**
2. Connectez-vous à votre base de données `tataouine_pizza`
3. Exécutez cette requête SQL :

```sql
-- Fermer le restaurant "Tataouine Pizza"
UPDATE restaurants 
SET is_open = false
WHERE name = 'Tataouine Pizza';
```

4. Rechargez la page du menu dans votre navigateur
5. Vous devriez voir :
   - ✅ Un badge "Fermé" rouge à côté du nom du restaurant
   - ✅ Un bandeau d'alerte rouge avec le message "Restaurant fermé"
   - ✅ Les boutons "Ajouter au panier" désactivés (grisés)

#### Option B : Modifier les horaires pour simuler la fermeture

```sql
-- Mettre des horaires qui excluent l'heure actuelle
-- Exemple : si vous testez à 15h, mettez 16:00-10:00
UPDATE restaurants 
SET opening_hours = '16:00-10:00'  -- Fermé entre 10h et 16h
WHERE name = 'Tataouine Pizza';
```

### 3. Tester avec un restaurant ouvert

Pour rouvrir le restaurant :

```sql
UPDATE restaurants 
SET is_open = true,
    opening_hours = '09:00-23:00'  -- Ouvert de 9h à 23h
WHERE name = 'Tataouine Pizza';
```

## ✅ Checklist de test

- [ ] Le badge "Fermé" s'affiche quand `isOpen = false`
- [ ] Le badge "Fermé" s'affiche quand l'heure actuelle est en dehors des `openingHours`
- [ ] Le bandeau d'alerte rouge s'affiche avec le message approprié
- [ ] Les boutons "Ajouter au panier" sont désactivés (grisés)
- [ ] Le texte du bouton change en "Restaurant fermé"
- [ ] Les cartes de pizzas sont légèrement assombries (opacity-60)
- [ ] Le badge "Ouvert" s'affiche quand le restaurant est ouvert
- [ ] Les boutons fonctionnent normalement quand le restaurant est ouvert

## 🎨 Comportement attendu

### Restaurant fermé
- Badge rouge "Fermé"
- Bandeau d'alerte rouge avec icône 🚫
- Message : "Le restaurant est actuellement fermé..."
- Boutons désactivés et grisés
- Cartes de pizzas assombries

### Restaurant ouvert
- Badge vert "Ouvert"
- Pas de bandeau d'alerte
- Boutons "Ajouter au panier" actifs
- Cartes de pizzas normales

## 🔄 Tester le changement d'état

1. Fermez le restaurant (via SQL)
2. Rechargez la page → Vérifiez que c'est fermé
3. Ouvrez le restaurant (via SQL)
4. Rechargez la page → Vérifiez que c'est ouvert

## 📝 Notes

- Les horaires sont au format `"09:00-23:00"` (24h)
- Si `openingHours` n'est pas défini, le restaurant est considéré comme ouvert
- Si `isOpen = false`, le restaurant est toujours fermé, peu importe les horaires





