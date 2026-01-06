import { useState, useEffect, useMemo, useRef } from "react";
import { useCart } from "@/lib/cart";
import { useOrder } from "@/lib/order-context";
import { createOrder, getOrdersByPhone, customerLogin } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trash2, Plus, Minus, ArrowRight, MapPin, Phone, CheckCircle2, ChevronLeft, User, Store, AlertTriangle, Star, CreditCard, Banknote, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/lib/i18n";
import { getOnboarding } from "@/pages/onboarding";
import { AddressPicker } from "@/components/address-picker";
import { toast as sonnerToast } from "sonner";
import { isRestaurantOpen as checkNewOpeningHours, parseOpeningHoursSchedule, formatOpeningHours } from "@shared/openingHours";
import { getRestaurantCloseReason } from "@/lib/restaurant-status";
import { calculateDistance, calculateDeliveryFee, formatDistance, formatDeliveryTime, MAX_DELIVERY_FEE, type Coordinates } from "@/lib/distance-utils";
import { useDynamicDeliveryFee } from "@/hooks/use-dynamic-delivery-fee";
import { geocodeAddressInTataouine } from "@/lib/geocoding-utils";
import { debounce } from "@/lib/debounce";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Step = "cart" | "phone" | "verify" | "address" | "summary";
type PaymentMethod = "cash" | "stripe" | "flouci";

type SavedAddress = {
  id: string;
  label: string; // "Domicile", "Travail", etc.
  street: string;
  details?: string;
  isDefault?: boolean;
};

import { MAX_DELIVERY_FEE } from '@/lib/distance-utils';

const DELIVERY_FEE_DEFAULT = MAX_DELIVERY_FEE; // Prix de livraison maximum par défaut en TND

