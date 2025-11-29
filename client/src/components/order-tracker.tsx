import { useEffect, useState } from 'react';
import { Check, ChefHat, Flame, Package, Bike, MapPin } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type OrderStatus = 'received' | 'prep' | 'bake' | 'ready' | 'delivery' | 'delivered';

const steps: { id: OrderStatus; icon: any; labelKey: string }[] = [
  { id: 'received', icon: Check, labelKey: 'tracker.status.received' },
  { id: 'prep', icon: ChefHat, labelKey: 'tracker.status.prep' },
  { id: 'bake', icon: Flame, labelKey: 'tracker.status.bake' },
  { id: 'ready', icon: Package, labelKey: 'tracker.status.ready' },
  { id: 'delivery', icon: Bike, labelKey: 'tracker.status.delivery' },
  { id: 'delivered', icon: MapPin, labelKey: 'tracker.status.delivered' },
];

export function OrderTracker() {
  const { t, language } = useLanguage();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [eta, setEta] = useState(45);
  const isRtl = language === 'ar';

  useEffect(() => {
    // Simulate progress
    const intervals = [
      2000, // received -> prep
      5000, // prep -> bake
      8000, // bake -> ready
      5000, // ready -> delivery
      10000 // delivery -> delivered
    ];

    let step = 0;
    
    const advanceStep = () => {
      if (step < steps.length - 1) {
        step++;
        setCurrentStepIndex(step);
        
        // Update ETA based on step
        if (step === 1) setEta(40);
        if (step === 2) setEta(30);
        if (step === 3) setEta(15);
        if (step === 4) setEta(10);
        if (step === 5) setEta(0);

        if (step < intervals.length) {
          setTimeout(advanceStep, intervals[step]);
        }
      }
    };

    setTimeout(advanceStep, intervals[0]);

    return () => {};
  }, []);

  return (
    <div className="w-full max-w-md mx-auto bg-card border rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-serif font-bold text-lg">{t('tracker.title')}</h3>
        {eta > 0 && (
            <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full animate-pulse">
                {t('tracker.eta')} {eta} {t('tracker.min')}
            </span>
        )}
      </div>

      <div className="relative">
        {/* Progress Line Background */}
        <div className={`absolute top-6 left-4 right-4 h-1 bg-muted rounded-full ${isRtl ? 'flex-row-reverse' : ''}`} />
        
        {/* Active Progress Line */}
        <motion.div 
          className={`absolute top-6 h-1 bg-primary rounded-full z-0`}
          initial={{ width: '0%' }}
          animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.5 }}
          style={{ 
            left: isRtl ? 'auto' : '1rem', 
            right: isRtl ? '1rem' : 'auto',
            originX: isRtl ? 1 : 0
          }}
        />

        <div className="relative z-10 flex flex-col gap-6">
             {/* Using a vertical layout for better mobile readability, 
                 but keeping the visual progress bar concept for visual flair if wanted.
                 Actually, let's switch to a vertical timeline for better mobile UX as requested.
             */}
             
             {steps.map((step, index) => {
               const isActive = index === currentStepIndex;
               const isCompleted = index < currentStepIndex;
               const isPending = index > currentStepIndex;

               return (
                 <div key={step.id} className="flex items-center gap-4 relative">
                    {/* Vertical Line Segment */}
                    {index !== steps.length - 1 && (
                        <div className={`absolute top-10 bottom-[-24px] w-0.5 bg-muted ${isRtl ? 'right-5' : 'left-5'} -z-10`}>
                             <motion.div 
                                className="w-full bg-primary origin-top"
                                initial={{ height: '0%' }}
                                animate={{ height: isCompleted ? '100%' : '0%' }}
                                transition={{ duration: 0.5 }}
                             />
                        </div>
                    )}

                   <div 
                     className={cn(
                       "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10 bg-card",
                       isActive ? "border-primary text-primary scale-110 shadow-lg shadow-primary/20" :
                       isCompleted ? "border-primary bg-primary text-primary-foreground" :
                       "border-muted text-muted-foreground"
                     )}
                   >
                     <step.icon className="w-5 h-5" />
                   </div>
                   
                   <div className={`flex-1 ${isActive ? 'opacity-100' : isCompleted ? 'opacity-70' : 'opacity-40'}`}>
                     <h4 className={cn("font-bold text-sm", isActive && "text-primary text-base")}>
                        {t(step.labelKey)}
                     </h4>
                     {isActive && (
                        <p className="text-xs text-muted-foreground animate-in fade-in">
                            {index === 0 && "Nous avons bien reçu votre commande."}
                            {index === 1 && "Nos chefs préparent les ingrédients."}
                            {index === 2 && "Cuisson au feu de bois..."}
                            {index === 3 && "Vérification qualité effectuée."}
                            {index === 4 && "Le livreur est en route vers vous."}
                            {index === 5 && "Bon appétit !"}
                        </p>
                     )}
                   </div>
                 </div>
               );
             })}
        </div>
      </div>
    </div>
  );
}
