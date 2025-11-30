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

type Step = "cart" | "phone" | "verify" | "address";

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const { startOrder } = useOrder();
  const [step, setStep] = useState<Step>("cart");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';

  const handleNext = async () => {
    if (step === "cart") {
      setStep("phone");
    } else if (step === "phone") {
      if(phone.length < 8) {
        toast({ title: t('cart.error.phone'), variant: "destructive" });
        return;
      }
      if(name.length < 2) {
        toast({ title: t('cart.error.name'), variant: "destructive" });
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
      try {
        const orderItems = items.map(item => ({
          pizzaId: item.id.toString(),
          size: "medium" as const,
          quantity: item.quantity,
        }));
        
        const result = await createOrder({
          customerName: name,
          phone,
          address,
          addressDetails: "",
          items: orderItems,
        });
        
        clearCart();
        startOrder();
        setLocation("/success");
      } catch (error: any) {
        toast({ title: "Erreur", description: error.message || "Erreur création commande", variant: "destructive" });
      }
    }
  };

  const handleBack = () => {
      if (step === "phone") setStep("cart");
      if (step === "verify") setStep("phone");
      if (step === "address") setStep("verify");
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
          {step === "verify" && t('cart.step.3')}
          {step === "address" && t('cart.step.4')}
        </h1>
        <div className="text-sm font-medium text-muted-foreground">
            {step === "cart" && "1/4"}
            {step === "phone" && "2/4"}
            {step === "verify" && "3/4"}
            {step === "address" && "4/4"}
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
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
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

            {/* STEP 2: PHONE INPUT */}
            {step === "phone" && (
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
        
        </AnimatePresence>

        {/* Footer Actions */}
        <div className="bg-muted/30 p-6 border-t mt-auto">
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
        </div>
      </div>
    </div>
  );
}