export default function CartPage() {
  // Feature flags pour les méthodes de paiement (synchronisés avec Profile.tsx)
  // TEMPORAIREMENT DÉSACTIVÉ : Seul le paiement en espèces est disponible
  const stripeEnabled = false; // Paiement international (EUR/USD) - DÉSACTIVÉ
  const flouciEnabled = false; // Paiement local tunisien (TND) - DÉSACTIVÉ

  const { restaurants, removeItem, updateQuantity, total: cartTotal, clearCart, clearRestaurant } = useCart();
  const { startOrder, activeOrder, orderId } = useOrder();
  // ✅ FIX : Utiliser useMemo pour stabiliser onboarding et éviter les boucles infinies
  const onboarding = useMemo(() => getOnboarding(), []);
  const hasPhoneFromOnboarding = !!onboarding?.phone;
  
  // Hook pour calculer les frais de livraison dynamiques
  const { getDeliveryFee, getDistance, getDeliveryInfo, loading: loadingDeliveryFee, hasCustomerCoords } = useDynamicDeliveryFee();
  const [step, setStep] = useState<Step>("cart");
  const [phone, setPhone] = useState(onboarding?.phone || "");
  const [name, setName] = useState(onboarding?.name || "");
  const [address, setAddress] = useState(onboarding?.address || "");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [showActiveOrderDialog, setShowActiveOrderDialog] = useState(false);
  const [checkingActiveOrder, setCheckingActiveOrder] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState("");
  const [newAddressStreet, setNewAddressStreet] = useState("");
  const [newAddressDetails, setNewAddressDetails] = useState("");
  const [addressDetails, setAddressDetails] = useState(onboarding?.addressDetails || "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(
    onboarding?.lat && onboarding?.lng ? { lat: onboarding.lat, lng: onboarding.lng } : null
  );
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);

  // ✅ MODIFIÉ : Charger uniquement name et phone, nettoyer les anciennes clés
  useEffect(() => {
    // ✅ NETTOYAGE : Supprimer les anciennes clés d'adresse (migration)
    localStorage.removeItem('customerAddress');
    localStorage.removeItem('customerAddressDetails');
    
    // Charger les données client depuis localStorage
    const savedName = localStorage.getItem('customerName');
    const savedPhone = localStorage.getItem('customerPhone');
    
    // Pré-remplir seulement si les champs sont vides et qu'on a des données sauvegardées
    if (!name && savedName) {
      setName(savedName);
    }
    if (!phone && savedPhone) {
      setPhone(savedPhone);
    }
    
    if (savedName || savedPhone) {
      console.log('[Cart] ✅ Données client chargées depuis localStorage');
    }
  }, []); // Seulement au montage

  // ✅ MODIFIÉ : Charger les adresses sauvegardées + intégrer onboarding si première fois
  // ✅ FIX : Séparer en deux useEffect pour éviter les boucles infinies
  useEffect(() => {
    // Éviter les exécutions inutiles si les données ne sont pas prêtes
    if (!phone || phone.length < 8) {
      // Si pas de téléphone mais qu'on a des données d'onboarding, les intégrer
      if (onboarding?.phone && onboarding?.address) {
        const onboardingPhone = onboarding.phone;
        const saved = localStorage.getItem(`savedAddresses_${onboardingPhone}`);
        
        // Si aucune adresse sauvegardée, créer la première depuis onboarding
        if (!saved) {
          const firstAddress: SavedAddress = {
            id: generateAddressId(),
            label: language === 'ar' ? "المنزل" : language === 'en' ? "Home" : "Domicile",
            street: onboarding.address,
            details: onboarding.addressDetails || undefined,
            isDefault: true,
          };
          const addresses = [firstAddress];
          setSavedAddresses(addresses);
          localStorage.setItem(`savedAddresses_${onboardingPhone}`, JSON.stringify(addresses));
          setSelectedAddressId(firstAddress.id);
          setAddress(firstAddress.street);
          setAddressDetails(firstAddress.details || "");
          console.log('[Cart] ✅ Adresse onboarding intégrée dans savedAddresses');
          return;
        }
      }
      return;
    }
    
    const saved = localStorage.getItem(`savedAddresses_${phone}`);
    let addresses: SavedAddress[] = [];
    
    if (saved) {
      try {
        addresses = JSON.parse(saved) as SavedAddress[];
      } catch (e) {
        console.error("Erreur chargement adresses:", e);
      }
    }
    
    // ✅ NOUVEAU : Si pas d'adresses sauvegardées mais qu'on a onboarding, l'intégrer
    if (addresses.length === 0 && onboarding?.address && onboarding?.phone === phone) {
      const firstAddress: SavedAddress = {
        id: generateAddressId(),
        label: language === 'ar' ? "المنزل" : language === 'en' ? "Home" : "Domicile",
        street: onboarding.address,
        details: onboarding.addressDetails || undefined,
        isDefault: true,
      };
      addresses = [firstAddress];
      localStorage.setItem(`savedAddresses_${phone}`, JSON.stringify(addresses));
      console.log('[Cart] ✅ Adresse onboarding intégrée dans savedAddresses');
    }
    
    // ✅ FIX : Ne mettre à jour que si les adresses ont réellement changé
    if (addresses.length > 0) {
      const currentAddressesJson = JSON.stringify(savedAddresses.map(a => ({ id: a.id, label: a.label, street: a.street, details: a.details, isDefault: a.isDefault })));
      const newAddressesJson = JSON.stringify(addresses.map(a => ({ id: a.id, label: a.label, street: a.street, details: a.details, isDefault: a.isDefault })));
      
      if (currentAddressesJson !== newAddressesJson) {
        setSavedAddresses(addresses);
      }
    }
  }, [phone, onboarding?.phone, onboarding?.address, onboarding?.addressDetails, language]);

  // ✅ FIX : Séparer la sélection de l'adresse par défaut dans un useEffect distinct
  // ✅ FIX : Utiliser useRef pour éviter les boucles infinies
  const hasInitializedAddress = useRef(false);
  
  useEffect(() => {
    if (savedAddresses.length > 0) {
      const defaultAddress = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
      if (defaultAddress) {
        // ✅ FIX : Ne mettre à jour que si on n'a pas encore initialisé OU si l'adresse sélectionnée n'existe plus
        const selectedAddressExists = savedAddresses.some(a => a.id === selectedAddressId);
        
        if (!hasInitializedAddress.current || !selectedAddressExists || selectedAddressId !== defaultAddress.id) {
          // ✅ FIX : Vérifier que les valeurs ont vraiment changé avant de mettre à jour
          if (selectedAddressId !== defaultAddress.id) {
            setSelectedAddressId(defaultAddress.id);
          }
          if (address !== defaultAddress.street) {
            setAddress(defaultAddress.street);
          }
          if (addressDetails !== (defaultAddress.details || "")) {
            setAddressDetails(defaultAddress.details || "");
          }
          hasInitializedAddress.current = true;
        }
      }
    }
  }, [savedAddresses]); // ✅ FIX : Dépendre uniquement de savedAddresses

  // Vérifier si le client a une commande active
  useEffect(() => {
    const checkActiveOrders = async () => {
      if (!phone || phone.length < 8) {
        setHasActiveOrder(false);
        return;
      }
      
      setCheckingActiveOrder(true);
      try {
        const orders = await getOrdersByPhone(phone);
        // Vérifier s'il y a une commande non livrée
        const activeOrders = orders.filter(order => 
          order.status !== 'delivered' && order.status !== 'rejected'
        );
        
        setHasActiveOrder(activeOrders.length > 0);
      } catch (error) {
        console.error('[Cart] Erreur vérification commandes actives:', error);
        setHasActiveOrder(false);
      } finally {
        setCheckingActiveOrder(false);
      }
    };

    checkActiveOrders();
  }, [phone]);

  // Calculer le total avec les frais de livraison dynamiques
  const totalWithDelivery = useMemo(() => {
    let subtotal = 0;
    let deliveryFees = 0;
    
    restaurants.forEach((restaurant) => {
      subtotal += restaurant.subtotal;
      // Utiliser les frais dynamiques si disponibles, sinon les frais par défaut du panier
      const dynamicFee = getDeliveryFee(restaurant.restaurantId);
      deliveryFees += dynamicFee;
    });
    
    return subtotal + deliveryFees;
  }, [restaurants, getDeliveryFee]);
  
  // Calculer le nombre total d'items
  const totalItems = restaurants.reduce((sum, r) => sum + r.items.length, 0);

  const handleNext = async () => {
    if (step === "cart") {
      // Si l'utilisateur a déjà fait l'onboarding (téléphone vérifié),
      // on saute directement à l'étape adresse.
      if (hasPhoneFromOnboarding) {
        setStep("address");
      } else {
        setStep("phone");
      }
    } else if (step === "phone") {
      if(name.length < 2) {
        toast({ title: t('cart.error.name'), variant: "destructive" });
        return;
      }

      // Si le téléphone vient déjà de l'onboarding, on ne renvoie pas d'OTP ici
      // et on passe directement à l'adresse.
      if (hasPhoneFromOnboarding) {
        setStep("address");
        return;
      }

      if(phone.length < 8) {
        toast({ title: t('cart.error.phone'), variant: "destructive" });
        return;
      }
      
      // Authentification simple (MVP) - OTP supprimé pour les clients
      try {
        const authResult = await customerLogin(name.trim(), phone);
        
        // Sauvegarder le token si nécessaire
        if (authResult.token) {
          localStorage.setItem('customerToken', authResult.token);
        }
        
        // Sauvegarder aussi le téléphone pour l'historique des commandes
        localStorage.setItem('customerPhone', phone.trim());
        
        // Passer directement à l'adresse (pas d'étape verify)
        setStep("address");
      } catch (error: any) {
        toast({ 
          title: t('cart.error.order'), 
          description: error.message || "Erreur lors de l'authentification", 
          variant: "destructive" 
        });
      }
    } else if (step === "address") {
      if(address.length < 5) {
        toast({ title: t('cart.error.address'), variant: "destructive" });
        return;
      }
      // Passer à l'étape récapitulatif au lieu de créer directement la commande
      setStep("summary");
    }
  };

  const handleBack = () => {
      if (step === "phone") setStep("cart");
      if (step === "address") setStep(hasPhoneFromOnboarding ? "cart" : "phone");
      if (step === "summary") setStep("address");
  };

  // Fonction pour générer un ID unique
  const generateAddressId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback pour les navigateurs plus anciens
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // ✅ NOUVEAU : Fonction utilitaire pour sauvegarder intelligemment une adresse
  const saveAddressToHistory = (newStreet: string, newDetails: string, phone: string): SavedAddress[] => {
    const key = `savedAddresses_${phone}`;
    const saved = localStorage.getItem(key);
    let addresses: SavedAddress[] = saved ? JSON.parse(saved) : [];

    // 1. Normalisation pour comparer (éviter les doublons à cause d'une majuscule ou d'un espace)
    const normalizedNew = newStreet.trim().toLowerCase();
    
    // 2. Vérifier si elle existe déjà
    const existingIndex = addresses.findIndex(
      a => a.street.trim().toLowerCase() === normalizedNew
    );

    if (existingIndex > -1) {
      // Elle existe : On la met à jour et on la remonte en premier (isDefault)
      const existing = addresses[existingIndex];
      addresses.splice(existingIndex, 1); // On l'enlève de sa place actuelle
      
      const updatedAddress: SavedAddress = {
        ...existing,
        details: newDetails.trim() || existing.details, // On met à jour les détails si fournis
        isDefault: true,
      };
      
      addresses.unshift(updatedAddress); // Ajouter en haut
      console.log('[Cart] ✅ Adresse existante mise à jour et remontée en haut');
    } else {
      // Nouvelle adresse : On l'ajoute en haut
      const addressCount = addresses.length;
      const addressLabel = language === 'ar' 
        ? `عنوان ${addressCount + 1}`
        : language === 'en'
        ? `Address ${addressCount + 1}`
        : `Adresse ${addressCount + 1}`;
      
      const newAddress: SavedAddress = {
        id: generateAddressId(),
        label: addressLabel,
        street: newStreet.trim(),
        details: newDetails.trim() || undefined,
        isDefault: true,
      };
      
      addresses.unshift(newAddress); // Ajouter en haut
      console.log('[Cart] ✅ Nouvelle adresse ajoutée:', addressLabel);
    }

    // 3. Toutes les autres adresses perdent le statut "isDefault"
    addresses = addresses.map((a, i) => ({ 
      ...a, 
      isDefault: i === 0 // Seule la première est par défaut
    }));

    // 4. Limiter à 5 adresses max pour rester propre
    const limitedAddresses = addresses.slice(0, 5);
    
    // Sauvegarder dans localStorage
    localStorage.setItem(key, JSON.stringify(limitedAddresses));
    
    return limitedAddresses;
  };

  // Géocodage automatique de l'adresse saisie manuellement (avec debounce)
  const debouncedGeocode = useMemo(
    () =>
      debounce(async (addressText: string) => {
        if (!addressText || addressText.length < 5) {
          return;
        }

        setIsGeocodingAddress(true);
        try {
          console.log('[Cart] 🔍 Géocodage de l\'adresse:', addressText);
          const result = await geocodeAddressInTataouine(addressText);
          if (result) {
            console.log('[Cart] ✅ Adresse géocodée avec succès:');
            console.log('[Cart]    Nom complet:', result.displayName);
            console.log('[Cart]    Coordonnées:', result.lat, result.lng);
            console.log('[Cart]    Adresse:', result.address);
            
            setMapCoords({ lat: result.lat, lng: result.lng });
            // Mettre à jour l'onboarding avec les nouvelles coordonnées
            const currentOnboarding = getOnboarding();
            const updatedOnboarding = {
              ...(currentOnboarding || {}),
              address: addressText,
              lat: result.lat,
              lng: result.lng,
            };
            localStorage.setItem('tp_onboarding', JSON.stringify(updatedOnboarding));
            console.log('[Cart] ✅ Onboarding mis à jour avec les nouvelles coordonnées');
            
            // Forcer la mise à jour du hook de frais de livraison
            // En déclenchant un événement personnalisé
            window.dispatchEvent(new Event('onboarding-updated'));
          } else {
            console.warn('[Cart] ⚠️ Impossible de géocoder l\'adresse:', addressText);
            console.warn('[Cart]    Zone non livrable - L\'utilisateur sera informé');
            
            // Informer le client que la zone n'est pas livrable
            sonnerToast.error(
              language === 'ar' 
                ? "❌ هذه المنطقة غير قابلة للتوصيل حالياً"
                : language === 'en'
                ? "❌ This area is not yet deliverable"
                : "❌ Cette zone n'est pas encore livrable",
              {
                description: language === 'ar'
                  ? "💡 Utilisez 'Choisir sur la carte' pour sélectionner une adresse dans une zone livrable"
                  : language === 'en'
                  ? "💡 Use 'Choose on map' to select an address in a deliverable area"
                  : "💡 Utilisez 'Choisir sur la carte' pour sélectionner une adresse dans une zone livrable",
                duration: 6000,
              }
            );
          }
        } catch (error) {
          console.error('[Cart] ❌ Erreur lors du géocodage:', error);
        } finally {
          setIsGeocodingAddress(false);
        }
      }, 1500), // Attendre 1.5 secondes après la dernière frappe
    [onboarding]
  );

  // ✅ NOUVEAU : Handler pour gérer la saisie manuelle d'adresse
  const handleAddressInputChange = (value: string) => {
    setAddress(value);
    // Si l'utilisateur saisit manuellement, désélectionner l'adresse sauvegardée
    // pour préparer l'ajout d'une nouvelle adresse
    if (value.trim() && selectedAddressId) {
      const selectedAddr = savedAddresses.find(addr => addr.id === selectedAddressId);
      // Si l'adresse saisie est différente de celle sélectionnée, désélectionner
      if (selectedAddr && selectedAddr.street.trim().toLowerCase() !== value.trim().toLowerCase()) {
        setSelectedAddressId(null);
      }
    }
    
    // Déclencher le géocodage automatique
    if (value.trim().length >= 5) {
      debouncedGeocode(value.trim());
    }
  };

  const proceedWithOrderCreation = async () => {
    // Récupérer les détails de l'adresse sélectionnée si elle existe
    const selectedAddress = savedAddresses.find(addr => addr.id === selectedAddressId);
    const finalAddressDetails = selectedAddress?.details || addressDetails.trim() || onboarding?.addressDetails || "";
    const finalAddress = address.trim();
    
    // ✅ NOUVEAU : Sauvegarder intelligemment l'adresse dans l'historique
    if (finalAddress && finalAddress.length >= 5 && phone && phone.length >= 8) {
      const updatedAddresses = saveAddressToHistory(finalAddress, finalAddressDetails, phone);
      setSavedAddresses(updatedAddresses);
      
      // Mettre à jour la sélection avec la première adresse (la plus récente)
      if (updatedAddresses.length > 0) {
        setSelectedAddressId(updatedAddresses[0].id);
      }
    }
    
    // ✅ NOUVEAU : S'assurer que l'adresse est géocodée avant de créer la commande
    let finalLat: number | null = null;
    let finalLng: number | null = null;
    
    // Récupérer les coordonnées depuis onboarding (mises à jour par le géocodage)
    const currentOnboarding = getOnboarding();
    if (currentOnboarding?.lat && currentOnboarding?.lng) {
      finalLat = typeof currentOnboarding.lat === 'number' ? currentOnboarding.lat : parseFloat(String(currentOnboarding.lat));
      finalLng = typeof currentOnboarding.lng === 'number' ? currentOnboarding.lng : parseFloat(String(currentOnboarding.lng));
      console.log('[Cart] 📍 Coordonnées trouvées dans onboarding:', { lat: finalLat, lng: finalLng });
    } else if (mapCoords) {
      // Fallback: utiliser mapCoords si disponibles
      finalLat = mapCoords.lat;
      finalLng = mapCoords.lng;
      console.log('[Cart] 📍 Coordonnées trouvées dans mapCoords:', { lat: finalLat, lng: finalLng });
    } else if (finalAddress && finalAddress.length >= 3) {
      // Dernier recours: géocoder l'adresse maintenant si pas encore fait
      console.log('[Cart] 🔍 Géocodage de dernière minute pour:', finalAddress);
      console.log('[Cart]    Adresse complète à géocoder:', finalAddress);
      try {
        const geocodeResult = await geocodeAddressInTataouine(finalAddress);
        if (geocodeResult) {
          finalLat = geocodeResult.lat;
          finalLng = geocodeResult.lng;
          console.log('[Cart] ✅ Adresse géocodée au dernier moment:', { 
            lat: finalLat, 
            lng: finalLng,
            displayName: geocodeResult.displayName
          });
          
          // Mettre à jour onboarding pour les prochaines fois
          const updatedOnboarding = {
            ...(currentOnboarding || {}),
            address: finalAddress,
            lat: finalLat,
            lng: finalLng,
          };
          localStorage.setItem('tp_onboarding', JSON.stringify(updatedOnboarding));
          console.log('[Cart] ✅ Onboarding mis à jour avec coordonnées de dernière minute');
          
          // Forcer la mise à jour du hook de frais de livraison
          window.dispatchEvent(new Event('onboarding-updated'));
        } else {
          console.warn('[Cart] ⚠️ Impossible de géocoder l\'adresse:', finalAddress);
          console.warn('[Cart]    Zone non livrable - Commande bloquée');
          
          // Informer le client que la zone n'est pas livrable
          sonnerToast.error(
            language === 'ar'
              ? "❌ هذه المنطقة غير قابلة للتوصيل حالياً"
              : language === 'en'
              ? "❌ This area is not yet deliverable"
              : "❌ Cette zone n'est pas encore livrable",
            {
              description: language === 'ar'
                ? "💡 Utilisez 'Choisir sur la carte' pour sélectionner une adresse dans une zone livrable"
                : language === 'en'
                ? "💡 Use 'Choose on map' to select an address in a deliverable area"
                : "💡 Utilisez 'Choisir sur la carte' pour sélectionner une adresse dans une zone livrable",
              duration: 8000,
            }
          );
          
          // Retourner sans créer la commande
          return;
        }
      } catch (error) {
        console.error('[Cart] ❌ Erreur lors du géocodage de dernière minute:', error);
      }
    }
    
    if (!finalLat || !finalLng) {
      console.warn('[Cart] ⚠️ Pas de coordonnées GPS disponibles - Zone non livrable');
      
      // Empêcher la création de commande et informer le client
      sonnerToast.error(
        language === 'ar'
          ? "❌ هذه المنطقة غير قابلة للتوصيل حالياً"
          : language === 'en'
          ? "❌ This area is not yet deliverable"
          : "❌ Cette zone n'est pas encore livrable",
        {
          description: language === 'ar'
            ? "💡 Utilisez 'Choisir sur la carte' pour sélectionner une adresse dans une zone livrable"
            : language === 'en'
            ? "💡 Use 'Choose on map' to select an address in a deliverable area"
            : "💡 Utilisez 'Choisir sur la carte' pour sélectionner une adresse dans une zone livrable",
          duration: 8000,
        }
      );
      
      // Retourner sans créer la commande
      return;
    }
    
    // Créer une commande par restaurant
    console.log(`[Cart] Création de ${restaurants.length} commande(s)...`);
    console.log(`[Cart] 📍 Coordonnées client à envoyer:`, { lat: finalLat, lng: finalLng });
    
    const orderPromises = restaurants.map(async (restaurantCart) => {
      const orderItems = restaurantCart.items.map(item => ({
        pizzaId: item.id.toString(),
        size: (item.size || "medium") as "small" | "medium" | "large",
        quantity: item.quantity,
      }));
      
      console.log(`[Cart] Commande pour ${restaurantCart.restaurantName || restaurantCart.restaurantId}:`, { 
        restaurantId: restaurantCart.restaurantId, 
        itemsCount: orderItems.length,
        customerLat: finalLat,
        customerLng: finalLng,
      });
      
      return createOrder({
        restaurantId: restaurantCart.restaurantId,
        customerName: name.trim(),
        phone: phone.trim(),
        address: finalAddress,
        addressDetails: finalAddressDetails,
        customerLat: finalLat,
        customerLng: finalLng,
        items: orderItems,
      });
    });
    
    try {
      const results = await Promise.all(orderPromises);
      console.log(`[Cart] ${results.length} commande(s) créée(s) avec succès:`, results);
      
      // ✅ MODIFIÉ : Sauvegarder uniquement name et phone (pas d'adresse)
      if (name.trim() && phone.trim()) {
        localStorage.setItem('customerName', name.trim());
        localStorage.setItem('customerPhone', phone.trim());
        console.log('[Cart] ✅ Données client sauvegardées dans localStorage');
      }
      
      clearCart();
      // Réinitialiser les flags pour la nouvelle commande
      sessionStorage.removeItem('orderSearchShown');
      sessionStorage.removeItem('orderConfettiShown');
      // Stocker l'ID de la première commande créée pour le suivi
      if (results.length > 0 && results[0].orderId) {
        startOrder(results[0].orderId);
      } else {
        startOrder();
      }
      setShowActiveOrderDialog(false);
      console.log("[Cart] Navigation vers /success");
      setLocation("/success");
    } catch (error: any) {
      console.error("[Cart] Erreur lors de la création des commandes:", error);
      toast({ 
        title: t('cart.error.order'), 
        description: t('cart.error.orderDescription'),
        variant: "destructive" 
      });
    }
  };

  // Fonction pour sauvegarder une nouvelle adresse
  const handleSaveAddress = () => {
    if (!newAddressStreet.trim() || newAddressStreet.trim().length < 5) {
      toast({ title: t('cart.error.address'), variant: "destructive" });
      return;
    }

    const newAddress: SavedAddress = {
      id: generateAddressId(),
      label: newAddressLabel.trim() || (language === 'ar' ? "آخر" : language === 'en' ? "Other" : "Autre"),
      street: newAddressStreet.trim(),
      details: newAddressDetails.trim() || undefined,
      isDefault: savedAddresses.length === 0, // Première adresse = par défaut
    };

    const updated = [...savedAddresses, newAddress];
    setSavedAddresses(updated);
    localStorage.setItem(`savedAddresses_${phone}`, JSON.stringify(updated));
    
    // Sélectionner la nouvelle adresse
    setSelectedAddressId(newAddress.id);
    setAddress(newAddress.street);
    
    // Réinitialiser le formulaire
    setNewAddressLabel("");
    setNewAddressStreet("");
    setNewAddressDetails("");
    setShowAddAddressForm(false);
    
    toast({ 
      title: language === 'ar' ? "تم حفظ العنوان" : language === 'en' ? "Address saved" : "Adresse sauvegardée", 
      description: language === 'ar' ? "سيكون هذا العنوان متاحًا لطلباتك القادمة" : language === 'en' ? "This address will be available for your next orders" : "Cette adresse sera disponible pour vos prochaines commandes" 
    });
  };

  // Fonction pour sélectionner une adresse existante
  const handleSelectAddress = (addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
    setAddress(addr.street);
    setAddressDetails(addr.details || "");
  };

  // Fonction pour définir une adresse par défaut
  const handleSetDefault = (id: string) => {
    const updated = savedAddresses.map(addr => ({
      ...addr,
      isDefault: addr.id === id,
    }));
    setSavedAddresses(updated);
    localStorage.setItem(`savedAddresses_${phone}`, JSON.stringify(updated));
    toast({ 
      title: language === 'ar' ? "تم تحديث العنوان الافتراضي" : language === 'en' ? "Default address updated" : "Adresse par défaut mise à jour" 
    });
  };

  // Fonction pour supprimer une adresse
  const handleDeleteAddress = (id: string) => {
    if (savedAddresses.length <= 1) {
      toast({ 
        title: language === 'ar' ? "خطأ" : language === 'en' ? "Error" : "Erreur", 
        description: language === 'ar' ? "يجب أن يكون لديك عنوان واحد على الأقل" : language === 'en' ? "You must have at least one address" : "Vous devez avoir au moins une adresse", 
        variant: "destructive" 
      });
      return;
    }
    const updated = savedAddresses.filter(addr => addr.id !== id);
    setSavedAddresses(updated);
    localStorage.setItem(`savedAddresses_${phone}`, JSON.stringify(updated));
    
    if (selectedAddressId === id) {
      const first = updated[0];
      setSelectedAddressId(first.id);
      setAddress(first.street);
    }
    
    toast({ 
      title: language === 'ar' ? "تم حذف العنوان" : language === 'en' ? "Address deleted" : "Adresse supprimée" 
    });
  };

  // Fonction pour vérifier si les restaurants du panier sont ouverts
  const checkRestaurantsOpenStatus = async (): Promise<{ allOpen: boolean; closedRestaurants: Array<{ id: string; name: string; nextOpenTime?: string | null }> }> => {
    const closedRestaurants: Array<{ id: string; name: string; nextOpenTime?: string | null }> = [];
    
    try {
      // Récupérer tous les restaurants depuis l'API pour avoir leurs horaires
      const response = await fetch("/api/restaurants");
      if (!response.ok) {
        console.error("[Cart] Erreur lors de la récupération des restaurants");
        // En cas d'erreur, on laisse passer (le serveur vérifiera aussi)
        return { allOpen: true, closedRestaurants: [] };
      }
      
      const allRestaurants = await response.json();
      const restaurantMap = new Map(allRestaurants.map((r: any) => [r.id, r]));
      
      // Vérifier chaque restaurant du panier
      for (const restaurantCart of restaurants) {
        const restaurant = restaurantMap.get(restaurantCart.restaurantId);
        if (!restaurant) continue;
        
        // Vérifier le toggle manuel d'abord
        if (restaurant.isOpen === false || restaurant.computedStatus?.isOpen === false) {
          closedRestaurants.push({
            id: restaurant.id,
            name: restaurant.name || restaurantCart.restaurantName || "Restaurant inconnu",
          });
          continue;
        }
        
        // Essayer le nouveau format JSON
        const schedule = parseOpeningHoursSchedule(restaurant.openingHours || null);
        if (schedule) {
          const status = checkNewOpeningHours(schedule);
          if (!status.isOpen) {
            closedRestaurants.push({
              id: restaurant.id,
              name: restaurant.name || restaurantCart.restaurantName || "Restaurant inconnu",
              nextOpenTime: status.nextOpenTime,
            });
          }
        } else {
          // Fallback : utiliser computedStatus si disponible
          if (restaurant.computedStatus && !restaurant.computedStatus.isOpen) {
            closedRestaurants.push({
              id: restaurant.id,
              name: restaurant.name || restaurantCart.restaurantName || "Restaurant inconnu",
            });
          }
        }
      }
      
      return {
        allOpen: closedRestaurants.length === 0,
        closedRestaurants,
      };
    } catch (error) {
      console.error("[Cart] Erreur lors de la vérification des horaires:", error);
      // En cas d'erreur, on laisse passer (le serveur vérifiera aussi)
      return { allOpen: true, closedRestaurants: [] };
    }
  };

  const handleConfirmOrder = async () => {
    // Validation des champs requis
    if (!name || name.trim().length < 2) {
      toast({ 
        title: t('cart.error.name'), 
        description: t('cart.error.nameMin') || "Le nom doit contenir au moins 2 caractères", 
        variant: "destructive" 
      });
      return;
    }
    
    if (!phone || phone.trim().length < 8) {
      toast({ 
        title: t('cart.error.phone'), 
        description: t('cart.error.phoneMin') || "Le téléphone doit contenir au moins 8 caractères", 
        variant: "destructive" 
      });
      return;
    }
    
    if (!address || address.trim().length < 5) {
      toast({ 
        title: t('cart.error.address'), 
        description: t('cart.error.addressMin') || "L'adresse doit contenir au moins 5 caractères", 
        variant: "destructive" 
      });
      return;
    }
    
    if (restaurants.length === 0) {
      toast({ 
        title: t('cart.error.order'), 
        description: t('cart.error.emptyCart') || "Le panier est vide", 
        variant: "destructive" 
      });
      return;
    }
    
    // ✅ NOUVELLE VÉRIFICATION : Vérifier si les restaurants sont ouverts
    const { allOpen, closedRestaurants } = await checkRestaurantsOpenStatus();
    if (!allOpen) {
      const closedNames = closedRestaurants.map(r => r.name).join(", ");
      
      // Récupérer les horaires formatés pour chaque restaurant fermé
      const response = await fetch("/api/restaurants");
      let formattedHours = '';
      if (response.ok) {
        const allRestaurants = await response.json();
        const restaurantMap = new Map(allRestaurants.map((r: any) => [r.id, r]));
        const hoursList: string[] = [];
        
        for (const closedRestaurant of closedRestaurants) {
          const restaurant = restaurantMap.get(closedRestaurant.id);
          if (restaurant) {
            const schedule = parseOpeningHoursSchedule(restaurant.openingHours || null);
            if (schedule) {
              const hours = formatOpeningHours(schedule, language);
              if (hours) {
                hoursList.push(`${closedRestaurant.name}: ${hours}`);
              }
            }
          }
        }
        
        if (hoursList.length > 0) {
          formattedHours = hoursList.join(' | ');
        }
      }
      
      const nextOpenMessages = closedRestaurants
        .filter(r => r.nextOpenTime)
        .map(r => {
          const opensAt = language === 'ar' ? 'يفتح في' : language === 'en' ? 'Opens at' : 'Ouvre à';
          return `${r.name} (${opensAt} ${r.nextOpenTime})`;
        })
        .join(", ");
      
      let message = '';
      if (language === 'ar') {
        message = nextOpenMessages 
          ? `عذراً، ${closedNames} ${closedRestaurants.length === 1 ? 'أغلق للتو' : 'أغلقوا للتو'} مطابخه. ${nextOpenMessages}`
          : formattedHours
            ? `عذراً، ${closedNames} ${closedRestaurants.length === 1 ? 'مغلق حالياً' : 'مغلقة حالياً'}. ${formattedHours}`
            : `عذراً، ${closedNames} ${closedRestaurants.length === 1 ? 'مغلق حالياً' : 'مغلقة حالياً'}. يرجى الطلب خلال ساعات العمل.`;
      } else if (language === 'en') {
        message = nextOpenMessages 
          ? `Sorry, ${closedNames} ${closedRestaurants.length === 1 ? 'just closed' : 'just closed'} their kitchens. ${nextOpenMessages}`
          : formattedHours
            ? `Sorry, ${closedNames} ${closedRestaurants.length === 1 ? 'is currently closed' : 'are currently closed'}. ${formattedHours}`
            : `Sorry, ${closedNames} ${closedRestaurants.length === 1 ? 'is currently closed' : 'are currently closed'}. Please order during opening hours.`;
      } else {
        message = nextOpenMessages 
          ? `Désolé, ${closedNames} ${closedRestaurants.length === 1 ? 'vient de fermer' : 'viennent de fermer'} ses cuisines. ${nextOpenMessages}`
          : formattedHours
            ? `Désolé, ${closedNames} ${closedRestaurants.length === 1 ? 'est actuellement fermé' : 'sont actuellement fermés'}. ${formattedHours}`
            : `Désolé, ${closedNames} ${closedRestaurants.length === 1 ? 'est actuellement fermé' : 'sont actuellement fermés'}. Merci de commander pendant les horaires d'ouverture.`;
      }
      
      toast({
        title: language === 'ar' 
          ? 'المطعم مغلق' 
          : language === 'en' 
          ? 'Restaurant Closed' 
          : 'Restaurant fermé',
        description: message,
        variant: "destructive",
      });
      return; // Bloquer le paiement
    }
    
    // Vérifier si le client a une commande active
    if (hasActiveOrder || (activeOrder && orderId)) {
      setShowActiveOrderDialog(true);
      return;
    }
    
    // Gérer selon la méthode de paiement sélectionnée
    if (paymentMethod === "flouci") {
      // Flouci : initialiser le paiement avant de créer la commande
      if (!flouciEnabled) {
        toast({
          title: language === 'ar' ? 'خطأ' : language === 'en' ? 'Error' : 'Erreur',
          description: language === 'ar' 
            ? 'طريقة الدفع Flouci غير متاحة حالياً' 
            : language === 'en' 
            ? 'Flouci payment method is not available' 
            : 'La méthode de paiement Flouci n\'est pas disponible',
          variant: 'destructive',
        });
        return;
      }
      await handleFlouciPayment();
      return;
    }
    
    if (paymentMethod === "stripe") {
      // Stripe : pour l'instant, créer la commande normalement
      // TODO: Implémenter le flux Stripe complet si nécessaire
      if (!stripeEnabled) {
        toast({
          title: language === 'ar' ? 'خطأ' : language === 'en' ? 'Error' : 'Erreur',
          description: language === 'ar' 
            ? 'طريقة الدفع Stripe غير متاحة حالياً' 
            : language === 'en' 
            ? 'Stripe payment method is not available' 
            : 'La méthode de paiement Stripe n\'est pas disponible',
          variant: 'destructive',
        });
        return;
      }
      // Pour l'instant, Stripe utilise le flux espèces (à améliorer plus tard)
      await proceedWithOrderCreation();
      return;
    }
    
    // Espèces à la livraison : créer la commande normalement
    await proceedWithOrderCreation();
  };

  // Fonction pour gérer le paiement Flouci
  const handleFlouciPayment = async () => {
    setIsProcessingPayment(true);
    
    try {
      // Construire les URLs de redirection
      const baseUrl = window.location.origin;
      const successLink = `${baseUrl}/success?payment=flouci&amount=${totalWithDelivery}`;
      const failLink = `${baseUrl}/cart?payment=failed`;
      
      // Générer un ID de suivi unique pour cette commande
      const trackingId = `order_${Date.now()}_${phone}`;
      
      // Stocker temporairement les données de commande dans sessionStorage
      // pour les créer après le paiement réussi
      // ⚠️ VALIDATION GPS DÉSACTIVÉE TEMPORAIREMENT
      // TODO: Réactiver la validation GPS côté client quand on réactive côté serveur
      const orderData = {
        restaurants: restaurants.map(r => ({
          restaurantId: r.restaurantId,
          restaurantName: r.restaurantName,
          items: r.items.map(item => ({
            pizzaId: item.id.toString(),
            size: item.size || "medium",
            quantity: item.quantity,
          })),
        })),
        customerName: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        addressDetails: addressDetails.trim() || "",
        customerLat: onboarding?.lat ?? null, // Optionnel
        customerLng: onboarding?.lng ?? null, // Optionnel
        total: totalWithDelivery,
      };
      sessionStorage.setItem('pendingFlouciOrder', JSON.stringify(orderData));
      
      console.log('[Cart] 💳 Initialisation paiement Flouci:', {
        amount: totalWithDelivery,
        successLink,
        failLink,
      });
      
      // Appeler l'API Flouci
      const response = await fetch('/api/payments/flouci/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: totalWithDelivery,
          success_link: successLink,
          fail_link: failLink,
          developer_tracking_id: trackingId,
        }),
      });
      
      const data = await response.json();
      
      // Vérifier si le paiement n'est pas disponible
      if (!response.ok || data.code === 'PAYMENT_NOT_AVAILABLE' || data.code === 'SERVICE_UNAVAILABLE') {
        const errorMessage = data.message || data.error || 
          (language === 'ar' 
            ? 'طريقة الدفع غير متاحة حالياً'
            : language === 'en' 
            ? 'Payment method is not available'
            : 'Le paiement par carte n\'est pas encore disponible');
        throw new Error(errorMessage);
      }
      
      if (!data.success || !data.link) {
        throw new Error('Invalid response from Flouci API');
      }
      
      console.log('[Cart] ✅ Paiement Flouci initialisé:', {
        payment_id: data.payment_id,
        link: data.link,
      });
      
      // Stocker le payment_id pour la vérification après retour
      sessionStorage.setItem('flouciPaymentId', data.payment_id);
      
      // Rediriger vers Flouci
      window.location.href = data.link;
      
    } catch (error: any) {
      console.error('[Cart] ❌ Erreur paiement Flouci:', error);
      
      // Message d'erreur personnalisé selon le type d'erreur
      const errorMessage = error.message || 
        (language === 'ar' 
          ? 'فشل في تهيئة الدفع عبر Flouci'
          : language === 'en' 
          ? 'Failed to initialize Flouci payment'
          : 'Échec de l\'initialisation du paiement Flouci');
      
      toast({
        title: language === 'ar' 
          ? 'طريقة الدفع غير متاحة' 
          : language === 'en' 
          ? 'Payment Not Available' 
          : 'Paiement non disponible',
        description: errorMessage,
        variant: 'destructive',
      });
      setIsProcessingPayment(false);
    }
  };

  if (restaurants.length === 0 && step === "cart") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="bg-primary/10 p-6 rounded-full mb-6">
          <div className="text-primary text-6xl">🛒</div>
        </div>
        <h2 className="text-2xl font-serif font-bold mb-2">{t('cart.empty')}</h2>
        <p className="text-muted-foreground mb-8 max-w-sm">
          {t('cart.empty.desc')}
        </p>
        <Button onClick={() => setLocation("/menu")} size="lg" className="rounded-full">
          {t('cart.discover')}
        </Button>
      </div>
    );
  }

  return (
    <>
    <div className="max-w-2xl mx-auto px-4 pb-20 md:pb-8">
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-4 md:mb-8 px-2">
        {step !== "cart" && (
            <Button variant="ghost" size="icon" onClick={handleBack} className={`${isRtl ? "-mr-2" : "-ml-2"} flex-shrink-0`}>
                <ChevronLeft className={`h-5 w-5 ${isRtl ? 'rotate-180' : ''}`} />
            </Button>
        )}
        <h1 className={`text-lg md:text-2xl font-serif font-bold flex-1 text-center md:text-left ${isRtl ? 'md:pr-4' : 'md:pl-4'}`}>
          {step === "cart" && t('cart.step.1')}
          {step === "phone" && t('cart.step.2')}
          {step === "address" && (hasPhoneFromOnboarding ? t('cart.step.3') : t('cart.step.3'))}
          {step === "summary" && (language === 'ar' ? "ملخص الطلب" : language === 'en' ? "Order Summary" : "Récapitulatif")}
        </h1>
        <div className="text-xs md:text-sm font-medium text-muted-foreground flex-shrink-0">
          {step === "cart" && (hasPhoneFromOnboarding ? "1/3" : "1/4")}
          {step === "phone" && (hasPhoneFromOnboarding ? "2/3" : "2/4")}
          {step === "address" && (hasPhoneFromOnboarding ? "2/3" : "3/4")}
          {step === "summary" && (hasPhoneFromOnboarding ? "3/3" : "4/4")}
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden relative min-h-[400px] flex flex-col">
        <AnimatePresence mode="wait">
            
            {/* STEP 1: CART ITEMS */}
            {step === "cart" && (
                <motion.div 
                    key="cart"
                    initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                    className="flex flex-col h-full"
                >
                    <div className="p-4 md:p-6 space-y-6 md:space-y-8 overflow-y-auto flex-1">
                        {restaurants.map((restaurantCart) => (
                          <div key={restaurantCart.restaurantId} className="space-y-4 pb-6 border-b last:border-0 last:pb-0">
                            {/* Header du restaurant */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Store className="w-5 h-5 text-orange-500" />
                                <div>
                                  <h3 className="font-bold text-base md:text-lg">{restaurantCart.restaurantName || t('cart.multiRestaurant.unknown')}</h3>
                                  <p className="text-xs text-gray-500">
                                    {restaurantCart.items.length} {restaurantCart.items.length === 1 ? t('cart.multiRestaurant.item') : t('cart.multiRestaurant.items')}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => clearRestaurant(restaurantCart.restaurantId)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            {/* Items du restaurant */}
                            <div className="space-y-3">
                              {restaurantCart.items.map((item) => (
                                <div key={`${item.id}-${item.size}`} className="flex gap-3 md:gap-4 animate-in slide-in-from-bottom-2">
                                  <div className="h-16 w-16 md:h-20 md:w-20 rounded-lg overflow-hidden shrink-0">
                                    {item.image && item.image.trim() !== "" ? (
                                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                        <span className="text-xl md:text-2xl">🍕</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 flex flex-col justify-between min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                      <div className="min-w-0">
                                        <h3 className="font-bold font-serif text-sm md:text-base truncate">{item.name}</h3>
                                        {item.size && (
                                          <p className="text-xs text-gray-500 mt-0.5">
                                            {t(`menu.size.${item.size}`)}
                                          </p>
                                        )}
                                      </div>
                                      <p className="font-medium text-primary text-sm md:text-base flex-shrink-0">{item.price.toFixed(2)} {t('common.currency')}</p>
                                    </div>
                                    <div className="flex items-center justify-between mt-2 gap-2">
                                      <div className="flex items-center gap-2 md:gap-3 bg-muted/50 rounded-full p-1">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6 md:h-7 md:w-7 rounded-full hover:bg-white shadow-sm"
                                          onClick={() => updateQuantity(restaurantCart.restaurantId, item.id, -1)}
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="text-xs md:text-sm font-medium w-4 text-center">{item.quantity}</span>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6 md:h-7 md:w-7 rounded-full hover:bg-white shadow-sm"
                                          onClick={() => updateQuantity(restaurantCart.restaurantId, item.id, 1)}
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-muted-foreground hover:text-destructive flex-shrink-0 h-8 w-8"
                                        onClick={() => removeItem(restaurantCart.restaurantId, `${item.id}-${item.size}`)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* Sous-total du restaurant */}
                            <div className="mt-4 pt-4 border-t space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">{t('cart.subtotal')}</span>
                                <span className="font-medium">{restaurantCart.subtotal.toFixed(2)} {t('common.currency')}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">{t('cart.deliveryFee')}</span>
                                <span className="font-medium">{restaurantCart.deliveryFee.toFixed(3)} {t('common.currency')}</span>
                              </div>
                              <div className="flex justify-between font-bold pt-2 border-t">
                                <span>{t('cart.restaurantTotal')}</span>
                                <span className="text-orange-500">{(restaurantCart.subtotal + restaurantCart.deliveryFee).toFixed(3)} {t('common.currency')}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* STEP 2: PHONE INPUT (seulement si pas d'onboarding) */}
            {!hasPhoneFromOnboarding && step === "phone" && (
                <motion.div
                    key="phone"
                    initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                    className="p-4 md:p-6 lg:p-10 flex flex-col items-center justify-center text-center h-full min-h-[300px] overflow-y-auto flex-1"
                >
                    <div className="bg-primary/10 p-3 md:p-4 rounded-full mb-4 md:mb-6 text-primary">
                        <Phone className="h-6 w-6 md:h-8 md:w-8" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold mb-2">{t('cart.phone.title')}</h3>
                    <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6 px-4">{t('cart.phone.desc')}</p>
                    
                    <div className="w-full max-w-xs space-y-3 md:space-y-4 px-4">
                        <div className="flex gap-2">
                            <div className="flex items-center justify-center bg-muted px-2 md:px-3 rounded-md border text-xs md:text-sm font-medium text-muted-foreground">
                                +216
                            </div>
                            <Input 
                                type="tel" 
                                placeholder="XX XXX XXX" 
                                className="text-base md:text-lg tracking-wider"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                autoFocus
                            />
                        </div>

                        <div className="relative">
                          <User className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 ${isRtl ? 'right-3' : 'left-3'}`} />
                          <Input 
                              placeholder={t('cart.name.placeholder')}
                              className={`text-sm md:text-base ${isRtl ? 'pr-9' : 'pl-9'}`}
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                          />
                        </div>
                    </div>
                </motion.div>
            )}

            {/* STEP 3: ADDRESS */}
            {step === "address" && (
                <motion.div
                    key="address"
                    initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                    className="p-4 md:p-6 lg:p-10 h-full overflow-y-auto flex-1"
                >
                    <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                        <div className="bg-primary/10 p-2 md:p-3 rounded-full text-primary">
                            <MapPin className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <div>
                            <h3 className="text-base md:text-lg font-bold">{t('cart.address.title')}</h3>
                            <p className="text-xs md:text-sm text-muted-foreground">{t('cart.address.subtitle')}</p>
                        </div>
                    </div>

                    {/* Adresses sauvegardées */}
                    {savedAddresses.length > 0 && (
                      <div className="space-y-3 mb-6">
                        <Label className="text-sm font-semibold">
                          {language === 'ar' ? "العناوين المحفوظة" : language === 'en' ? "Saved Addresses" : "Adresses sauvegardées"}
                        </Label>
                        <div className="space-y-2">
                          {savedAddresses.map((addr) => (
                            <div
                              key={addr.id}
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                selectedAddressId === addr.id
                                  ? 'border-primary bg-primary/5'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => handleSelectAddress(addr)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-sm">{addr.label}</span>
                                    {addr.isDefault && (
                                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                        {language === 'ar' ? "افتراضي" : language === 'en' ? "Default" : "Par défaut"}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-700">{addr.street}</p>
                                  {addr.details && (
                                    <p className="text-xs text-gray-500 mt-1">{addr.details}</p>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  {!addr.isDefault && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetDefault(addr.id);
                                      }}
                                      title={language === 'ar' ? "تعيين كافتراضي" : language === 'en' ? "Set as default" : "Définir par défaut"}
                                    >
                                      <Star className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {savedAddresses.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-red-500 hover:text-red-700"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteAddress(addr.id);
                                      }}
                                      title={language === 'ar' ? "حذف" : language === 'en' ? "Delete" : "Supprimer"}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Formulaire pour ajouter une nouvelle adresse */}
                    {showAddAddressForm ? (
                      <div className="space-y-3 mb-6 p-4 bg-muted/50 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm font-semibold">
                            {language === 'ar' ? "إضافة عنوان جديد" : language === 'en' ? "Add New Address" : "Ajouter une nouvelle adresse"}
                          </Label>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              setShowAddAddressForm(false);
                              setNewAddressLabel("");
                              setNewAddressStreet("");
                              setNewAddressDetails("");
                            }}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Input
                            placeholder={language === 'ar' ? "الاسم (مثل: منزل، عمل)" : language === 'en' ? "Label (e.g., Home, Work)" : "Nom (ex: Domicile, Travail)"}
                            value={newAddressLabel}
                            onChange={(e) => setNewAddressLabel(e.target.value)}
                            className="text-sm"
                          />
                          <Input
                            placeholder={t('cart.address.street.ph')}
                            value={newAddressStreet}
                            onChange={(e) => setNewAddressStreet(e.target.value)}
                            className="text-sm"
                          />
                          <Input
                            placeholder={t('cart.address.details.ph')}
                            value={newAddressDetails}
                            onChange={(e) => setNewAddressDetails(e.target.value)}
                            className="text-sm"
                          />
                          <Button
                            onClick={handleSaveAddress}
                            className="w-full"
                            size="sm"
                          >
                            {language === 'ar' ? "حفظ العنوان" : language === 'en' ? "Save Address" : "Enregistrer l'adresse"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setShowAddAddressForm(true)}
                        className="w-full mb-6"
                      >
                        <Plus className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                        {language === 'ar' ? "إضافة عنوان آخر" : language === 'en' ? "Add Another Address" : "Ajouter une autre adresse ?"}
                      </Button>
                    )}

                    {/* Champ adresse principal */}
                    <div className="space-y-3 md:space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm md:text-base">
                                  {savedAddresses.length > 0 
                                    ? (language === 'ar' ? "أو إدخال عنوان جديد" : language === 'en' ? "Or enter a new address" : "Ou saisir une nouvelle adresse")
                                    : t('cart.address.street')
                                  }
                                </Label>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowAddressPicker(true)}
                                  className="text-xs"
                                >
                                  <MapPin className={`h-3 w-3 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                                  {language === 'ar' ? "اختر على الخريطة" : language === 'en' ? "Choose on map" : "Choisir sur la carte"}
                                </Button>
                            </div>
                            <div className="relative">
                                <Input 
                                    placeholder={t('cart.address.street.ph')}
                                    value={address}
                                    onChange={(e) => handleAddressInputChange(e.target.value)}
                                    autoFocus={savedAddresses.length === 0}
                                    className={isGeocodingAddress ? "pr-10" : ""}
                                />
                                {isGeocodingAddress && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm md:text-base">{t('cart.address.details')}</Label>
                            <Input 
                                placeholder={t('cart.address.details.ph')} 
                                value={addressDetails}
                                onChange={(e) => setAddressDetails(e.target.value)}
                                className="text-sm md:text-base"
                            />
                        </div>
                    </div>

                    {/* Modal AddressPicker */}
                    <AddressPicker
                        open={showAddressPicker}
                        onOpenChange={setShowAddressPicker}
                        initialCoords={mapCoords}
                        onAddressSelected={(selectedAddress) => {
                            // Mettre à jour l'adresse avec les données de la carte
                            setAddress(selectedAddress.fullAddress || selectedAddress.street);
                            setAddressDetails(
                                selectedAddress.street && selectedAddress.city
                                    ? `${selectedAddress.street}, ${selectedAddress.city}`
                                    : selectedAddress.fullAddress
                            );
                            // Sauvegarder les coordonnées
                            setMapCoords(selectedAddress.coords);
                            // Optionnellement, sauvegarder dans onboarding
                            if (onboarding) {
                                const updatedOnboarding = {
                                    ...onboarding,
                                    address: selectedAddress.fullAddress || selectedAddress.street,
                                    addressDetails: selectedAddress.street && selectedAddress.city
                                        ? `${selectedAddress.street}, ${selectedAddress.city}`
                                        : selectedAddress.fullAddress,
                                    lat: selectedAddress.coords.lat,
                                    lng: selectedAddress.coords.lng,
                                };
                                localStorage.setItem('tp_onboarding', JSON.stringify(updatedOnboarding));
                            }
                            sonnerToast.success(
                                language === 'ar'
                                    ? "تم تحديث العنوان من الخريطة"
                                    : language === 'en'
                                    ? "Address updated from map"
                                    : "Adresse mise à jour depuis la carte"
                            );
                        }}
                    />
                </motion.div>
            )}

            {/* STEP 5: SUMMARY / RÉCAPITULATIF */}
            {step === "summary" && (
                <motion.div
                    key="summary"
                    initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                    className="p-4 md:p-6 lg:p-10 h-full space-y-4 md:space-y-6 overflow-y-auto flex-1"
                >
                    <div className="text-center mb-4 md:mb-6">
                        <h3 className="text-lg md:text-xl font-bold mb-2">
                            {language === 'ar' ? "ملخص الطلب" : language === 'en' ? "Order Summary" : "Récapitulatif de commande"}
                        </h3>
                        <p className="text-xs md:text-sm text-muted-foreground">
                            {language === 'ar' ? "تحقق من معلوماتك قبل التأكيد" : language === 'en' ? "Review your information before confirming" : "Vérifiez vos informations avant de confirmer"}
                        </p>
                    </div>

                    {/* Informations client */}
                    <div className="bg-muted/50 rounded-xl p-3 md:p-4 space-y-2 md:space-y-3">
                        <h4 className="font-semibold text-xs md:text-sm text-muted-foreground uppercase">
                            {language === 'ar' ? "معلومات العميل" : language === 'en' ? "Customer Information" : "Informations client"}
                        </h4>
                        
                        {/* Avertissement si coordonnées GPS manquantes */}
                        {!hasCustomerCoords && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-xs md:text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                                            {language === 'ar'
                                                ? "⚠️ العنوان غير دقيق"
                                                : language === 'en'
                                                ? "⚠️ Address not precise"
                                                : "⚠️ Adresse non précise"}
                                        </p>
                                        <p className="text-xs text-red-700 dark:text-red-300">
                                            {language === 'ar'
                                                ? "❌ هذه المنطقة غير قابلة للتوصيل حالياً. Veuillez utiliser 'Choisir sur la carte' pour sélectionner une adresse dans une zone livrable."
                                                : language === 'en'
                                                ? "❌ This area is not yet deliverable. Please use 'Choose on map' to select an address in a deliverable area."
                                                : "❌ Cette zone n'est pas encore livrable. Veuillez utiliser 'Choisir sur la carte' pour sélectionner une adresse dans une zone livrable."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div className="space-y-2">
                            <div className="flex justify-between items-start gap-2">
                                <span className="text-xs md:text-sm text-muted-foreground flex-shrink-0">
                                    {language === 'ar' ? "الاسم" : language === 'en' ? "Name" : "Nom"}
                                </span>
                                <span className="font-medium text-xs md:text-sm text-right break-words">{name}</span>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                                <span className="text-xs md:text-sm text-muted-foreground flex-shrink-0">
                                    {language === 'ar' ? "الهاتف" : language === 'en' ? "Phone" : "Téléphone"}
                                </span>
                                <span className="font-medium text-xs md:text-sm">+216 {phone}</span>
                            </div>
                            <div className="flex justify-between items-start gap-2">
                                <span className="text-xs md:text-sm text-muted-foreground flex-shrink-0">
                                    {language === 'ar' ? "العنوان" : language === 'en' ? "Address" : "Adresse"}
                                </span>
                                <span className="font-medium text-xs md:text-sm text-right break-words max-w-[60%]">{address}</span>
                            </div>
                            {(addressDetails || (savedAddresses.find(addr => addr.id === selectedAddressId)?.details)) && (
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-xs md:text-sm text-muted-foreground flex-shrink-0">
                                    {language === 'ar' ? "تفاصيل" : language === 'en' ? "Details" : "Détails"}
                                </span>
                                <span className="font-medium text-xs md:text-sm text-right break-words max-w-[60%]">
                                  {addressDetails || savedAddresses.find(addr => addr.id === selectedAddressId)?.details}
                                </span>
                              </div>
                            )}
                        </div>
                    </div>

                    {/* Avertissement si plusieurs restaurants */}
                    {restaurants.length > 1 && (
                      <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-3 md:p-4 space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="text-orange-600 text-lg flex-shrink-0">⚠️</div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm md:text-base text-orange-900 mb-1">
                              {t('cart.multiRestaurant.warning', { count: restaurants.length })}
                            </h4>
                            <p className="text-xs md:text-sm text-orange-800">
                              {t('cart.multiRestaurant.warningDesc', { count: restaurants.length })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Détails de la commande par restaurant */}
                    <div className="bg-muted/50 rounded-xl p-3 md:p-4 space-y-4 md:space-y-6">
                        <h4 className="font-semibold text-xs md:text-sm text-muted-foreground uppercase">
                            {language === 'ar' ? "تفاصيل الطلب" : language === 'en' ? "Order Details" : "Détails de la commande"}
                        </h4>
                        {restaurants.map((restaurantCart) => (
                          <div key={restaurantCart.restaurantId} className="space-y-3 pb-4 border-b last:border-0 last:pb-0">
                            {/* Nom du restaurant */}
                            <div className="flex items-center gap-2 mb-2">
                              <Store className="w-4 h-4 text-orange-500" />
                              <h5 className="font-bold text-sm md:text-base">{restaurantCart.restaurantName || t('cart.multiRestaurant.unknown')}</h5>
                            </div>
                            
                            {/* Items du restaurant */}
                            <div className="space-y-2 md:space-y-3">
                              {restaurantCart.items.map((item) => (
                                <div key={`${item.id}-${item.size}`} className="flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm md:text-base truncate">{item.name}</p>
                                    <p className="text-xs md:text-sm text-muted-foreground">
                                      {t(`menu.size.${item.size}`)} × {item.quantity}
                                    </p>
                                  </div>
                                  <p className="font-semibold text-sm md:text-base flex-shrink-0">
                                    {(item.price * item.quantity).toFixed(2)} {t('common.currency')}
                                  </p>
                                </div>
                              ))}
                            </div>
                            
                            {/* Sous-total restaurant */}
                            <div className="pt-2 border-t space-y-1">
                              <div className="flex justify-between items-center text-xs md:text-sm">
                                <span className="text-muted-foreground">{t('cart.subtotal')}</span>
                                <span className="font-medium">{restaurantCart.subtotal.toFixed(2)} {t('common.currency')}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs md:text-sm">
                                <div className="flex flex-col">
                                  <span className="text-muted-foreground">{t('cart.deliveryFee')}</span>
                                  {(() => {
                                    const distance = getDistance(restaurantCart.restaurantId);
                                    const deliveryInfo = getDeliveryInfo(restaurantCart.restaurantId);
                                    if (distance !== undefined && hasCustomerCoords) {
                                      const estimatedTime = deliveryInfo ? Math.ceil(15 + (distance / 30) * 60) : undefined;
                                      return (
                                        <span className="text-[10px] text-muted-foreground mt-0.5">
                                          {formatDistance(distance)}
                                          {estimatedTime && ` • ${estimatedTime}-${estimatedTime + 5} min`}
                                        </span>
                                      );
                                    }
                                    if (!hasCustomerCoords) {
                                      return (
                                        <span className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
                                          {language === 'ar'
                                            ? "❌ Zone non livrable"
                                            : language === 'en'
                                            ? "❌ Area not deliverable"
                                            : "❌ Zone non livrable"}
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                                <span className="font-medium">
                                  {loadingDeliveryFee ? (
                                    <span className="text-muted-foreground">...</span>
                                  ) : (
                                    `${getDeliveryFee(restaurantCart.restaurantId).toFixed(3)} ${t('common.currency')}`
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between items-center font-bold pt-1 border-t">
                                <span className="text-sm">{t('cart.restaurantTotal')}</span>
                                <span className="text-orange-500">
                                  {loadingDeliveryFee ? (
                                    <span className="text-muted-foreground">...</span>
                                  ) : (
                                    `${(restaurantCart.subtotal + getDeliveryFee(restaurantCart.restaurantId)).toFixed(3)} ${t('common.currency')}`
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Sélecteur de méthode de paiement */}
                    <div className="bg-muted/50 rounded-xl p-3 md:p-4 space-y-3 md:space-y-4">
                        <h4 className="font-semibold text-xs md:text-sm text-muted-foreground uppercase">
                            {language === 'ar' ? "طريقة الدفع" : language === 'en' ? "Payment Method" : "Méthode de paiement"}
                        </h4>
                        <RadioGroup 
                            value={paymentMethod} 
                            onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                            className="space-y-3"
                        >
                            {/* Option 1: Espèces à la livraison */}
                            <div className="flex items-center space-x-3">
                                <RadioGroupItem value="cash" id="cash" className="mt-0.5" />
                                <Label 
                                    htmlFor="cash" 
                                    className="flex-1 cursor-pointer p-3 rounded-lg border-2 transition-all hover:bg-background"
                                    style={{
                                        borderColor: paymentMethod === "cash" ? "hsl(var(--primary))" : "hsl(var(--border))",
                                        backgroundColor: paymentMethod === "cash" ? "hsl(var(--primary) / 0.05)" : "transparent"
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Banknote className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-sm md:text-base">
                                                {language === 'ar' ? "نقداً عند التسليم" : language === 'en' ? "Cash on Delivery" : "Espèces à la livraison"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {language === 'ar' ? "ادفع عند استلام الطلب" : language === 'en' ? "Pay when you receive your order" : "Payez à la réception de votre commande"}
                                            </p>
                                        </div>
                                    </div>
                                </Label>
                            </div>

                            {/* Option 2: Carte bancaire internationale (Stripe) */}
                            {stripeEnabled && (
                                <div className="flex items-center space-x-3">
                                    <RadioGroupItem value="stripe" id="stripe" className="mt-0.5" />
                                    <Label 
                                        htmlFor="stripe" 
                                        className="flex-1 cursor-pointer p-3 rounded-lg border-2 transition-all hover:bg-background"
                                        style={{
                                            borderColor: paymentMethod === "stripe" ? "hsl(var(--primary))" : "hsl(var(--border))",
                                            backgroundColor: paymentMethod === "stripe" ? "hsl(var(--primary) / 0.05)" : "transparent"
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <CreditCard className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm md:text-base">
                                                    {language === 'ar' ? "بطاقة بنكية دولية" : language === 'en' ? "International Card" : "Carte bancaire internationale"}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {language === 'ar' ? "Visa, Mastercard, Amex" : language === 'en' ? "Visa, Mastercard, Amex" : "Visa, Mastercard, Amex"}
                                                </p>
                                            </div>
                                        </div>
                                    </Label>
                                </div>
                            )}

                            {/* Option 3: Flouci / Carte tunisienne */}
                            {flouciEnabled && (
                                <div className="flex items-center space-x-3">
                                    <RadioGroupItem value="flouci" id="flouci" className="mt-0.5" />
                                    <Label 
                                        htmlFor="flouci" 
                                        className="flex-1 cursor-pointer p-3 rounded-lg border-2 transition-all hover:bg-background"
                                        style={{
                                            borderColor: paymentMethod === "flouci" ? "hsl(var(--primary))" : "hsl(var(--border))",
                                            backgroundColor: paymentMethod === "flouci" ? "hsl(var(--primary) / 0.05)" : "transparent"
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <CreditCard className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm md:text-base">
                                                    {language === 'ar' ? "Flouci / بطاقة تونسية" : language === 'en' ? "Flouci / Tunisian Card" : "Flouci / Carte tunisienne"}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {language === 'ar' ? "بطاقات بنكية تونسية" : language === 'en' ? "Tunisian bank cards" : "Cartes bancaires tunisiennes"}
                                                </p>
                                            </div>
                                        </div>
                                    </Label>
                                </div>
                            )}
                        </RadioGroup>

                        {/* Message d'information : Paiement par carte temporairement indisponible */}
                        {(!stripeEnabled || !flouciEnabled) && (
                            <div className="mt-4 p-4 bg-muted/50 border border-muted-foreground/20 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <div className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="12" y1="16" x2="12" y2="12"></line>
                                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-foreground mb-1">
                                            {language === 'ar' 
                                                ? "معلومة مهمة" 
                                                : language === 'en' 
                                                ? "Important Information" 
                                                : "Information importante"}
                                        </p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {language === 'ar' 
                                                ? "الدفع بالبطاقة غير متاح حالياً. يرجى اختيار الدفع نقداً عند الاستلام." 
                                                : language === 'en' 
                                                ? "Card payment is currently unavailable. Please choose cash on delivery." 
                                                : "Le paiement par carte n'est pas disponible pour le moment. Veuillez choisir le paiement en espèces à la livraison."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Total global */}
                    <div className="border-t pt-3 md:pt-4 space-y-2">
                        {restaurants.length > 1 && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {t('cart.multiRestaurant.totalNote')}
                          </p>
                        )}
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-base md:text-lg font-semibold">
                                {language === 'ar' ? "المجموع الكلي" : language === 'en' ? "Total" : "Total"}
                            </span>
                            <span className="text-xl md:text-2xl font-bold text-primary">{totalWithDelivery.toFixed(3)} {t('common.currency')}</span>
                        </div>
                    </div>
                </motion.div>
            )}
        
        </AnimatePresence>

        {/* Footer Actions - Sticky/Fixed */}
        <div className="sticky md:sticky bottom-0 left-0 right-0 bg-muted/95 backdrop-blur-md border-t mt-auto z-20 shadow-lg">
            <div className="p-4 md:p-6">
                {step !== "summary" && (
                    <>
                        <div className="flex justify-between items-center mb-3 md:mb-4">
                            <span className="text-sm md:text-base text-muted-foreground">{t('cart.total')}</span>
                            <span className="text-xl md:text-2xl font-bold font-serif">{totalWithDelivery.toFixed(3)} {t('common.currency')}</span>
                        </div>
                        <Button 
                            className="w-full h-11 md:h-12 text-base md:text-lg rounded-xl shadow-lg shadow-primary/20" 
                            onClick={handleNext}
                        >
                            {step === "address" ? t('cart.confirm') : t('cart.continue')}
                            <ArrowRight className={`w-4 h-4 md:w-5 md:h-5 ${isRtl ? 'mr-2 rotate-180' : 'ml-2'}`} />
                        </Button>
                    </>
                )}
                {step === "summary" && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm md:text-base text-muted-foreground">{t('cart.total')}</span>
                            <span className="text-xl md:text-2xl font-bold font-serif">{totalWithDelivery.toFixed(3)} {t('common.currency')}</span>
                        </div>
                        <div className="flex flex-col gap-2 md:gap-3">
                            <Button 
                                variant="outline"
                                className="w-full h-11 md:h-12 text-sm md:text-base rounded-xl" 
                                onClick={handleBack}
                            >
                                {language === 'ar' ? "تعديل" : language === 'en' ? "Modify" : "Modifier"}
                            </Button>
                            {!hasCustomerCoords && (
                                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-3 mb-2">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-xs md:text-sm font-medium text-red-800 dark:text-red-200">
                                                {language === 'ar'
                                                    ? "❌ هذه المنطقة غير قابلة للتوصيل"
                                                    : language === 'en'
                                                    ? "❌ This area is not yet deliverable"
                                                    : "❌ Cette zone n'est pas encore livrable"}
                                            </p>
                                            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                                                {language === 'ar'
                                                    ? "Veuillez utiliser 'Choisir sur la carte' pour sélectionner une adresse dans une zone livrable."
                                                    : language === 'en'
                                                    ? "Please use 'Choose on map' to select an address in a deliverable area."
                                                    : "Veuillez utiliser 'Choisir sur la carte' pour sélectionner une adresse dans une zone livrable."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <Button 
                                className="w-full h-11 md:h-12 text-sm md:text-base rounded-xl shadow-lg shadow-primary/20" 
                                onClick={handleConfirmOrder}
                                disabled={checkingActiveOrder || isProcessingPayment || !hasCustomerCoords}
                            >
                                {checkingActiveOrder ? (
                                  language === 'ar' ? "جارٍ التحقق..." : language === 'en' ? "Checking..." : "Vérification..."
                                ) : isProcessingPayment ? (
                                  language === 'ar' ? "جارٍ التوجيه إلى Flouci..." : language === 'en' ? "Redirecting to Flouci..." : "Redirection vers Flouci..."
                                ) : (
                                  <>
                                    {language === 'ar' ? "تأكيد الطلب" : language === 'en' ? "Confirm Order" : "Confirmer la commande"}
                                    <ArrowRight className={`w-4 h-4 md:w-5 md:h-5 ${isRtl ? 'mr-2 rotate-180' : 'ml-2'}`} />
                                  </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Dialog de confirmation pour commande active */}
      <AlertDialog open={showActiveOrderDialog} onOpenChange={setShowActiveOrderDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              {t('cart.activeOrder.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('cart.activeOrder.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm font-semibold text-orange-900 mb-2">
                {t('cart.activeOrder.warning')}
              </p>
              <ul className="text-xs text-orange-800 space-y-1 list-disc list-inside">
                <li>{t('cart.activeOrder.consequence1')}</li>
                <li>{t('cart.activeOrder.consequence2')}</li>
                <li>{t('cart.activeOrder.consequence3')}</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('cart.activeOrder.question')}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={proceedWithOrderCreation} 
              className="bg-orange-500 hover:bg-orange-600"
            >
              {t('cart.activeOrder.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  );
}
