import { useState, useEffect } from "react";
import { useCart } from "@/lib/cart";
import { useOrder } from "@/lib/order-context";
import { createOrder, sendOtp, verifyOtp, getOrdersByPhone, customerLogin } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trash2, Plus, Minus, ArrowRight, MapPin, Phone, CheckCircle2, ChevronLeft, User, Store, AlertTriangle, Star, CreditCard, Banknote } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/lib/i18n";
import { getOnboarding } from "@/pages/onboarding";
import { isRestaurantOpen as checkNewOpeningHours, parseOpeningHoursSchedule, formatOpeningHours } from "@shared/openingHours";
import { getRestaurantCloseReason } from "@/lib/restaurant-status";
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

const DELIVERY_FEE = 2.00; // Prix de livraison fixe en TND

export default function CartPage() {
  // Feature flags pour les méthodes de paiement (synchronisés avec Profile.tsx)
  const stripeEnabled = true; // Paiement international (EUR/USD)
  const flouciEnabled = true; // Paiement local tunisien (TND)

  const { restaurants, removeItem, updateQuantity, total, clearCart, clearRestaurant } = useCart();
  const { startOrder, activeOrder, orderId } = useOrder();
  const onboarding = getOnboarding();
  const hasPhoneFromOnboarding = !!onboarding?.phone;
  const [step, setStep] = useState<Step>("cart");
  const [phone, setPhone] = useState(onboarding?.phone || "");
  const [name, setName] = useState(onboarding?.name || "");
  const [code, setCode] = useState("");
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
  useEffect(() => {
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
    
    if (addresses.length > 0) {
      setSavedAddresses(addresses);
      // ✅ MODIFIÉ : Sélectionner l'adresse la plus récente (première dans la liste) ou celle par défaut
      const defaultAddress = addresses.find(a => a.isDefault) || addresses[0];
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
        setAddress(defaultAddress.street);
        setAddressDetails(defaultAddress.details || "");
      }
    }
  }, [phone, onboarding, language]);

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

  // Total global (déjà calculé dans le contexte)
  const totalWithDelivery = total;
  
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
      
      // Authentification simple (MVP) - OTP désactivé par défaut
      // ONBOARDING DISABLED FOR MVP – ENABLE VIA ENABLE_ONBOARDING ENV FLAG
      try {
        // Essayer d'abord l'authentification simple
        const authResult = await customerLogin(name.trim(), phone);
        
        // Sauvegarder le token si nécessaire
        if (authResult.token) {
          localStorage.setItem('customerToken', authResult.token);
        }
        
        // Passer directement à l'adresse (pas d'étape verify)
        setStep("address");
      } catch (error: any) {
        // Si l'erreur indique que l'OTP est activé, essayer le flow OTP
        if (error.message?.includes('OTP authentication is enabled') || error.message?.includes('OTP désactivé')) {
          // Fallback vers OTP si activé
      try {
        await sendOtp(phone);
        setStep("verify");
          } catch (otpError) {
        toast({ 
          title: t('cart.error.order'), 
          description: t('cart.error.sendOtp') || "Impossible d'envoyer le code", 
          variant: "destructive" 
        });
          }
        } else {
          toast({ 
            title: t('cart.error.order'), 
            description: error.message || "Erreur lors de l'authentification", 
            variant: "destructive" 
          });
        }
      }
    } else if (step === "verify") {
      // Étape verify uniquement si OTP est activé
      try {
        await verifyOtp(phone, code);
        setStep("address");
      } catch (error) {
        toast({ title: t('cart.error.code'), variant: "destructive" });
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
      if (step === "verify") setStep("phone");
      if (step === "address") setStep(hasPhoneFromOnboarding ? "cart" : "verify");
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
    
    // Créer une commande par restaurant
    console.log(`[Cart] Création de ${restaurants.length} commande(s)...`);
    
    const orderPromises = restaurants.map(async (restaurantCart) => {
      const orderItems = restaurantCart.items.map(item => ({
        pizzaId: item.id.toString(),
        size: (item.size || "medium") as "small" | "medium" | "large",
        quantity: item.quantity,
      }));
      
      console.log(`[Cart] Commande pour ${restaurantCart.restaurantName || restaurantCart.restaurantId}:`, { 
        restaurantId: restaurantCart.restaurantId, 
        itemsCount: orderItems.length 
      });
      
      return createOrder({
        restaurantId: restaurantCart.restaurantId,
        customerName: name.trim(),
        phone: phone.trim(),
        address: finalAddress,
        addressDetails: finalAddressDetails,
        customerLat: onboarding?.lat, // Optionnel
        customerLng: onboarding?.lng, // Optionnel
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
        customerLat: onboarding?.lat,
        customerLng: onboarding?.lng,
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
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize Flouci payment');
      }
      
      const data = await response.json();
      
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
      toast({
        title: language === 'ar' 
          ? 'خطأ في الدفع' 
          : language === 'en' 
          ? 'Payment Error' 
          : 'Erreur de paiement',
        description: error.message || (language === 'ar' 
          ? 'فشل في تهيئة الدفع عبر Flouci' 
          : language === 'en' 
          ? 'Failed to initialize Flouci payment' 
          : 'Échec de l\'initialisation du paiement Flouci'),
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
          {!hasPhoneFromOnboarding && step === "verify" && t('cart.step.3')}
          {step === "address" && (hasPhoneFromOnboarding ? t('cart.step.3') : t('cart.step.4'))}
          {step === "summary" && (language === 'ar' ? "ملخص الطلب" : language === 'en' ? "Order Summary" : "Récapitulatif")}
        </h1>
        <div className="text-xs md:text-sm font-medium text-muted-foreground flex-shrink-0">
          {step === "cart" && (hasPhoneFromOnboarding ? "1/3" : "1/5")}
          {step === "phone" && (hasPhoneFromOnboarding ? "2/3" : "2/5")}
          {!hasPhoneFromOnboarding && step === "verify" && "3/5"}
          {step === "address" && (hasPhoneFromOnboarding ? "2/3" : "4/5")}
          {step === "summary" && (hasPhoneFromOnboarding ? "3/3" : "5/5")}
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
                                <span className="font-medium">{restaurantCart.deliveryFee.toFixed(2)} {t('common.currency')}</span>
                              </div>
                              <div className="flex justify-between font-bold pt-2 border-t">
                                <span>{t('cart.restaurantTotal')}</span>
                                <span className="text-orange-500">{(restaurantCart.subtotal + restaurantCart.deliveryFee).toFixed(2)} {t('common.currency')}</span>
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

            {/* STEP 3: VERIFY CODE */}
            {step === "verify" && (
                <motion.div
                    key="verify"
                    initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                    className="p-4 md:p-6 lg:p-10 flex flex-col items-center justify-center text-center h-full min-h-[300px] overflow-y-auto flex-1"
                >
                     <div className="bg-primary/10 p-3 md:p-4 rounded-full mb-4 md:mb-6 text-primary">
                        <CheckCircle2 className="h-6 w-6 md:h-8 md:w-8" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold mb-2">{t('cart.verify.title')}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6 px-4">{t('cart.verify.desc')} +216 {phone}. (Code: 1234)</p>
                    
                    <Input 
                        type="text" 
                        placeholder="XXXX" 
                        className="text-xl md:text-2xl tracking-[0.8em] md:tracking-[1em] text-center font-mono w-32 md:w-40 uppercase"
                        value={code}
                        maxLength={4}
                        onChange={(e) => setCode(e.target.value)}
                        autoFocus
                    />
                    
                    <button className="mt-4 md:mt-6 text-xs md:text-sm text-primary hover:underline">
                        {t('cart.resend')}
                    </button>
                </motion.div>
            )}

            {/* STEP 4: ADDRESS */}
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
                            <Label className="text-sm md:text-base">
                              {savedAddresses.length > 0 
                                ? (language === 'ar' ? "أو إدخال عنوان جديد" : language === 'en' ? "Or enter a new address" : "Ou saisir une nouvelle adresse")
                                : t('cart.address.street')
                              }
                            </Label>
                            <Input 
                                placeholder={t('cart.address.street.ph')}
                                value={address}
                                onChange={(e) => handleAddressInputChange(e.target.value)}
                                autoFocus={savedAddresses.length === 0}
                                className="text-sm md:text-base"
                            />
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
                                <span className="text-muted-foreground">{t('cart.deliveryFee')}</span>
                                <span className="font-medium">{restaurantCart.deliveryFee.toFixed(2)} {t('common.currency')}</span>
                              </div>
                              <div className="flex justify-between items-center font-bold pt-1 border-t">
                                <span className="text-sm">{t('cart.restaurantTotal')}</span>
                                <span className="text-orange-500">{(restaurantCart.subtotal + restaurantCart.deliveryFee).toFixed(2)} {t('common.currency')}</span>
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
                    </div>

                    {/* Total global */}
                    <div className="border-t pt-3 md:pt-4 space-y-2">
                        <div className="flex justify-between items-center text-base md:text-lg font-bold">
                            <span>
                                {language === 'ar' ? "المجموع الكلي" : language === 'en' ? "Total" : "Total"}
                            </span>
                            <span className="text-primary">{totalWithDelivery.toFixed(2)} {t('common.currency')}</span>
                        </div>
                        {restaurants.length > 1 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {t('cart.multiRestaurant.totalNote')}
                          </p>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-base md:text-lg font-semibold">
                                {language === 'ar' ? "المجموع الكلي" : language === 'en' ? "Total" : "Total"}
                            </span>
                            <span className="text-xl md:text-2xl font-bold text-primary">{totalWithDelivery.toFixed(2)} {t('common.currency')}</span>
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
                            <span className="text-xl md:text-2xl font-bold font-serif">{total.toFixed(2)} TND</span>
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
                            <span className="text-xl md:text-2xl font-bold font-serif">{totalWithDelivery.toFixed(2)} {t('common.currency')}</span>
                        </div>
                        <div className="flex flex-col gap-2 md:gap-3">
                            <Button 
                                variant="outline"
                                className="w-full h-11 md:h-12 text-sm md:text-base rounded-xl" 
                                onClick={handleBack}
                            >
                                {language === 'ar' ? "تعديل" : language === 'en' ? "Modify" : "Modifier"}
                            </Button>
                            <Button 
                                className="w-full h-11 md:h-12 text-sm md:text-base rounded-xl shadow-lg shadow-primary/20" 
                                onClick={handleConfirmOrder}
                                disabled={checkingActiveOrder || isProcessingPayment}
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
