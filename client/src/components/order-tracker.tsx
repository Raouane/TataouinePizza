import { useEffect, useState } from 'react';
import { Check, Package, Bike, MapPin, Store } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useOrder } from '@/lib/order-context';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// MVP Workflow simplifié: received → accepted → ready → delivery → delivered
type OrderStatus = 'received' | 'accepted' | 'ready' | 'delivery' | 'delivered';

const steps: { id: OrderStatus; icon: any; labelKey: string }[] = [
  { id: 'received', icon: Check, labelKey: 'tracker.status.received' },
  { id: 'accepted', icon: Store, labelKey: 'tracker.status.accepted' },
  { id: 'ready', icon: Package, labelKey: 'tracker.status.ready' },
  { id: 'delivery', icon: Bike, labelKey: 'tracker.status.delivery' },
  { id: 'delivered', icon: MapPin, labelKey: 'tracker.status.delivered' },
];

export function OrderTracker() {
  const { t, language } = useLanguage();
  const { stepIndex, eta } = useOrder();
  const isRtl = language === 'ar';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-serif font-bold text-lg hidden md:block">{t('tracker.title')}</h3>
        {eta > 0 && (
            <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full animate-pulse ml-auto">
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
          animate={{ width: `${(stepIndex / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.5 }}
          style={{ 
            left: isRtl ? 'auto' : '1rem', 
            right: isRtl ? '1rem' : 'auto',
            originX: isRtl ? 1 : 0
          }}
        />

        <div className="relative z-10 flex flex-col gap-6">
             {steps.map((step, index) => {
               const isActive = index === stepIndex;
               const isCompleted = index < stepIndex;

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
                            {index === 1 && "Le restaurant a accepté votre commande."}
                            {index === 2 && "Votre commande est prête pour récupération."}
                            {index === 3 && "Le livreur est en route vers vous."}
                            {index === 4 && "Bon appétit !"}
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
