import { useState } from "react";
import { useCart } from "@/lib/cart";
import { useOrder } from "@/lib/order-context";
import { createOrder, sendOtp, verifyOtp } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Minus, ArrowRight, MapPin, Phone, CheckCircle2, ChevronLeft, User, Store } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/lib/i18n";
import { getOnboarding } from "@/pages/onboarding";

type Step = "cart" | "phone" | "verify" | "address" | "summary";

const DELIVERY_FEE = 2.00; // Prix de livraison fixe en TND

export default function CartPage() {
  const { restaurants, removeItem, updateQuantity, total, clearCart, clearRestaurant } = useCart();
  const { startOrder } = useOrder();
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
      try {
        await sendOtp(phone);
        setStep("verify");
      } catch (error) {
        toast({ title: "Erreur", description: "Impossible d'envoyer le code", variant: "destructive" });
      }
    } else if (step === "verify") {
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

  const handleConfirmOrder = async () => {
    // Validation des champs requis
    if (!name || name.trim().length < 2) {
      toast({ title: "Erreur", description: "Le nom doit contenir au moins 2 caractères", variant: "destructive" });
      return;
    }
    
    if (!phone || phone.trim().length < 8) {
      toast({ title: "Erreur", description: "Le téléphone doit contenir au moins 8 caractères", variant: "destructive" });
      return;
    }
    
    if (!address || address.trim().length < 5) {
      toast({ title: "Erreur", description: "L'adresse doit contenir au moins 5 caractères", variant: "destructive" });
      return;
    }
    
    if (restaurants.length === 0) {
      toast({ title: "Erreur", description: "Le panier est vide", variant: "destructive" });
      return;
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
        address: address.trim(),
        addressDetails: onboarding?.addressDetails || "",
        customerLat: onboarding?.lat, // Optionnel
        customerLng: onboarding?.lng, // Optionnel
        items: orderItems,
      });
    });
    
    try {
      const results = await Promise.all(orderPromises);
      console.log(`[Cart] ${results.length} commande(s) créée(s) avec succès:`, results);
      
      clearCart();
      startOrder();
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
                    
                    <div className="space-y-3 md:space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm md:text-base">{t('cart.address.street')}</Label>
                            <Input 
                                placeholder={t('cart.address.street.ph')}
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                autoFocus
                                className="text-sm md:text-base"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm md:text-base">{t('cart.address.details')}</Label>
                            <Input 
                                placeholder={t('cart.address.details.ph')} 
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
                        </div>
                    </div>

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
                            >
                                {language === 'ar' ? "تأكيد الطلب" : language === 'en' ? "Confirm Order" : "Confirmer la commande"}
                                <ArrowRight className={`w-4 h-4 md:w-5 md:h-5 ${isRtl ? 'mr-2 rotate-180' : 'ml-2'}`} />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
