import "dotenv/config";
import { checkRestaurantStatus } from "../server/utils/restaurant-status";

// Simuler l'heure actuelle à 11h58
const originalDate = Date;
(global as any).Date = class extends originalDate {
  constructor(...args: any[]) {
    if (args.length === 0) {
      // Si pas d'arguments, simuler 11h58
      super();
      this.setHours(11);
      this.setMinutes(58);
      this.setSeconds(0);
    } else {
      super(...args);
    }
  }
  
  static now() {
    const d = new Date();
    d.setHours(11);
    d.setMinutes(58);
    d.setSeconds(0);
    return d.getTime();
  }
  
  getHours() {
    return 11;
  }
  
  getMinutes() {
    return 58;
  }
  
  getSeconds() {
    return 0;
  }
  
  getDay() {
    return new originalDate().getDay(); // Garder le jour réel
  }
} as any;

console.log("🧪 Test de la logique des horaires pour BOUBA à 11h58\n");

// Test avec différents scénarios d'horaires
const testCases = [
  {
    name: "BOUBA - Horaires 18:00-23:00",
    restaurant: {
      name: "bouba",
      isOpen: true,
      openingHours: "18:00-23:00"
    },
    expected: false, // Devrait être fermé à 11h58
    description: "Restaurant ouvert de 18h à 23h, donc fermé à 11h58"
  },
  {
    name: "BOUBA - Horaires 09:00-23:00",
    restaurant: {
      name: "bouba",
      isOpen: true,
      openingHours: "09:00-23:00"
    },
    expected: true, // Devrait être ouvert à 11h58
    description: "Restaurant ouvert de 9h à 23h, donc ouvert à 11h58"
  },
  {
    name: "BOUBA - Horaires 20:00-06:00 (nuit)",
    restaurant: {
      name: "bouba",
      isOpen: true,
      openingHours: "20:00-06:00"
    },
    expected: false, // Devrait être fermé à 11h58
    description: "Restaurant ouvert la nuit (20h-6h), donc fermé à 11h58"
  },
  {
    name: "BOUBA - Toggle fermé",
    restaurant: {
      name: "bouba",
      isOpen: false,
      openingHours: "09:00-23:00"
    },
    expected: false, // Devrait être fermé même si horaires OK
    description: "Toggle fermé, donc toujours fermé"
  },
  {
    name: "BOUBA - Pas d'horaires",
    restaurant: {
      name: "bouba",
      isOpen: true,
      openingHours: null
    },
    expected: true, // Devrait être ouvert si toggle = true et pas d'horaires
    description: "Pas d'horaires définis, donc ouvert si toggle = true"
  }
];

testCases.forEach((testCase, index) => {
  console.log(`\n📋 Test ${index + 1}: ${testCase.name}`);
  console.log(`   Description: ${testCase.description}`);
  console.log(`   Données:`, testCase.restaurant);
  
  const result = checkRestaurantStatus(testCase.restaurant);
  
  console.log(`   Résultat:`, result);
  console.log(`   Attendu: ${testCase.expected ? 'Ouvert' : 'Fermé'}`);
  console.log(`   Obtenu: ${result.isOpen ? 'Ouvert' : 'Fermé'}`);
  
  if (result.isOpen === testCase.expected) {
    console.log(`   ✅ PASS`);
  } else {
    console.log(`   ❌ FAIL`);
  }
});

console.log("\n\n💡 Pour tester avec les vraies données de BOUBA, vérifiez les logs du serveur quand vous chargez la page.");

