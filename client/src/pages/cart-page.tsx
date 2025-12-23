import { useState } from "react";
import { useCart } from "@/lib/cart";
import { useOrder } from "@/lib/order-context";
import { createOrder, sendOtp, verifyOtp } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Minus, ArrowRight, MapPin, Phone, CheckCircle2, ChevronLeft, User } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/lib/i18n";
import { getOnboarding } from "@/pages/onboarding";

type Step = "cart" | "phone" | "verify" | "address" | "summary";

const DELIVERY_FEE = 2.00; // Prix de livraison fixe en TND

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, clearCart, restaurantId } = useCart();
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

  // Total avec livraison
  const totalWithDelivery = total + DELIVERY_FEE;

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
    try {
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
      
      if (!restaurantId) {
        toast({ title: "Erreur", description: "Restaurant non sélectionné", variant: "destructive" });
        return;
      }
      
      if (items.length === 0) {
        toast({ title: "Erreur", description: "Le panier est vide", variant: "destructive" });
        return;
      }
      
      const orderItems = items.map(item => ({
        pizzaId: item.id.toString(),
        size: (item.size || "medium") as "small" | "medium" | "large",
        quantity: item.quantity,
      }));
      
      console.log("[Cart] Création de commande...", { restaurantId, customerName: name.trim(), phone: phone.trim(), itemsCount: orderItems.length });
      
      const result = await createOrder({
        restaurantId,
        customerName: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        addressDetails: "",
        customerLat: onboarding?.lat,
        customerLng: onboarding?.lng,
        items: orderItems,
      });
      
      console.log("[Cart] Commande créée avec succès:", result);
      
      clearCart();
      startOrder();
      console.log("[Cart] Navigation vers /success");
      setLocation("/success");
    } catch (error: any) {
      console.error("[Cart] Erreur lors de la création de commande:", error);
      toast({ title: "Erreur", description: error.message || "Erreur création commande", variant: "destructive" });
    }
  };

  if (items.length === 0 && step === "cart") {
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
    <div className="max-w-2xl mx-auto">
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-8 px-2">
        {step !== "cart" && (
            <Button variant="ghost" size="icon" onClick={handleBack} className={isRtl ? "-mr-2" : "-ml-2"}>
                <ChevronLeft className={`h-5 w-5 ${isRtl ? 'rotate-180' : ''}`} />
            </Button>
        )}
        <h1 className={`text-2xl font-serif font-bold flex-1 text-center md:text-left ${isRtl ? 'md:pr-4' : 'md:pl-4'}`}>
          {step === "cart" && t('cart.step.1')}
          {step === "phone" && t('cart.step.2')}
          {!hasPhoneFromOnboarding && step === "verify" && t('cart.step.3')}
          {step === "address" && (hasPhoneFromOnboarding ? t('cart.step.3') : t('cart.step.4'))}
          {step === "summary" && (language === 'ar' ? "ملخص الطلب" : language === 'en' ? "Order Summary" : "Récapitulatif")}
        </h1>
        <div className="text-sm font-medium text-muted-foreground">
          {step === "cart" && (hasPhoneFromOnboarding ? "1/3" : "1/5")}
          {step === "phone" && (hasPhoneFromOnboarding ? "2/3" : "2/5")}
          {!hasPhoneFromOnboarding && step === "verify" && "3/5"}
          {step === "address" && (hasPhoneFromOnboarding ? "2/3" : "4/5")}
          {step === "summary" && (hasPhoneFromOnboarding ? "3/3" : "5/5")}
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden relative min-h-[400px] mb-32">
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
                    <div className="p-6 space-y-6">
                        {items.map((item) => (
                        <div key={item.id} className="flex gap-4 animate-in slide-in-from-bottom-2">
                            <div className="h-20 w-20 rounded-lg overflow-hidden shrink-0">
                                {item.image && item.image.trim() !== "" ? (
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                        <span className="text-2xl">🍕</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold font-serif">{item.name}</h3>
                                    <p className="font-medium text-primary">{item.price.toFixed(2)} TND</p>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-3 bg-muted/50 rounded-full p-1">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 rounded-full hover:bg-white shadow-sm"
                                            onClick={() => updateQuantity(item.id, -1)}
                                        >
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 rounded-full hover:bg-white shadow-sm"
                                            onClick={() => updateQuantity(item.id, 1)}
                                        >
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-muted-foreground hover:text-destructive"
                                        onClick={() => removeItem(item.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
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
                    className="p-6 md:p-10 flex flex-col items-center justify-center text-center h-full min-h-[300px]"
                >
                    <div className="bg-primary/10 p-4 rounded-full mb-6 text-primary">
                        <Phone className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{t('cart.phone.title')}</h3>
                    <p className="text-muted-foreground mb-6">{t('cart.phone.desc')}</p>
                    
                    <div className="w-full max-w-xs space-y-4">
                        <div className="flex gap-2">
                            <div className="flex items-center justify-center bg-muted px-3 rounded-md border text-sm font-medium text-muted-foreground">
                                +216
                            </div>
                            <Input 
                                type="tel" 
                                placeholder="XX XXX XXX" 
                                className="text-lg tracking-wider"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                autoFocus
                            />
                        </div>

                        <div className="relative">
                          <User className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 ${isRtl ? 'right-3' : 'left-3'}`} />
                          <Input 
                              placeholder={t('cart.name.placeholder')}
                              className={isRtl ? 'pr-9' : 'pl-9'}
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
                    className="p-6 md:p-10 flex flex-col items-center justify-center text-center h-full min-h-[300px]"
                >
                     <div className="bg-primary/10 p-4 rounded-full mb-6 text-primary">
                        <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{t('cart.verify.title')}</h3>
                    <p className="text-muted-foreground mb-6">{t('cart.verify.desc')} +216 {phone}. (Code: 1234)</p>
                    
                    <Input 
                        type="text" 
                        placeholder="XXXX" 
                        className="text-2xl tracking-[1em] text-center font-mono w-40 uppercase"
                        value={code}
                        maxLength={4}
                        onChange={(e) => setCode(e.target.value)}
                        autoFocus
                    />
                    
                    <button className="mt-6 text-sm text-primary hover:underline">
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
                    className="p-6 md:p-10 h-full"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-primary/10 p-3 rounded-full text-primary">
                            <MapPin className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">{t('cart.address.title')}</h3>
                            <p className="text-sm text-muted-foreground">{t('cart.address.subtitle')}</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('cart.address.street')}</Label>
                            <Input 
                                placeholder={t('cart.address.street.ph')}
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('cart.address.details')}</Label>
                            <Input placeholder={t('cart.address.details.ph')} />
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
                    className="p-6 md:p-10 h-full space-y-6"
                >
                    <div className="text-center mb-6">
                        <h3 className="text-xl font-bold mb-2">
                            {language === 'ar' ? "ملخص الطلب" : language === 'en' ? "Order Summary" : "Récapitulatif de commande"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {language === 'ar' ? "تحقق من معلوماتك قبل التأكيد" : language === 'en' ? "Review your information before confirming" : "Vérifiez vos informations avant de confirmer"}
                        </p>
                    </div>

                    {/* Informations client */}
                    <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase">
                            {language === 'ar' ? "معلومات العميل" : language === 'en' ? "Customer Information" : "Informations client"}
                        </h4>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    {language === 'ar' ? "الاسم" : language === 'en' ? "Name" : "Nom"}
                                </span>
                                <span className="font-medium">{name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    {language === 'ar' ? "الهاتف" : language === 'en' ? "Phone" : "Téléphone"}
                                </span>
                                <span className="font-medium">+216 {phone}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    {language === 'ar' ? "العنوان" : language === 'en' ? "Address" : "Adresse"}
                                </span>
                                <span className="font-medium text-right max-w-[60%]">{address}</span>
                            </div>
                        </div>
                    </div>

                    {/* Détails de la commande */}
                    <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase">
                            {language === 'ar' ? "تفاصيل الطلب" : language === 'en' ? "Order Details" : "Détails de la commande"}
                        </h4>
                        <div className="space-y-3">
                            {items.map((item) => (
                                <div key={`${item.id}-${item.size}`} className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <p className="font-medium">{item.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {item.size} × {item.quantity}
                                        </p>
                                    </div>
                                    <p className="font-semibold">
                                        {(item.price * item.quantity).toFixed(2)} TND
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Total */}
                    <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">
                                {language === 'ar' ? "المجموع الفرعي" : language === 'en' ? "Subtotal" : "Sous-total"}
                            </span>
                            <span className="font-medium">{total.toFixed(2)} TND</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">
                                {language === 'ar' ? "رسوم التوصيل" : language === 'en' ? "Delivery fee" : "Frais de livraison"}
                            </span>
                            <span className="font-medium">{DELIVERY_FEE.toFixed(2)} TND</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-lg font-semibold">
                                {language === 'ar' ? "المجموع الكلي" : language === 'en' ? "Total" : "Total"}
                            </span>
                            <span className="text-2xl font-bold text-primary">{totalWithDelivery.toFixed(2)} TND</span>
                        </div>
                    </div>
                </motion.div>
            )}
        
        </AnimatePresence>

        {/* Footer Actions */}
        <div className="bg-muted/30 p-6 border-t mt-auto">
            {step !== "summary" && (
                <>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-muted-foreground">{t('cart.total')}</span>
                        <span className="text-2xl font-bold font-serif">{total.toFixed(2)} TND</span>
                    </div>
                    <Button 
                        className="w-full h-12 text-lg rounded-xl shadow-lg shadow-primary/20" 
                        onClick={handleNext}
                    >
                        {step === "address" ? t('cart.confirm') : t('cart.continue')}
                        <ArrowRight className={`w-5 h-5 ${isRtl ? 'mr-2 rotate-180' : 'ml-2'}`} />
                    </Button>
                </>
            )}
            {step === "summary" && (
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{t('cart.total')}</span>
                        <span className="text-2xl font-bold font-serif">{totalWithDelivery.toFixed(2)} TND</span>
                    </div>
                    <div className="flex gap-3">
                        <Button 
                            variant="outline"
                            className="flex-1 h-12 text-lg rounded-xl" 
                            onClick={handleBack}
                        >
                            {language === 'ar' ? "تعديل" : language === 'en' ? "Modify" : "Modifier"}
                        </Button>
                        <Button 
                            className="flex-1 h-12 text-lg rounded-xl shadow-lg shadow-primary/20" 
                            onClick={handleConfirmOrder}
                        >
                            {language === 'ar' ? "تأكيد الطلب" : language === 'en' ? "Confirm Order" : "Confirmer la commande"}
                            <ArrowRight className={`w-5 h-5 ${isRtl ? 'mr-2 rotate-180' : 'ml-2'}`} />
                        </Button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
