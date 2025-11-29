import { useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import confetti from "canvas-confetti";
import { useLanguage } from "@/lib/i18n";
import { OrderTracker } from "@/components/order-tracker";

export default function OrderSuccess() {
  const { t } = useLanguage();

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
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 animate-in zoom-in duration-500 pb-12">
      <div className="h-24 w-24 bg-green-500 rounded-full flex items-center justify-center text-white mb-8 shadow-xl shadow-green-500/30">
        <Check className="h-12 w-12" strokeWidth={3} />
      </div>
      
      <h1 className="text-4xl font-serif font-bold mb-4 text-foreground">{t('success.title')}</h1>
      <p className="text-lg text-muted-foreground max-w-md mb-8">
        {t('success.desc')} <br />
        {t('success.contact')}
      </p>

      {/* The Global Order Tracker is now visible on all pages, 
          but we can keep a larger inline version here or just rely on the global one.
          Let's keep the inline one here as a focus point, it uses the same context. */}
      <div className="w-full max-w-md mb-8">
        <OrderTracker />
      </div>

      <Link href="/">
        <Button size="lg" variant="outline" className="rounded-full px-8">
          {t('success.back')}
        </Button>
      </Link>
    </div>
  );
}
