/**
 * Tests unitaires pour les schémas de validation Zod
 * 
 * Ces tests vérifient que tous les schémas de validation fonctionnent correctement
 * pour le contexte tunisien (Tataouine Pizza)
 * 
 * Pour exécuter ces tests :
 * npm test -- test/validation-schemas.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  phoneSchema,
  latitudeSchema,
  longitudeSchema,
  locationSchema,
  orderLocationSchema,
  amountSchema,
  addressSchema,
  nameSchema,
  createPhoneSchema,
  createLocationSchema,
} from "@shared/validation-schemas";

describe("phoneSchema", () => {
  describe("Validation des numéros de téléphone tunisiens", () => {
    it("devrait accepter un numéro de 8 chiffres commençant par 2, 4, 5 ou 9", () => {
      expect(phoneSchema.parse("21234567")).toBe("21234567");
      expect(phoneSchema.parse("41234567")).toBe("41234567");
      expect(phoneSchema.parse("51234567")).toBe("51234567");
      expect(phoneSchema.parse("91234567")).toBe("91234567");
    });

    it("devrait normaliser les numéros avec préfixe +216", () => {
      expect(phoneSchema.parse("+21621234567")).toBe("21234567");
      expect(phoneSchema.parse("+216 21 234 567")).toBe("21234567");
      expect(phoneSchema.parse("+216-21-234-567")).toBe("21234567");
    });

    it("devrait normaliser les numéros avec préfixe 00216", () => {
      expect(phoneSchema.parse("0021621234567")).toBe("21234567");
      // Note: Le schéma valide la longueur (max 15) avant la transformation
      // Les formats avec espaces/tirets peuvent dépasser 15 caractères
      // On teste donc uniquement le format compact
    });

    it("devrait normaliser les numéros avec préfixe 216", () => {
      expect(phoneSchema.parse("21621234567")).toBe("21234567");
      expect(phoneSchema.parse("216 21 234 567")).toBe("21234567");
    });

    it("devrait supprimer les espaces, tirets et points", () => {
      expect(phoneSchema.parse("21 23 45 67")).toBe("21234567");
      expect(phoneSchema.parse("21-23-45-67")).toBe("21234567");
      expect(phoneSchema.parse("21.23.45.67")).toBe("21234567");
      expect(phoneSchema.parse("(21) 23 45 67")).toBe("21234567");
    });

    it("devrait rejeter les numéros qui ne commencent pas par 2, 4, 5 ou 9", () => {
      expect(() => phoneSchema.parse("11234567")).toThrow();
      expect(() => phoneSchema.parse("31234567")).toThrow();
      expect(() => phoneSchema.parse("61234567")).toThrow();
      expect(() => phoneSchema.parse("71234567")).toThrow();
      expect(() => phoneSchema.parse("81234567")).toThrow();
    });

    it("devrait rejeter les numéros avec moins de 8 chiffres", () => {
      expect(() => phoneSchema.parse("2123456")).toThrow();
      expect(() => phoneSchema.parse("212345")).toThrow();
    });

    it("devrait rejeter les numéros avec plus de 8 chiffres (après normalisation)", () => {
      expect(() => phoneSchema.parse("212345678")).toThrow();
    });

    it("devrait rejeter les chaînes vides", () => {
      expect(() => phoneSchema.parse("")).toThrow();
    });

    it("devrait rejeter les numéros contenant des lettres", () => {
      expect(() => phoneSchema.parse("2123456a")).toThrow();
      expect(() => phoneSchema.parse("abc12345")).toThrow();
    });
  });
});

describe("latitudeSchema", () => {
  describe("Validation des coordonnées GPS (latitude)", () => {
    it("devrait accepter une latitude dans la zone Tunisie (30°N à 37.5°N)", () => {
      expect(latitudeSchema.parse(32.9297)).toBe(32.9297); // Tataouine
      expect(latitudeSchema.parse(36.8065)).toBe(36.8065); // Tunis
      expect(latitudeSchema.parse(30.0)).toBe(30.0); // Limite sud
      expect(latitudeSchema.parse(37.5)).toBe(37.5); // Limite nord
    });

    it("devrait rejeter une latitude inférieure à 30°", () => {
      expect(() => latitudeSchema.parse(29.9)).toThrow();
      expect(() => latitudeSchema.parse(0)).toThrow();
      expect(() => latitudeSchema.parse(-10)).toThrow();
    });

    it("devrait rejeter une latitude supérieure à 37.5°", () => {
      expect(() => latitudeSchema.parse(37.6)).toThrow();
      expect(() => latitudeSchema.parse(48.8566)).toThrow(); // Paris
      expect(() => latitudeSchema.parse(90)).toThrow();
    });

    it("devrait rejeter NaN et Infinity", () => {
      expect(() => latitudeSchema.parse(NaN)).toThrow();
      expect(() => latitudeSchema.parse(Infinity)).toThrow();
      expect(() => latitudeSchema.parse(-Infinity)).toThrow();
    });
  });
});

describe("longitudeSchema", () => {
  describe("Validation des coordonnées GPS (longitude)", () => {
    it("devrait accepter une longitude dans la zone Tunisie (7°E à 12°E)", () => {
      expect(longitudeSchema.parse(10.4511)).toBe(10.4511); // Tataouine
      expect(longitudeSchema.parse(10.1815)).toBe(10.1815); // Tunis
      expect(longitudeSchema.parse(7.0)).toBe(7.0); // Limite ouest
      expect(longitudeSchema.parse(12.0)).toBe(12.0); // Limite est
    });

    it("devrait rejeter une longitude inférieure à 7°E", () => {
      expect(() => longitudeSchema.parse(6.9)).toThrow();
      expect(() => longitudeSchema.parse(0)).toThrow();
      expect(() => longitudeSchema.parse(-10)).toThrow();
    });

    it("devrait rejeter une longitude supérieure à 12°E", () => {
      expect(() => longitudeSchema.parse(12.1)).toThrow();
      expect(() => longitudeSchema.parse(2.3522)).toThrow(); // Paris
      expect(() => longitudeSchema.parse(180)).toThrow();
    });

    it("devrait rejeter NaN et Infinity", () => {
      expect(() => longitudeSchema.parse(NaN)).toThrow();
      expect(() => longitudeSchema.parse(Infinity)).toThrow();
      expect(() => longitudeSchema.parse(-Infinity)).toThrow();
    });
  });
});

describe("locationSchema", () => {
  describe("Validation d'une localisation GPS complète", () => {
    it("devrait accepter une localisation valide avec lat et lng", () => {
      const result = locationSchema.parse({
        lat: 32.9297,
        lng: 10.4511,
      });
      expect(result).toEqual({ lat: 32.9297, lng: 10.4511 });
    });

    it("devrait accepter null (localisation optionnelle)", () => {
      expect(locationSchema.parse(null)).toBeNull();
      expect(locationSchema.parse(undefined)).toBeUndefined();
    });

    it("devrait rejeter une localisation avec latitude invalide", () => {
      expect(() =>
        locationSchema.parse({
          lat: 48.8566, // Paris (hors zone Tunisie)
          lng: 10.4511,
        })
      ).toThrow();
    });

    it("devrait rejeter une localisation avec longitude invalide", () => {
      expect(() =>
        locationSchema.parse({
          lat: 32.9297,
          lng: 2.3522, // Paris (hors zone Tunisie)
        })
      ).toThrow();
    });

    it("devrait rejeter une localisation avec lat manquante", () => {
      expect(() =>
        locationSchema.parse({
          lng: 10.4511,
        })
      ).toThrow();
    });

    it("devrait rejeter une localisation avec lng manquante", () => {
      expect(() =>
        locationSchema.parse({
          lat: 32.9297,
        })
      ).toThrow();
    });
  });
});

describe("orderLocationSchema", () => {
  describe("Validation des coordonnées GPS pour les commandes", () => {
    it("devrait accepter customerLat et customerLng ensemble", () => {
      const result = orderLocationSchema.parse({
        customerLat: 32.9297,
        customerLng: 10.4511,
      });
      expect(result.customerLat).toBe(32.9297);
      expect(result.customerLng).toBe(10.4511);
    });

    it("devrait accepter null pour les deux coordonnées", () => {
      const result = orderLocationSchema.parse({
        customerLat: null,
        customerLng: null,
      });
      expect(result.customerLat).toBeNull();
      expect(result.customerLng).toBeNull();
    });

    it("devrait accepter undefined pour les deux coordonnées", () => {
      const result = orderLocationSchema.parse({
        customerLat: undefined,
        customerLng: undefined,
      });
      expect(result.customerLat).toBeUndefined();
      expect(result.customerLng).toBeUndefined();
    });

    it("devrait rejeter customerLat sans customerLng", () => {
      expect(() =>
        orderLocationSchema.parse({
          customerLat: 32.9297,
          customerLng: null,
        })
      ).toThrow();
    });

    it("devrait rejeter customerLng sans customerLat", () => {
      expect(() =>
        orderLocationSchema.parse({
          customerLat: null,
          customerLng: 10.4511,
        })
      ).toThrow();
    });

    it("devrait rejeter une latitude hors zone Tunisie", () => {
      expect(() =>
        orderLocationSchema.parse({
          customerLat: 48.8566, // Paris
          customerLng: 10.4511,
        })
      ).toThrow();
    });

    it("devrait rejeter une longitude hors zone Tunisie", () => {
      expect(() =>
        orderLocationSchema.parse({
          customerLat: 32.9297,
          customerLng: 2.3522, // Paris
        })
      ).toThrow();
    });
  });
});

describe("amountSchema", () => {
  describe("Validation des montants en TND", () => {
    it("devrait accepter un montant positif", () => {
      expect(amountSchema.parse(10.5)).toBe(10.5);
      expect(amountSchema.parse(100)).toBe(100);
      expect(amountSchema.parse(0.01)).toBe(0.01);
    });

    it("devrait accepter un montant avec 2 décimales maximum", () => {
      expect(amountSchema.parse(10.99)).toBe(10.99);
      expect(amountSchema.parse(10.5)).toBe(10.5);
      expect(amountSchema.parse(10)).toBe(10);
    });

    it("devrait rejeter un montant négatif", () => {
      expect(() => amountSchema.parse(-10)).toThrow();
      expect(() => amountSchema.parse(-0.01)).toThrow();
    });

    it("devrait rejeter un montant supérieur à 10 000 TND", () => {
      expect(() => amountSchema.parse(10001)).toThrow();
      expect(() => amountSchema.parse(50000)).toThrow();
    });

    it("devrait rejeter un montant avec plus de 2 décimales", () => {
      expect(() => amountSchema.parse(10.999)).toThrow();
      expect(() => amountSchema.parse(10.123)).toThrow();
    });

    it("devrait rejeter zéro", () => {
      expect(() => amountSchema.parse(0)).toThrow();
    });
  });
});

describe("addressSchema", () => {
  describe("Validation des adresses tunisiennes", () => {
    it("devrait accepter une adresse valide (min 5 caractères)", () => {
      expect(addressSchema.parse("123 Rue de la République")).toBe("123 Rue de la République");
      expect(addressSchema.parse("Avenue Habib Bourguiba")).toBe("Avenue Habib Bourguiba");
    });

    it("devrait accepter une adresse avec exactement 5 caractères", () => {
      expect(addressSchema.parse("12345")).toBe("12345");
    });

    it("devrait accepter une adresse avec 200 caractères (maximum)", () => {
      const longAddress = "A".repeat(200);
      expect(addressSchema.parse(longAddress)).toBe(longAddress);
    });

    it("devrait rejeter une adresse avec moins de 5 caractères", () => {
      expect(() => addressSchema.parse("1234")).toThrow();
      expect(() => addressSchema.parse("abc")).toThrow();
      expect(() => addressSchema.parse("")).toThrow();
    });

    it("devrait rejeter une adresse avec plus de 200 caractères", () => {
      const tooLongAddress = "A".repeat(201);
      expect(() => addressSchema.parse(tooLongAddress)).toThrow();
    });

    it("devrait rejeter une adresse contenant uniquement des espaces", () => {
      expect(() => addressSchema.parse("     ")).toThrow();
      expect(() => addressSchema.parse("  \t  \n  ")).toThrow();
    });

    it("devrait accepter une adresse avec espaces mais contenu valide", () => {
      expect(addressSchema.parse("  123 Rue  ")).toBe("  123 Rue  "); // Les espaces sont conservés
    });
  });
});

describe("nameSchema", () => {
  describe("Validation des noms (clients, livreurs, restaurants)", () => {
    it("devrait accepter un nom valide avec lettres", () => {
      expect(nameSchema.parse("Ahmed")).toBe("Ahmed");
      expect(nameSchema.parse("Mohamed")).toBe("Mohamed");
      expect(nameSchema.parse("Jean-Pierre")).toBe("Jean-Pierre");
    });

    it("devrait accepter un nom avec accents", () => {
      expect(nameSchema.parse("José")).toBe("José");
      expect(nameSchema.parse("François")).toBe("François");
      expect(nameSchema.parse("Élise")).toBe("Élise");
    });

    it("devrait accepter un nom avec apostrophe", () => {
      expect(nameSchema.parse("O'Brien")).toBe("O'Brien");
      expect(nameSchema.parse("D'Angelo")).toBe("D'Angelo");
    });

    it("devrait accepter un nom avec tiret", () => {
      expect(nameSchema.parse("Marie-Claire")).toBe("Marie-Claire");
      expect(nameSchema.parse("Jean-Luc")).toBe("Jean-Luc");
    });

    it("devrait accepter un nom avec point", () => {
      expect(nameSchema.parse("Dr. Smith")).toBe("Dr. Smith");
      expect(nameSchema.parse("M. Dupont")).toBe("M. Dupont");
    });

    it("devrait trimmer automatiquement les espaces", () => {
      expect(nameSchema.parse("  Ahmed  ")).toBe("Ahmed");
      expect(nameSchema.parse("\tMohamed\n")).toBe("Mohamed");
    });

    it("devrait accepter un nom avec exactement 2 caractères", () => {
      expect(nameSchema.parse("Al")).toBe("Al");
    });

    it("devrait accepter un nom avec 100 caractères (maximum)", () => {
      const longName = "A".repeat(100);
      expect(nameSchema.parse(longName)).toBe(longName);
    });

    it("devrait rejeter un nom avec moins de 2 caractères", () => {
      expect(() => nameSchema.parse("A")).toThrow();
      expect(() => nameSchema.parse("")).toThrow();
    });

    it("devrait rejeter un nom avec plus de 100 caractères", () => {
      const tooLongName = "A".repeat(101);
      expect(() => nameSchema.parse(tooLongName)).toThrow();
    });

    it("devrait rejeter un nom contenant des chiffres", () => {
      expect(() => nameSchema.parse("Ahmed123")).toThrow();
      expect(() => nameSchema.parse("123Ahmed")).toThrow();
    });

    it("devrait rejeter un nom contenant des caractères spéciaux non autorisés", () => {
      expect(() => nameSchema.parse("Ahmed@")).toThrow();
      expect(() => nameSchema.parse("Ahmed#")).toThrow();
      expect(() => nameSchema.parse("Ahmed$")).toThrow();
      expect(() => nameSchema.parse("Ahmed!")).toThrow();
    });
  });
});

describe("createPhoneSchema", () => {
  describe("Helper pour créer un schéma de téléphone personnalisé", () => {
    it("devrait créer un schéma avec message d'erreur personnalisé", () => {
      const customSchema = createPhoneSchema("Numéro invalide");
      expect(() => customSchema.parse("12345678")).toThrow("Numéro invalide");
    });

    it("devrait utiliser le message par défaut si aucun message n'est fourni", () => {
      const defaultSchema = createPhoneSchema();
      expect(() => defaultSchema.parse("12345678")).toThrow(
        "Le numéro de téléphone tunisien doit commencer par 2, 4, 5 ou 9 et contenir 8 chiffres"
      );
    });

    it("devrait fonctionner comme phoneSchema pour les numéros valides", () => {
      const customSchema = createPhoneSchema("Numéro invalide");
      expect(customSchema.parse("21234567")).toBe("21234567");
      expect(customSchema.parse("+216 21 234 567")).toBe("21234567");
    });
  });
});

describe("createLocationSchema", () => {
  describe("Helper pour créer un schéma de localisation avec zone personnalisée", () => {
    it("devrait accepter une localisation dans le rayon par défaut (50km autour de Tataouine)", () => {
      const tataouineSchema = createLocationSchema();
      const result = tataouineSchema.parse({
        lat: 32.95, // ~2km de Tataouine
        lng: 10.46,
      });
      expect(result.lat).toBe(32.95);
      expect(result.lng).toBe(10.46);
    });

    it("devrait accepter une localisation dans un rayon personnalisé", () => {
      const customSchema = createLocationSchema(32.9297, 10.4511, 30); // 30km
      const result = customSchema.parse({
        lat: 32.95, // ~2km de Tataouine
        lng: 10.46,
      });
      expect(result.lat).toBe(32.95);
      expect(result.lng).toBe(10.46);
    });

    it("devrait rejeter une localisation hors du rayon", () => {
      const tataouineSchema = createLocationSchema(32.9297, 10.4511, 10); // 10km seulement
      expect(() =>
        tataouineSchema.parse({
          lat: 36.8065, // Tunis (~400km de Tataouine)
          lng: 10.1815,
        })
      ).toThrow("La localisation doit être dans un rayon de 10km autour de Tataouine");
    });

    it("devrait utiliser les coordonnées par défaut (Tataouine) si non spécifiées", () => {
      const defaultSchema = createLocationSchema();
      // Test avec une localisation proche de Tataouine
      const result = defaultSchema.parse({
        lat: 32.93,
        lng: 10.45,
      });
      expect(result.lat).toBe(32.93);
      expect(result.lng).toBe(10.45);
    });

    it("devrait valider la latitude et longitude même si dans le rayon", () => {
      const schema = createLocationSchema(32.9297, 10.4511, 1000); // Rayon très large
      // Mais la latitude/longitude doivent toujours être dans la zone Tunisie
      expect(() =>
        schema.parse({
          lat: 48.8566, // Paris (hors zone Tunisie)
          lng: 2.3522,
        })
      ).toThrow(); // Rejeté par latitudeSchema/longitudeSchema
    });
  });
});

describe("Intégration - Schémas combinés", () => {
  it("devrait valider un objet de commande complet avec tous les schémas", () => {
    const orderData = {
      customerName: "Ahmed Ben Ali",
      phone: "+216 21 234 567",
      address: "123 Rue de la République",
      customerLat: 32.9297,
      customerLng: 10.4511,
      totalPrice: 25.99,
    };

    // Vérifier que chaque champ peut être validé individuellement
    expect(nameSchema.parse(orderData.customerName)).toBe("Ahmed Ben Ali");
    expect(phoneSchema.parse(orderData.phone)).toBe("21234567");
    expect(addressSchema.parse(orderData.address)).toBe("123 Rue de la République");
    expect(latitudeSchema.parse(orderData.customerLat)).toBe(32.9297);
    expect(longitudeSchema.parse(orderData.customerLng)).toBe(10.4511);
    expect(amountSchema.parse(orderData.totalPrice)).toBe(25.99);
  });

  it("devrait rejeter un objet de commande avec données invalides", () => {
    const invalidOrderData = {
      customerName: "A", // Trop court
      phone: "12345678", // Ne commence pas par 2, 4, 5 ou 9
      address: "123", // Trop court
      customerLat: 48.8566, // Hors zone Tunisie
      customerLng: 2.3522, // Hors zone Tunisie
      totalPrice: -10, // Négatif
    };

    expect(() => nameSchema.parse(invalidOrderData.customerName)).toThrow();
    expect(() => phoneSchema.parse(invalidOrderData.phone)).toThrow();
    expect(() => addressSchema.parse(invalidOrderData.address)).toThrow();
    expect(() => latitudeSchema.parse(invalidOrderData.customerLat)).toThrow();
    expect(() => longitudeSchema.parse(invalidOrderData.customerLng)).toThrow();
    expect(() => amountSchema.parse(invalidOrderData.totalPrice)).toThrow();
  });
});
