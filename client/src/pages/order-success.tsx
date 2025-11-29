import { useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import confetti from "canvas-confetti";

export default function OrderSuccess() {
  useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const random = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: random(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: random(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 animate-in zoom-in duration-500">
      <div className="h-24 w-24 bg-green-500 rounded-full flex items-center justify-center text-white mb-8 shadow-xl shadow-green-500/30">
        <Check className="h-12 w-12" strokeWidth={3} />
      </div>
      
      <h1 className="text-4xl font-serif font-bold mb-4 text-foreground">Commande Reçue !</h1>
      <p className="text-lg text-muted-foreground max-w-md mb-8">
        Merci ! Nos chefs préparent déjà votre pizza. <br />
        Un livreur vous contactera bientôt au numéro indiqué.
      </p>

      <div className="bg-card border p-6 rounded-2xl w-full max-w-sm mb-8 shadow-sm text-left">
        <div className="flex justify-between mb-2">
          <span className="text-muted-foreground">Temps estimé</span>
          <span className="font-bold">35-45 min</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Numéro de commande</span>
          <span className="font-mono font-bold">#TA-8823</span>
        </div>
      </div>

      <Link href="/">
        <Button size="lg" variant="outline" className="rounded-full px-8">
          Retour à l'accueil
        </Button>
      </Link>
    </div>
  );
}
