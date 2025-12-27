import "dotenv/config";
import { checkRestaurantStatus } from "../server/utils/restaurant-status";

// Test avec différents scénarios
const now = new Date();
const currentHour = now.getHours();
const currentMinute = now.getMinutes();
const currentTime = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;
const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const currentDay = dayNames[now.getDay()];

console.log("🕐 Heure actuelle:", currentTime);
console.log("📅 Jour actuel:", currentDay);
console.log("\n");

// Test 1: Restaurant ouvert normalement (09:00-23:00)
const test1 = checkRestaurantStatus({
  isOpen: true,
  openingHours: "09:00-23:00"
});
console.log("Test 1 - Restaurant 09:00-23:00, isOpen=true:");
console.log("  Résultat:", test1);
console.log("  Attendu:", currentTime >= "09:00" && currentTime <= "23:00" ? "ouvert" : "fermé");
console.log("\n");

// Test 2: Restaurant fermé selon horaires mais isOpen=true
const test2 = checkRestaurantStatus({
  isOpen: true,
  openingHours: "20:00-06:00" // Ouvert la nuit
});
console.log("Test 2 - Restaurant 20:00-06:00 (nuit), isOpen=true:");
console.log("  Résultat:", test2);
const isNightOpen = currentTime >= "20:00" || currentTime <= "06:00";
console.log("  Attendu:", isNightOpen ? "ouvert" : "fermé");
console.log("\n");

// Test 3: Restaurant avec horaires normaux mais fermé maintenant
// Supposons qu'il est 14:00 et le restaurant est ouvert 18:00-23:00
const test3 = checkRestaurantStatus({
  isOpen: true,
  openingHours: "18:00-23:00"
});
console.log("Test 3 - Restaurant 18:00-23:00, isOpen=true, heure actuelle:", currentTime);
console.log("  Résultat:", test3);
const shouldBeOpen = currentTime >= "18:00" && currentTime <= "23:00";
console.log("  Attendu:", shouldBeOpen ? "ouvert" : "fermé");
console.log("\n");

// Test 4: Restaurant fermé via toggle
const test4 = checkRestaurantStatus({
  isOpen: false,
  openingHours: "09:00-23:00"
});
console.log("Test 4 - Restaurant 09:00-23:00, isOpen=false:");
console.log("  Résultat:", test4);
console.log("  Attendu: fermé (toggle)");
console.log("\n");

// Test 5: Restaurant avec jour de repos
const test5 = checkRestaurantStatus({
  isOpen: true,
  openingHours: `09:00-23:00|${currentDay}`
});
console.log(`Test 5 - Restaurant 09:00-23:00, jour de repos=${currentDay}:`);
console.log("  Résultat:", test5);
console.log("  Attendu: fermé (jour de repos)");
console.log("\n");


