import { useState } from "react";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Minus, ArrowRight, MapPin, Phone, CheckCircle2, ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type Step = "cart" | "phone" | "verify" | "address";

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const [step, setStep] = useState<Step>("cart");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleNext = () => {
    if (step === "cart") setStep("phone");
    else if (step === "phone") {
        if(phone.length < 8) {
            toast({ title: "Erreur", description: "Numéro invalide", variant: "destructive" });
            return;
        }
        setStep("verify");
    }
    else if (step === "verify") {
        if(code !== "1234") { // Mock validation
            toast({ title: "Erreur", description: "Code incorrect (utilisez 1234)", variant: "destructive" });
            return;
        }
        setStep("address");
    }
    else if (step === "address") {
        if(address.length < 5) {
             toast({ title: "Erreur", description: "Veuillez entrer une adresse valide", variant: "destructive" });
             return;
        }
        clearCart();
        setLocation("/success");
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
        <h2 className="text-2xl font-serif font-bold mb-2">Votre panier est vide</h2>
        <p className="text-muted-foreground mb-8 max-w-sm">
          On dirait que vous n'avez pas encore fait votre choix. Nos pizzas vous attendent !
        </p>
        <Button onClick={() => setLocation("/menu")} size="lg" className="rounded-full">
          Découvrir le Menu
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-8 px-2">
        {step !== "cart" && (
            <Button variant="ghost" size="icon" onClick={handleBack} className="-ml-2">
                <ChevronLeft className="h-5 w-5" />
            </Button>
        )}
        <h1 className="text-2xl font-serif font-bold flex-1 text-center md:text-left md:pl-4">
          {step === "cart" && "Mon Panier"}
          {step === "phone" && "Identification"}
          {step === "verify" && "Vérification"}
          {step === "address" && "Livraison"}
        </h1>
        <div className="text-sm font-medium text-muted-foreground">
            {step === "cart" && "1/4"}
            {step === "phone" && "2/4"}
            {step === "verify" && "3/4"}
            {step === "address" && "4/4"}
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden relative min-h-[400px]">
        <AnimatePresence mode="wait">
            
            {/* STEP 1: CART ITEMS */}
            {step === "cart" && (
                <motion.div 
                    key="cart"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
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
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-6 md:p-10 flex flex-col items-center justify-center text-center h-full min-h-[300px]"
                >
                    <div className="bg-primary/10 p-4 rounded-full mb-6 text-primary">
                        <Phone className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Quel est votre numéro ?</h3>
                    <p className="text-muted-foreground mb-6">Nous vous enverrons un code de validation.</p>
                    
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
                    </div>
                </motion.div>
            )}

            {/* STEP 3: VERIFY CODE */}
            {step === "verify" && (
                <motion.div
                    key="verify"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-6 md:p-10 flex flex-col items-center justify-center text-center h-full min-h-[300px]"
                >
                     <div className="bg-primary/10 p-4 rounded-full mb-6 text-primary">
                        <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Code de validation</h3>
                    <p className="text-muted-foreground mb-6">Envoyé au +216 {phone}. (Code: 1234)</p>
                    
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
                        Renvoyer le code
                    </button>
                </motion.div>
            )}

            {/* STEP 4: ADDRESS */}
            {step === "address" && (
                <motion.div
                    key="address"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-6 md:p-10 h-full"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-primary/10 p-3 rounded-full text-primary">
                            <MapPin className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Où livrer ?</h3>
                            <p className="text-sm text-muted-foreground">Livraison gratuite à Tataouine</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Quartier / Rue</Label>
                            <Input 
                                placeholder="Ex: Cité Mahrajene, Rue de la Paix..." 
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Indications supplémentaires (optionnel)</Label>
                            <Input placeholder="Ex: Maison porte bleue, près de la pharmacie..." />
                        </div>
                    </div>
                </motion.div>
            )}
        
        </AnimatePresence>

        {/* Footer Actions */}
        <div className="bg-muted/30 p-6 border-t mt-auto">
            <div className="flex justify-between items-center mb-4">
                <span className="text-muted-foreground">Total</span>
                <span className="text-2xl font-bold font-serif">{total.toFixed(2)} TND</span>
            </div>
            <Button 
                className="w-full h-12 text-lg rounded-xl shadow-lg shadow-primary/20" 
                onClick={handleNext}
            >
                {step === "address" ? "Confirmer la commande" : "Continuer"}
                <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
        </div>
      </div>
    </div>
  );
}
